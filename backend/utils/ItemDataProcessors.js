const knex = require('../db/knex'); // If these functions need direct DB access

// --- Definition for prepareItemData ---
const prepareItemData = (rawData) => {
    console.log('[ItemDataProcessors.js prepareItemData] Preparing item data from raw payload:', rawData);
    const data = { ...rawData };

    // --- START MODIFICATION ---
    // Ensure item_name is correctly populated
    // Check for common variations like 'Item_name' or 'itemName' from frontend
    if (rawData.Item_name && !data.item_name) { // If Item_name exists and item_name is not already set or is empty
        data.item_name = rawData.Item_name;
    } else if (rawData.itemName && !data.item_name) { // If itemName exists
        data.item_name = rawData.itemName;
    }
    // If rawData.item_name already exists and is correct, it will be used.
    // If after these checks, data.item_name is still empty, it means it wasn't provided correctly.
    
    // Remove the original case-sensitive version if it was different
    delete data.Item_name; 
    delete data.itemName;
    // --- END MODIFICATION ---

    // Convert to numbers, booleans, set defaults, ensure snake_case, etc.
    if (data.retail_price) data.retail_price = parseFloat(data.retail_price);
    if (data.cost_price) data.cost_price = parseFloat(data.cost_price);
    if (data.wholesale_price) data.wholesale_price = parseFloat(data.wholesale_price);
    if (data.stock_quantity !== undefined && data.stock_quantity !== null && data.stock_quantity !== '') data.stock_quantity = parseInt(data.stock_quantity, 10); else if (data.stock_quantity === '') data.stock_quantity = null;
    if (data.low_stock_threshold !== undefined && data.low_stock_threshold !== null && data.low_stock_threshold !== '') data.low_stock_threshold = parseInt(data.low_stock_threshold, 10); else if (data.low_stock_threshold === '') data.low_stock_threshold = null;
    
    data.is_taxable = data.is_taxable === 'true' || data.is_taxable === true;
    // Default is_active to true if undefined, otherwise use the boolean value
    data.is_active = data.is_active === undefined ? true : (data.is_active === 'true' || data.is_active === true);
    data.enable_stock_management = data.enable_stock_management === 'true' || data.enable_stock_management === true;

    // Handle optional fields that might come as empty strings from forms
    const optionalNumericFields = ['category_id', 'sub_category_id', 'brand_id', 'supplier_id', 'manufacturer_id', 'tax_id', 'warranty_id', 'store_id', 'base_unit_id'];
    optionalNumericFields.forEach(field => {
        if (data[field] === '' || data[field] === undefined) {
            data[field] = null;
        } else if (data[field] !== null) {
            data[field] = parseInt(data[field], 10);
            if (isNaN(data[field])) { // If parsing results in NaN (e.g. "abc")
                console.warn(`[ItemDataProcessors.js prepareItemData] Invalid numeric value for ${field}: ${rawData[field]}. Setting to null.`);
                data[field] = null;
            }
        }
    });
    
    // Ensure item_type is one of the allowed values
    const allowedItemTypes = ['Standard', 'Variable'];
    if (data.item_type && !allowedItemTypes.includes(data.item_type)) {
        console.warn(`[ItemDataProcessors.js prepareItemData] Invalid item_type: ${data.item_type}. Setting to 'Standard'.`);
        data.item_type = 'Standard'; // Or handle as an error
    } else if (!data.item_type) {
        data.item_type = 'Standard'; // Default if not provided
    }


    // Remove fields that shouldn't be directly inserted/updated if they exist
    // delete data.id; // ID is usually handled by DB or set explicitly for updates in controller
    delete data.created_at;
    delete data.updated_at;
    // Delete any other transient fields from frontend not meant for DB
    delete data.itemUnits; 
    delete data.itemAttributesConfig;
    delete data.itemVariations;


    console.log('[ItemDataProcessors.js prepareItemData] Prepared data (after name fix attempt):', data);
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
    
    // First, delete existing item units for this item.
    await trx('item_units').where({ item_id: itemId }).del();

    if (!itemUnitsConfig || itemUnitsConfig.length === 0) {
        console.log('[ItemDataProcessors.js processItemUnits] No item units to process after deletion.');
        // Consider if an item MUST have at least one unit; if so, throw an error or handle accordingly.
        return;
    }

    // Determine the designated base unit ID from the provided configurations
    let designatedBaseUnitConfig = itemUnitsConfig.find(u => u.is_base_unit === true || u.is_base_unit === 'true' || u.is_base_unit === 1);
    let designatedBaseUnitId;

    if (designatedBaseUnitConfig && designatedBaseUnitConfig.unit_id) {
        designatedBaseUnitId = parseInt(designatedBaseUnitConfig.unit_id, 10);
    } else if (itemUnitsConfig.length > 0 && itemUnitsConfig[0].unit_id) {
        // If no unit is explicitly marked as base, make the first one in the list the base unit.
        // The frontend should ideally ensure one is marked.
        designatedBaseUnitId = parseInt(itemUnitsConfig[0].unit_id, 10);
        // Optionally, find and mark the first unit in the array as base for clarity in logs or further processing if needed
        const firstUnit = itemUnitsConfig.find(u => parseInt(u.unit_id, 10) === designatedBaseUnitId);
        if (firstUnit) {
            // This modification to firstUnit.is_base_unit is local to this function's processing
            // and helps ensure the 'is_base_unit' flag is correctly set for insertion.
            console.warn(`[ItemDataProcessors.js processItemUnits] No explicit base unit set for item ID ${itemId}. Defaulting to unit ID ${designatedBaseUnitId} as base.`);
        }
    }

    if (isNaN(designatedBaseUnitId)) {
        console.error(`[ItemDataProcessors.js processItemUnits] Could not determine a valid base_unit_id from itemUnitsConfig for item ID: ${itemId}.`);
        throw new Error(`Could not determine a valid base unit ID from the provided unit configurations for item ID ${itemId}.`);
    }

    const unitsToInsert = itemUnitsConfig.map(unitConfig => {
        const currentUnitId = parseInt(unitConfig.unit_id, 10);
        if (isNaN(currentUnitId)) {
            console.error(`[ItemDataProcessors.js processItemUnits] Invalid unit_id in unitConfig: ${unitConfig.unit_id} for item ${itemId}. Skipping this unit.`);
            return null; // Skip this unit if unit_id is invalid
        }

        const isCurrentUnitBase = (currentUnitId === designatedBaseUnitId);
        let conversionFactor;

        if (isCurrentUnitBase) {
            conversionFactor = 1.0;
            if (unitConfig.conversion_factor !== undefined && parseFloat(unitConfig.conversion_factor) !== 1.0) {
                console.warn(`[ItemDataProcessors.js processItemUnits] Conversion factor for base unit ID ${currentUnitId} (item ID ${itemId}) was ${unitConfig.conversion_factor}. Forcing to 1.0.`);
            }
        } else {
            conversionFactor = parseFloat(unitConfig.conversion_factor);
            if (isNaN(conversionFactor) || conversionFactor <= 0) {
                // If conversion factor is invalid for a non-base unit, this is a critical error.
                console.error(`[ItemDataProcessors.js processItemUnits] Invalid or missing conversion_factor for non-base unit ID ${currentUnitId} (item ID ${itemId}): ${unitConfig.conversion_factor}.`);
                throw new Error(`Invalid or missing conversion_factor for non-base unit ID ${currentUnitId}. Must be a positive number.`);
            }
        }

        return {
            item_id: itemId,
            unit_id: currentUnitId,
            base_unit_id: designatedBaseUnitId, // All units refer to the one designated base unit's ID
            conversion_factor: conversionFactor,
            is_base_unit: isCurrentUnitBase,
            is_purchase_unit: unitConfig.is_purchase_unit === true || unitConfig.is_purchase_unit === 'true',
            is_sales_unit: unitConfig.is_sales_unit === true || unitConfig.is_sales_unit === 'true',
        };
    }).filter(unit => unit !== null); // Filter out any nulls from skipped units

    if (unitsToInsert.length > 0) {
        console.log('[ItemDataProcessors.js processItemUnits] Inserting item units:', JSON.stringify(unitsToInsert, null, 2));
        await trx('item_units').insert(unitsToInsert);
        console.log(`[ItemDataProcessors.js processItemUnits] Successfully inserted/updated ${unitsToInsert.length} units for item ID: ${itemId}`);
    } else {
        console.log('[ItemDataProcessors.js processItemUnits] No valid units to insert after filtering.');
    }
}

// --- Definition for processAttributesAndVariations ---
// IMPORTANT: You need to decide how to get the store_id for the initial stock entry.
// Option 1: Pass it as an argument: processAttributesAndVariations = async (trx, itemId, attributesConfig, variationsData, storeIdForStock)
// Option 2: Fetch it from the parent item if it's always set: const parentItem = await trx('items').where('id', itemId).first(); const storeIdForStock = parentItem.store_id;
// Option 3: Use a default store ID if the parent item's store_id is null.
// For this example, I'll assume you pass storeIdForStock as an argument. Modify as needed.

const processAttributesAndVariations = async (trx, itemId, attributesConfig, variationsDataFromFrontend, storeIdForStock) => {
    console.log(`[ItemDataProcessors.js processAttributesAndVariations] Processing for item ID: ${itemId}`);

    // 1. Delete existing variations and their attribute links for this item.
    // This strategy means we clear out all old variations and re-insert based on variationsDataFromFrontend.
    await trx('item_variation_attribute_values')
        .whereIn('item_variation_id', function() {
            this.select('id').from('item_variations').where('item_id', itemId);
        })
        .del();
    await trx('item_variations').where({ item_id: itemId }).del();

    // If variationsDataFromFrontend is empty or not provided, we've effectively deleted all variations.
    if (!variationsDataFromFrontend || !Array.isArray(variationsDataFromFrontend) || variationsDataFromFrontend.length === 0) {
        console.log('[ItemDataProcessors.js processAttributesAndVariations] No variations data provided in payload. All existing variations (if any) have been deleted.');
        return;
    }

    if (!attributesConfig || !Array.isArray(attributesConfig)) {
        console.warn('[ItemDataProcessors.js processAttributesAndVariations] attributesConfig is missing or not an array. Cannot map attribute names to IDs for linking.');
    }

    // --- REMOVE THE REDUNDANT ORPHANED VARIATION DELETION LOGIC ---
    // The "delete all" approach above handles deletions.
    // The following block (previously lines 191-208) should be removed:
    /*
    // --- Logic for Deleting Orphaned Variations --- // THIS BLOCK IS NOW REDUNDANT
    const existingDbVariations = await trx('item_variations')
        .where({ item_id: itemId })
        .select('id');
    const existingDbVariationIds = existingDbVariations.map(v => v.id.toString());

    const frontendVariationIds = variationsDataFromFrontend
        .filter(v => v.id) 
        .map(v => v.id.toString());

    const variationIdsToDelete = existingDbVariationIds.filter(
        dbId => !frontendVariationIds.includes(dbId)
    );

    if (variationIdsToDelete.length > 0) {
        console.log(`[ItemDataProcessors] Deleting variations for item ${itemId}:`, variationIdsToDelete);
        for (const variationId of variationIdsToDelete) {
            await trx('item_variation_attribute_values')
                .where({ item_variation_id: variationId })
                .del();
            await trx('item_variations')
                .where({ id: variationId })
                .del();
        }
    }
    */
    // --- END OF REMOVED BLOCK ---


    for (const variation of variationsDataFromFrontend) {
        const variationToInsert = {
            item_id: itemId,
            sku: variation.sku,
            retail_price: parseFloat(variation.retail_price) || 0,
            cost_price: parseFloat(variation.cost_price) || 0,
            wholesale_price: parseFloat(variation.wholesale_price) || 0,
            // stock_quantity: parseInt(variation.stock_quantity, 10) || 0, // REMOVED from item_variations
            barcode: variation.barcode || null,
            is_active: variation.is_active === undefined ? true : (variation.is_active === true || variation.is_active === 'true'),
        };

        const [newVariationRow] = await trx('item_variations').insert(variationToInsert).returning('id');
        const newVariationId = newVariationRow.id;

        // --- START: New logic to add stock to the 'stock' table ---
        const initialStockQuantity = parseInt(variation.stock_quantity, 10) || 0;

        if (storeIdForStock && initialStockQuantity > 0) { // Only add stock if store_id is valid and quantity > 0
            // Check if stock record already exists for this variation and store (shouldn't if we delete variations)
            // This is more of a safety for updates, but good practice.
            // For a "replace all" on variations, we'd typically also clear related stock or handle it.
            // For now, let's assume we are creating new stock entries.
            
            // IMPORTANT: Your 'stock' table needs to be able to link to an item_variation_id.
            // If your 'stock' table has `product_id` that refers to `items.id`,
            // you need a new column like `item_variation_id` (nullable) in the `stock` table.
            // Or, if `product_id` in `stock` can refer to either `items.id` (for standard items)
            // or `item_variations.id` (for variations), you need a way to distinguish.
            // A common approach is to have `item_id` (for parent) and `item_variation_id` (nullable) in `stock`.

            // Assuming your stock table has `item_variation_id` and `store_id`:
            await trx('stock').insert({
                item_variation_id: newVariationId, // Link to the variation
                store_id: storeIdForStock,         // The store for this stock
                quantity: initialStockQuantity,    // The initial quantity
                // product_id: itemId, // Optionally, also store parent item_id for easier queries
            });
            console.log(`[ItemDataProcessors.js] Added initial stock of ${initialStockQuantity} for variation ID ${newVariationId} in store ID ${storeIdForStock}.`);
        } else if (initialStockQuantity > 0 && !storeIdForStock) {
            console.warn(`[ItemDataProcessors.js] Initial stock quantity ${initialStockQuantity} provided for variation ID ${newVariationId}, but no valid store_id was determined. Stock not added.`);
        }
        // --- END: New logic to add stock to the 'stock' table ---

        if (variation.attributes && typeof variation.attributes === 'object' && Object.keys(variation.attributes).length > 0) {
            for (const attributeName in variation.attributes) {
                if (Object.prototype.hasOwnProperty.call(variation.attributes, attributeName)) {
                    const attributeValueString = variation.attributes[attributeName];
                    const attrConfigEntry = attributesConfig ? attributesConfig.find(ac => ac.name === attributeName) : null;

                    if (!attrConfigEntry || !attrConfigEntry.attribute_id) {
                        console.warn(`[ItemDataProcessors.js] Attribute ID not found in attributesConfig for attribute name: "${attributeName}". Skipping this attribute for variation ${newVariationId}.`);
                        continue; 
                    }
                    const attributeId = parseInt(attrConfigEntry.attribute_id, 10);

                    const attributeValueRecord = await trx('attribute_values')
                        .where({
                            attribute_id: attributeId,
                            value: attributeValueString
                        })
                        .first();
                    
                    if (attributeValueRecord && attributeValueRecord.id) {
                        await trx('item_variation_attribute_values').insert({
                            item_variation_id: newVariationId,
                            attribute_value_id: attributeValueRecord.id,
                        });
                    } else {
                        console.warn(`[ItemDataProcessors.js] Attribute value record not found for Attribute: "${attributeName}" (ID: ${attributeId}), Value: "${attributeValueString}". Variation ID: ${newVariationId}. This attribute-value pair will not be linked.`);
                    }
                }
            }
        } else {
            console.log(`[ItemDataProcessors.js] No attributes to process for variation SKU: ${variation.sku} (ID: ${newVariationId}) or attributes format is incorrect.`);
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