const knex = require('../db/knex'); // If these functions need direct DB access

// --- Definition for prepareItemData ---
function generateSlug(name) {
    if (!name || typeof name !== 'string') return `item-${Date.now()}`; // Handle undefined or non-string name
    return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
}

const prepareItemData = (payload, isUpdate = false, existingItem = null) => {
    const data = { ...payload };

    // Slug handling
    if (data.item_name) { // If item_name is being provided in the payload
        const newSlug = generateSlug(data.item_name);
        if (isUpdate && existingItem) {
            // If item_name is explicitly changed OR if slug is empty and item_name is present
            if (data.item_name !== existingItem.item_name || (data.item_name && !existingItem.slug)) {
                data.slug = newSlug;
            } else if (data.item_name === existingItem.item_name && data.slug === undefined) {
                // If name is the same and slug is not in payload, don't try to change slug
                delete data.slug;
            } else if (data.slug !== undefined && data.slug !== existingItem.slug && data.item_name === existingItem.item_name) {
                // If slug is explicitly provided and different, but name is same, allow it (user might be manually setting slug)
                // The DB will check for uniqueness.
            } else if (data.slug === undefined) { // Default: if name same, don't touch slug
                 delete data.slug;
            }
        } else if (!isUpdate) { // Creating a new item
            data.slug = newSlug;
        }
    } else if (isUpdate && data.slug === undefined && existingItem) {
        // If item_name is not in payload for update, and slug is not in payload, don't change existing slug
        delete data.slug;
    } else if (!isUpdate && !data.item_name && !data.slug) {
        data.slug = `item-${Date.now()}`; // Fallback for new item with no name/slug
    }


    // Remove id from the data to be set if it's an update, as id is for the WHERE clause
    if (isUpdate && data.id !== undefined) {
        delete data.id;
    }

    // Ensure numeric fields are numbers or null, not empty strings
    ['category_id', 'sub_category_id', 'brand_id', 'supplier_id', 'manufacturer_id', 'store_id', 'base_unit_id', 'tax_id', 'special_category_id', 'warranty_id'].forEach(field => {
        if (data[field] === '' || data[field] === undefined) {
            data[field] = null;
        } else if (data[field] !== null) {
            data[field] = parseInt(data[field], 10);
            if (isNaN(data[field])) data[field] = null; // If parsing fails, set to null
        }
    });

    ['cost_price', 'retail_price', 'wholesale_price'].forEach(field => {
        if (data[field] === '' || data[field] === undefined || data[field] === null) {
            data[field] = null; // Allow prices to be null
        } else {
            const numVal = parseFloat(data[field]);
            data[field] = isNaN(numVal) ? null : numVal;
        }
    });
    
    // Boolean fields
    ['is_taxable', 'is_active', 'enable_stock_management', 'is_serialized'].forEach(field => {
        if (data[field] !== undefined) {
            data[field] = Boolean(data[field]);
        }
    });


    // console.log('[prepareItemData] Prepared data:', JSON.stringify(data, null, 2));
    return data;
};

// --- Definition for processItemUnits ---
/**
 * Processes item unit configurations during item creation or update.
 * Deletes existing units and inserts new ones based on the provided config.
 * Ensures base unit logic is correctly applied.
 * @param {number} itemId - The ID of the item.
 * @param {Array} itemUnitsConfig - Array of unit configurations from req.body.
 * @param {object} trx - Knex transaction object.
 */
async function processItemUnits(itemId, itemUnitsConfig, trx) {
    console.log(`[ItemDataProcessors.js processItemUnits] Processing units for item ID: ${itemId}`);
    
    await trx('item_units').where({ item_id: itemId }).del();

    if (!itemUnitsConfig || itemUnitsConfig.length === 0) {
        console.log('[ItemDataProcessors.js processItemUnits] No item units to process after deletion.');
        // You might throw an error here if an item must always have units,
        // which should be caught by the controller.
        // For now, let's assume the controller validation handles "must have units".
        return;
    }

    let designatedBaseUnitConfig = itemUnitsConfig.find(u => u.is_base_unit === true || u.is_base_unit === 'true' || u.is_base_unit === 1);
    let designatedBaseUnitId;

    if (designatedBaseUnitConfig && designatedBaseUnitConfig.unit_id) {
        designatedBaseUnitId = parseInt(designatedBaseUnitConfig.unit_id, 10);
    } else if (itemUnitsConfig.length > 0 && itemUnitsConfig[0].unit_id) {
        designatedBaseUnitId = parseInt(itemUnitsConfig[0].unit_id, 10);
        console.warn(`[ItemDataProcessors.js processItemUnits] No explicit base unit set for item ID ${itemId}. Defaulting to first unit ID ${designatedBaseUnitId} as base.`);
        // Find the first unit in the original array and mark it as base for processing
        const firstUnitInPayload = itemUnitsConfig.find(u => parseInt(u.unit_id, 10) === designatedBaseUnitId);
        if (firstUnitInPayload) {
            // This ensures the map below correctly identifies it as base
            // This is a temporary modification to the in-memory object for processing
            firstUnitInPayload.is_base_unit = true; 
        }
    }

    if (isNaN(designatedBaseUnitId)) {
        console.error(`[ItemDataProcessors.js processItemUnits] Could not determine a valid base_unit_id from itemUnitsConfig for item ID: ${itemId}. Payload:`, JSON.stringify(itemUnitsConfig));
        throw new Error(`Could not determine a valid base unit ID from the provided unit configurations for item ID ${itemId}.`);
    }

    // Update the main item's base_unit_id
    await trx('items').where({ id: itemId }).update({ base_unit_id: designatedBaseUnitId });
    console.log(`[ItemDataProcessors.js processItemUnits] Set base_unit_id to ${designatedBaseUnitId} for item ID ${itemId}.`);

    const unitsToInsert = itemUnitsConfig.map(unitConfig => {
        const currentUnitId = parseInt(unitConfig.unit_id, 10);
        if (isNaN(currentUnitId)) {
            console.error(`[ItemDataProcessors.js processItemUnits] Invalid unit_id in unitConfig: ${unitConfig.unit_id} for item ${itemId}. Skipping this unit.`);
            return null;
        }

        // Re-evaluate isCurrentUnitBase based on the potentially modified unitConfig (if first unit was defaulted)
        // or the originally designatedBaseUnitId
        const isCurrentUnitBase = (currentUnitId === designatedBaseUnitId) || (unitConfig.is_base_unit === true || unitConfig.is_base_unit === 'true');
        let localConversionFactor; // Use a locally scoped variable

        if (isCurrentUnitBase) {
            localConversionFactor = 1.0;
            if (unitConfig.conversion_factor !== undefined && parseFloat(unitConfig.conversion_factor) !== 1.0) {
                console.warn(`[ItemDataProcessors.js processItemUnits] Conversion factor for base unit ID ${currentUnitId} (item ID ${itemId}) was ${unitConfig.conversion_factor}. Forcing to 1.0.`);
            }
        } else {
            localConversionFactor = parseFloat(unitConfig.conversion_factor);
            if (isNaN(localConversionFactor) || localConversionFactor <= 0) {
                console.error(`[ItemDataProcessors.js processItemUnits] Invalid or missing conversion_factor for non-base unit ID ${currentUnitId} (item ID ${itemId}): ${unitConfig.conversion_factor}.`);
                throw new Error(`Invalid or missing conversion_factor for non-base unit ID ${currentUnitId}. Must be a positive number.`);
            }
        }

        return {
            item_id: itemId,
            unit_id: currentUnitId,
            base_unit_id: designatedBaseUnitId,
            conversion_factor: localConversionFactor,
            is_base_unit: isCurrentUnitBase,
            is_purchase_unit: unitConfig.is_purchase_unit === true || unitConfig.is_purchase_unit === 'true',
            is_sales_unit: unitConfig.is_sales_unit === true || unitConfig.is_sales_unit === 'true',
        };
    }).filter(unit => unit !== null);

    if (unitsToInsert.length > 0) {
        // Ensure only one unit in unitsToInsert is marked as base_unit, prioritizing the designatedBaseUnitId
        let finalBaseUnitFound = false;
        unitsToInsert.forEach(unit => {
            if (unit.unit_id === designatedBaseUnitId) {
                unit.is_base_unit = true;
                unit.conversion_factor = 1.0; // Re-affirm
                finalBaseUnitFound = true;
            } else if (finalBaseUnitFound && unit.is_base_unit) {
                // If another unit was somehow still marked base, unmark it
                unit.is_base_unit = false;
            }
        });
         // If after all this, the designatedBaseUnitId wasn't in unitsToInsert (e.g. bad unit_id),
         // we have a problem, but the earlier designatedBaseUnitId check should catch it.

        console.log('[ItemDataProcessors.js processItemUnits] Inserting item units:', JSON.stringify(unitsToInsert, null, 2));
        await trx('item_units').insert(unitsToInsert);
        console.log(`[ItemDataProcessors.js processItemUnits] Successfully inserted/updated ${unitsToInsert.length} units for item ID: ${itemId}`);
    } else {
        console.log('[ItemDataProcessors.js processItemUnits] No valid units to insert after filtering.');
        // If no units are inserted, but we determined a designatedBaseUnitId,
        // this implies an issue. The controller should ensure at least one unit is always present.
        // Consider throwing an error if unitsToInsert is empty but itemUnitsConfig was not.
        if (itemUnitsConfig.length > 0) { // Original payload had units, but none were valid
             throw new Error(`No valid unit configurations could be processed for item ID ${itemId}. Please check unit IDs and conversion factors.`);
        }
    }
}

// --- Definition for processAttributesAndVariations ---
// IMPORTANT: You need to decide how to get the store_id for the initial stock entry.
// Option 1: Pass it as an argument: processAttributesAndVariations = async (trx, itemId, attributesConfig, variationsData, storeIdForStock)
// Option 2: Fetch it from the parent item if it's always set: const parentItem = await trx('items').where('id', itemId).first(); const storeIdForStock = parentItem.store_id;
// Option 3: Use a default store ID if the parent item's store_id is null.
// For this example, I'll assume you pass storeIdForStock as an argument. Modify as needed.

const processAttributesAndVariations = async (trx, itemId, attributesConfig, variationsDataFromFrontend, storeIdForStock) => {
    console.log(`[ItemDataProcessors.js processAttributesAndVariations] Received variationsDataFromFrontend for item ID ${itemId}:`, JSON.stringify(variationsDataFromFrontend, null, 2));
    console.log(`[ItemDataProcessors.js processAttributesAndVariations] Processing for item ID: ${itemId}`);

    // 1. Delete existing variations and their attribute links for this item.
    await trx('item_variation_attribute_values')
        .whereIn('item_variation_id', function() {
            this.select('id').from('item_variations').where('item_id', itemId);
        })
        .del();
    await trx('item_variations').where({ item_id: itemId }).del();

    if (!variationsDataFromFrontend || !Array.isArray(variationsDataFromFrontend) || variationsDataFromFrontend.length === 0) {
        console.log('[ItemDataProcessors.js processAttributesAndVariations] No variations data provided in payload. All existing variations (if any) have been deleted.');
        return;
    }

    // Optional: Check for duplicate SKUs within the current payload for this item
    const skusInPayload = variationsDataFromFrontend.map(v => v.sku).filter(s => s);
    const duplicateSkusInPayload = skusInPayload.filter((sku, index, self) => self.indexOf(sku) !== index);
    if (duplicateSkusInPayload.length > 0) {
        // This error will be caught by the controller and should result in a 400/500 response
        throw new Error(`Duplicate SKUs found in the submitted variations data: ${duplicateSkusInPayload.join(', ')}. SKUs must be unique for each variation of this item.`);
    }


    for (const variation of variationsDataFromFrontend) {
        // --- START: Price Validation for each variation ---
        const costPrice = parseFloat(variation.cost_price);
        const retailPrice = parseFloat(variation.retail_price);
        const wholesalePrice = parseFloat(variation.wholesale_price);
        const currentSku = variation.sku || 'new variation'; // For error messaging

        // Check if prices are valid numbers before comparison
        const isCostPriceValid = costPrice !== null && !isNaN(costPrice);
        const isRetailPriceValid = retailPrice !== null && !isNaN(retailPrice);
        const isWholesalePriceValid = wholesalePrice !== null && !isNaN(wholesalePrice);

        if (isRetailPriceValid && isCostPriceValid && retailPrice < costPrice) {
            throw new Error(`Variation SKU '${currentSku}': Retail price (${variation.retail_price}) cannot be less than its cost price (${variation.cost_price}).`);
        }
        if (isWholesalePriceValid && isCostPriceValid && wholesalePrice < costPrice) {
            throw new Error(`Variation SKU '${currentSku}': Wholesale price (${variation.wholesale_price}) cannot be less than its cost price (${variation.cost_price}).`);
        }
        // --- END: Price Validation for each variation ---

        const variationToInsert = {
            item_id: itemId,
            sku: variation.sku || null,
            // Use validated and parsed prices, or null if not valid numbers
            retail_price: isRetailPriceValid ? retailPrice : null,
            cost_price: isCostPriceValid ? costPrice : null,
            wholesale_price: isWholesalePriceValid ? wholesalePrice : null,
            barcode: variation.barcode || null,
            is_active: variation.is_active === undefined ? true : (variation.is_active === true || variation.is_active === 'true'),
        };

        const [newVariationRow] = await trx('item_variations').insert(variationToInsert).returning(['id', 'item_id']);
        const newVariationId = newVariationRow.id;
        const parentItemId = newVariationRow.item_id;

        const initialStockQuantity = parseInt(variation.stock_quantity, 10) || 0;

        if (storeIdForStock && initialStockQuantity > 0) {
            await trx('stock').insert({
                item_id: parentItemId,
                item_variation_id: newVariationId,
                store_id: storeIdForStock,
                quantity: initialStockQuantity,
            });
            console.log(`[ItemDataProcessors.js] Added initial stock of ${initialStockQuantity} for variation ID ${newVariationId} (parent item ${parentItemId}) in store ID ${storeIdForStock}.`);
        } else if (initialStockQuantity > 0 && !storeIdForStock) {
            console.warn(`[ItemDataProcessors.js] Initial stock quantity ${initialStockQuantity} provided for variation ID ${newVariationId}, but no valid store_id was determined. Stock not added.`);
        }

        // Attribute linking logic
        // Use variation.attribute_combination as per your frontend structure
        if (attributesConfig && variation.attribute_combination && typeof variation.attribute_combination === 'object') {
            for (const attributeName in variation.attribute_combination) {
                if (Object.prototype.hasOwnProperty.call(variation.attribute_combination, attributeName)) {
                    const attributeValueString = variation.attribute_combination[attributeName];
                    
                    const attrConfigEntry = attributesConfig.find(ac => ac.name === attributeName);
                    if (!attrConfigEntry || !attrConfigEntry.attribute_id) {
                        console.warn(`[ItemDataProcessors.js] Attribute ID for name "${attributeName}" not found in attributesConfig. Skipping for variation ${newVariationId}.`);
                        continue;
                    }
                    const attributeId = parseInt(attrConfigEntry.attribute_id, 10);

                    const attributeValueRecord = await trx('attribute_values')
                        .where({ attribute_id: attributeId, value: attributeValueString })
                        .first();
                    
                    if (attributeValueRecord && attributeValueRecord.id) {
                        await trx('item_variation_attribute_values').insert({
                            item_variation_id: newVariationId,
                            attribute_value_id: attributeValueRecord.id,
                        });
                    } else {
                        console.warn(`[ItemDataProcessors.js] Attribute value record not found for Attr: "${attributeName}" (ID: ${attributeId}), Val: "${attributeValueString}". Var ID: ${newVariationId}. Not linking.`);
                    }
                }
            }
        }
    }
    console.log(`[ItemDataProcessors.js processAttributesAndVariations] Processed ${variationsDataFromFrontend.length} variations for item ID: ${itemId}.`);
};

// --- module.exports should be at the END of the file ---
module.exports = {
    prepareItemData,
    processItemUnits,
    processAttributesAndVariations,
};