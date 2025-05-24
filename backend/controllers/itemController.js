const knex = require('../db/knex'); // Make sure this path is correct and knex is configured
const {
    prepareItemData,
    processItemUnits, // Ensure this is imported
    processAttributesAndVariations
} = require('../utils/ItemDataProcessors');

// --- Create Item ---
exports.createItem = async (req, res) => {
    const { item_units_config, attributes_config, variations_data, item_images, ...mainItemDataFromPayload } = req.body;
    let newItemId;

    const trx = await knex.transaction();
    try {
        // --- START: Unit Configuration Validation ---
        if (!item_units_config || !Array.isArray(item_units_config) || item_units_config.length === 0) {
            await trx.rollback(); // Rollback before sending response
            return res.status(400).json({ message: 'Item must have at least one unit configuration.' });
        }
        // Ensure at least one unit is marked as a base unit
        const hasBaseUnit = item_units_config.some(unit => unit.is_base_unit === true || unit.is_base_unit === 'true');
        if (!hasBaseUnit) {
            await trx.rollback();
            return res.status(400).json({ message: 'Item must have at least one unit marked as the base unit.' });
        }
        // --- END: Unit Configuration Validation ---

        const preparedMainItemData = prepareItemData(mainItemDataFromPayload); // Assuming isUpdate=false by default

        // Add this validation for createItem
        if (preparedMainItemData.item_type === 'Variable' && (!variations_data || variations_data.length === 0)) {
            await trx.rollback(); // Rollback if transaction started
            return res.status(400).json({ message: 'Variable products must have at least one variation defined.' });
        }

        // Price validation for main item
        if (preparedMainItemData.retail_price !== null && preparedMainItemData.cost_price !== null && parseFloat(preparedMainItemData.retail_price) < parseFloat(preparedMainItemData.cost_price)) {
            await trx.rollback();
            return res.status(400).json({ message: 'Retail price cannot be less than cost price for the main item.' });
        }
        if (preparedMainItemData.wholesale_price !== null && preparedMainItemData.cost_price !== null && parseFloat(preparedMainItemData.wholesale_price) < parseFloat(preparedMainItemData.cost_price)) {
            await trx.rollback();
            return res.status(400).json({ message: 'Wholesale price cannot be less than cost price for the main item.' });
        }

        // 1. Insert the main item data
        const [createdItem] = await trx('items').insert(preparedMainItemData).returning('*');
        newItemId = createdItem.id;

        // 2. Process and insert item unit configurations using the utility function
        // Validation above ensures item_units_config is present and not empty
        await processItemUnits(newItemId, item_units_config, trx);


        // 3. Process attributes and variations (if item_type is 'Variable')
        if (preparedMainItemData.item_type === 'Variable') {
            // Ensure attributes_config and variations_data are provided if type is Variable
            if (attributes_config && variations_data) {
                 // Determine store_id for stock. For new items, it might come from mainItemData or a default.
                const storeIdForStock = preparedMainItemData.store_id; // Or a system default if applicable
                await processAttributesAndVariations(trx, newItemId, attributes_config, variations_data, storeIdForStock);
            } else {
                console.warn(`[itemController.js createItem] Item type is Variable but attributes_config or variations_data is missing for new item ID: ${newItemId}.`);
                // Potentially throw an error if these are mandatory for variable items
            }
        }

        // 4. Process item images (if any) - Placeholder
        // if (item_images && item_images.length > 0) {
        //     await processItemImages(trx, newItemId, item_images);
        // }

        await trx.commit(); // Commit transaction if all successful

        // Fetch the complete item data for the response, similar to getItemByIdForResponse
        const finalItem = await exports.getItemByIdForResponse(newItemId);
        res.status(201).json({ ...finalItem, message: "Item created successfully" });

    } catch (error) {
        if (trx && trx.isCompleted && !trx.isCompleted()) { // Check if trx exists and is not already completed
          await trx.rollback();
        }
        console.error('Error creating item:', error);
        // More specific error handling from previous suggestions
        if (error.message.includes("cannot be less than its cost price") || 
            error.message.includes("Duplicate SKUs found") ||
            error.message.includes("Item must have at least one unit")) { // Catch our specific unit errors
            return res.status(400).json({ message: error.message });
        }
        if (error.code === '23505') { 
            if (error.constraint === 'items_slug_unique') {
                return res.status(400).json({ message: 'An item with this name (or resulting slug) already exists. Please choose a different name.', constraint: error.constraint });
            }
            if (error.constraint === 'item_variations_sku_unique') {
                return res.status(400).json({ message: `The SKU '${error.detail ? error.detail.match(/\(sku\)=\(([^)]+)\)/)?.[1] : 'provided'}' already exists for another variation. SKUs must be unique.`, constraint: error.constraint });
            }
            return res.status(400).json({ message: 'A unique constraint was violated. Please check your input.', error: error.message, detail: error.detail });
        }
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Failed to create item';
        res.status(500).json({ message: 'Failed to create item', error: errorMessage });
    }
};

// --- Update Item ---
exports.updateItem = async (req, res) => {
    const { id: itemId } = req.params;
    const {
        item_units_config,
        attributes_config,
        variations_data,
        ...mainItemDataFromPayload
    } = req.body;

    const isNewItem = false;
    let trx;

    try {
        trx = await knex.transaction();

        const currentItemForSlug = await trx('items').where({ id: parseInt(itemId) }).first();
        if (!currentItemForSlug) {
            await trx.rollback();
            return res.status(404).json({ message: 'Item not found for update.' });
        }

        // --- START: Unit Configuration Validation for Update ---
        if (item_units_config !== undefined) { // Only validate if units are part of the payload
            if (!Array.isArray(item_units_config) || item_units_config.length === 0) {
                await trx.rollback();
                return res.status(400).json({ message: 'If item units are being updated, at least one unit configuration must be provided.' });
            }
            const hasBaseUnit = item_units_config.some(unit => unit.is_base_unit === true || unit.is_base_unit === 'true');
            if (!hasBaseUnit) {
                await trx.rollback();
                return res.status(400).json({ message: 'If item units are being updated, one unit must be marked as the base unit.' });
            }
        }
        // --- END: Unit Configuration Validation for Update ---

        const preparedMainItemData = prepareItemData(mainItemDataFromPayload, true, currentItemForSlug);

        // 1. Update main item details
        const updatedItemCount = await trx('items')
            .where({ id: parseInt(itemId) })
            .update({
                ...preparedMainItemData,
                updated_at: knex.fn.now(),
            });

        if (updatedItemCount === 0) {
            await trx.rollback();
            return res.status(404).json({ message: 'Item not found or no changes made to item data.' });
        }


        // 2. Process item units
        if (item_units_config !== undefined) {
            console.log(`[itemController.js updateItem] Processing item_units_config for item ID ${itemId}`);
            // The validation above ensures item_units_config is valid if provided
            await processItemUnits(parseInt(itemId), item_units_config, trx);
        } else {
            console.log(`[itemController.js updateItem] item_units_config not provided for item ID ${itemId}. Skipping unit processing.`);
            // Critical: Ensure the item STILL has units if none are provided in the update.
            // This check is more of a safeguard; ideally, createItem prevents items without units.
            const existingUnitsCount = await trx('item_units').where({ item_id: parseInt(itemId) }).count('id as count').first();
            if (!existingUnitsCount || parseInt(existingUnitsCount.count, 10) === 0) {
                await trx.rollback();
                // This situation implies data inconsistency or a flaw in create logic if an item exists with no units.
                return res.status(400).json({ message: 'Item has no units and no new unit configurations were provided. An item must always have units.' });
            }
        }

        // 3. Process attributes and variations if item_type is 'Variable'
        // We need the potentially updated item type from preparedMainItemData, or fallback to currentItemForSlug's type
        const effectiveItemType = preparedMainItemData.item_type || currentItemForSlug.item_type;
        const currentItemForVariations = await trx('items').where({id: parseInt(itemId)}).first(); // Re-fetch to get the item after main update for store_id etc.

        if (effectiveItemType === 'Variable') {
            // ... (your existing logic for variable item processing)
            // Ensure you use currentItemForVariations.store_id or preparedMainItemData.store_id for storeIdForStock
            if (Array.isArray(variations_data) && variations_data.length === 0) {
                 await trx.rollback();
                 return res.status(400).json({ message: 'Variable products must have at least one variation. To remove all variations, change the item type.' });
            }
            if (attributes_config !== undefined && variations_data !== undefined) {
                const storeIdForStock = preparedMainItemData.store_id || currentItemForVariations.store_id;
                await processAttributesAndVariations(
                    trx,
                    parseInt(itemId),
                    attributes_config,
                    variations_data,
                    storeIdForStock
                );
            } // ... else for missing parts ...
        } else {
             // ... (your existing logic for non-variable items, including cleanup)
             if (currentItemForSlug.item_type === 'Variable' && effectiveItemType !== 'Variable') {
                 console.log(`[itemController.js updateItem] Item type changed from Variable. Clearing existing variations for item ${itemId}.`);
                 await processAttributesAndVariations(trx, parseInt(itemId), [], [], currentItemForSlug.store_id); // Use currentItemForSlug here for store_id
             }
        }

        // Price validation for main item (uses preparedMainItemData and currentItemForSlug from the top)
        const costPriceForValidation = preparedMainItemData.cost_price !== undefined ? preparedMainItemData.cost_price : currentItemForSlug.cost_price;
        const retailPriceForValidation = preparedMainItemData.retail_price !== undefined ? preparedMainItemData.retail_price : currentItemForSlug.retail_price;
        const wholesalePriceForValidation = preparedMainItemData.wholesale_price !== undefined ? preparedMainItemData.wholesale_price : currentItemForSlug.wholesale_price;

        if (retailPriceForValidation !== null && costPriceForValidation !== null && parseFloat(retailPriceForValidation) < parseFloat(costPriceForValidation)) {
            await trx.rollback();
            return res.status(400).json({ message: 'Retail price cannot be less than cost price for the main item.' });
        }
        if (wholesalePriceForValidation !== null && costPriceForValidation !== null && parseFloat(wholesalePriceForValidation) < parseFloat(costPriceForValidation)) {
            await trx.rollback();
            return res.status(400).json({ message: 'Wholesale price cannot be less than cost price for the main item.' });
        }

        await trx.commit();
        const resultItem = await exports.getItemByIdForResponse(parseInt(itemId));
        res.status(200).json({ message: `Item updated successfully`, item: resultItem });

    } catch (error) {
        if (trx && !trx.isCompleted()) {
            await trx.rollback();
        }
        console.error(`[itemController.js updateItem for ID ${itemId}] Detailed error:`, error.message, error.stack ? `\nStack: ${error.stack}` : '');
        
        // Catch our specific unit errors
        if (error.message.includes("Item must have at least one unit") ||
            error.message.includes("one unit must be marked as the base unit") ||
            error.message.includes("at least one unit configuration must be provided") ||
            error.message.includes("Item has no units and no new unit configurations")) {
            return res.status(400).json({ message: error.message });
        }
        // ... (other specific error handling) ...
        if (error.message.includes("cannot be less than its cost price") || 
            error.message.includes("Duplicate SKUs found")) {
            return res.status(400).json({ message: error.message });
        }
        if (error.code === '23505') { 
            if (error.constraint === 'items_slug_unique') {
                return res.status(400).json({ message: 'An item with this name (or resulting slug) already exists. Please choose a different name.', constraint: error.constraint });
            }
            if (error.constraint === 'item_variations_sku_unique') {
                return res.status(400).json({ message: `The SKU '${error.detail ? error.detail.match(/\(sku\)=\(([^)]+)\)/)?.[1] : 'provided'}' already exists for another variation. SKUs must be unique.`, constraint: error.constraint });
            }
            return res.status(400).json({ message: 'A unique constraint was violated. Please check your input.', error: error.message, detail: error.detail });
        }
        res.status(500).json({ message: `Failed to update item`, error: error.message });
    }
};

// Helper to fetch full item data for response (similar to getItemById, adapted to return data directly ...
exports.getItemByIdForResponse = async (itemId) => {
    // ... logic from your getItemById, adapted to return data directly ...
    // This is just a placeholder for the concept
    const item = await knex('items').where({ id: itemId }).first();
    if (!item) throw new Error('Item not found after update');

    const item_units = await knex('item_units')
        .select('item_units.*', 'units.name as unit_name')
        .leftJoin('units', 'item_units.unit_id', 'units.id')
        .where('item_units.item_id', itemId)
        .orderBy('item_units.is_base_unit', 'desc')
        .orderBy('item_units.conversion_factor');
    // ... fetch other related data (variations, attributes_config) ...
    return { ...item, item_units_config: item_units /*, other_related_data */ };
};

// --- Get Item By ID (for loading in form) ---
exports.getItemById = async (req, res) => {
    const { id } = req.params;
    try {
        const item = await knex('items').where('items.id', parseInt(id)).first();
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }

        // Fetch related data
        const item_units_config = await knex('item_units')
            .select(
                'item_units.id',
                'item_units.item_id',
                'item_units.unit_id',
                'item_units.conversion_factor',
                'item_units.is_purchase_unit',
                'item_units.is_sales_unit',
                'units.name as unit_name'
            )
            .leftJoin('units', 'item_units.unit_id', 'units.id')
            .where('item_units.item_id', parseInt(id));
        
        let attributes_config = [];
        if (item.item_type === 'Variable') {
            // For Variable items, derive attributes_config from existing variations and their attribute values
            const variationAttributeDetails = await knex('item_variations as iv')
                .join('item_variation_attribute_values as ivav', 'iv.id', 'ivav.item_variation_id')
                .join('attribute_values as av', 'ivav.attribute_value_id', 'av.id')
                .join('attributes as a', 'av.attribute_id', 'a.id')
                .where('iv.item_id', parseInt(id))
                .select(
                    'a.id as attribute_id',
                    'a.name as attribute_name', // This is the actual name of the attribute (e.g., "Color")
                    'av.value as attribute_value' // This is the specific value (e.g., "Red")
                )
                .orderBy(['a.id', 'av.value']) // Order by is needed for distinctOn to work predictably
                .distinctOn(['a.id', 'av.value']); // Get unique attribute_id and value combinations used by this item's variations

            const attributesConfigMap = new Map();
            variationAttributeDetails.forEach(detail => {
                if (!attributesConfigMap.has(detail.attribute_id)) {
                    attributesConfigMap.set(detail.attribute_id, {
                        attribute_id: detail.attribute_id,
                        name: detail.attribute_name, // Use the attribute's actual name for the 'name' field
                        values: []
                    });
                }
                const attrConf = attributesConfigMap.get(detail.attribute_id);
                // The distinctOn should ensure unique values per attribute, but an extra check doesn't hurt
                if (!attrConf.values.includes(detail.attribute_value)) {
                    attrConf.values.push(detail.attribute_value);
                }
            });
            attributes_config = Array.from(attributesConfigMap.values());
        }
        
        const variations_data = await knex('item_variations')
            .select('*') // Select all columns from item_variations
            .where({ item_id: parseInt(id) });

        // For each variation, we might want to enrich it with its attribute combination display string
        // This is often useful for the frontend.
        const enriched_variations_data = await Promise.all(variations_data.map(async (variation) => {
            const attrs = await knex('item_variation_attribute_values as ivav')
                .join('attribute_values as av', 'ivav.attribute_value_id', 'av.id')
                .join('attributes as a', 'av.attribute_id', 'a.id')
                .where('ivav.item_variation_id', variation.id)
                .select('a.name as attribute_name', 'av.value as attribute_value')
                .orderBy('a.name');
            
            const attribute_combination = {};
            attrs.forEach(attr => {
                attribute_combination[attr.attribute_name] = attr.attribute_value;
            });
            return { ...variation, attribute_combination }; // attribute_combination is { Color: "Red", Size: "Small" }
        }));

        res.json({
            ...item,
            item_units_config,
            attributes_config, // This is now derived
            variations_data: enriched_variations_data, // Send enriched variations
        });
    } catch (error) {
        console.error(`Error fetching item with ID ${id}:`, error);
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Error fetching item details';
        res.status(500).json({ message: 'Error fetching item details', error: errorMessage });
    }
};

// --- Get All Items ---
exports.getAllItems = async (req, res) => {
    try {
        const {
            limit = 1000,
            page = 1,
            supplier_id, // Capture supplier_id from query
            category_id,
            brand_id,
            search,
            sort_by = 'items.id',
            order = 'desc'
        } = req.query;

        const query = knex('items')
            .select(
                'items.id', 'items.item_name', 'items.sku', 'items.item_barcode', 
                'items.retail_price', 'items.cost_price',
                'items.is_active', 'items.item_type',
                'categories.name as category_name',
                'brands.name as brand_name',
                'units.name as base_unit_name'
            )
            .leftJoin('categories', 'items.category_id', 'categories.id')
            .leftJoin('brands', 'items.brand_id', 'brands.id')
            .leftJoin('units', 'items.base_unit_id', 'units.id');

        if (supplier_id) {
            // Filter directly on the items table's supplier_id column
            query.where('items.supplier_id', parseInt(supplier_id, 10));
        }

        if (category_id) {
            query.where('items.category_id', parseInt(category_id, 10));
        }
        if (brand_id) {
            query.where('items.brand_id', parseInt(brand_id, 10));
        }
        if (search) {
            query.where(function() {
                this.where('items.item_name', 'ilike', `%${search}%`)
                    .orWhere('items.sku', 'ilike', `%${search}%`);
            });
        }

        // Sorting
        const validSortColumns = ['items.id', 'items.item_name', 'items.sku', 'items.retail_price', 'items.cost_price', 'category_name', 'brand_name'];
        if (validSortColumns.includes(sort_by)) {
            query.orderBy(sort_by, order === 'asc' ? 'asc' : 'desc');
        } else {
            query.orderBy('items.id', 'desc'); // Default sort
        }

        // Pagination
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        
        // Get total count for pagination before applying limit and offset for data
        const countQuery = query.clone().clearSelect().clearOrder().count('items.id as total').first();
        
        // Get the actual data
        const dataQuery = query.limit(parseInt(limit, 10)).offset(offset);
        
        const [itemsData, totalCountResult] = await Promise.all([dataQuery, countQuery]);
        
        const totalCount = totalCountResult ? parseInt(totalCountResult.total, 10) : 0;

        res.json({
            items: itemsData, // Ensure key is 'items'
            totalCount,
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
        });
    } catch (error) {
        console.error('Error fetching all items:', error);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

// NEW CONTROLLER FUNCTION to get variations for a specific item
exports.getVariationsForItem = async (req, res) => {
    const { itemId } = req.params;
    console.log(`[itemController.getVariationsForItem] Received request for itemId: ${itemId}`);

    const parsedItemId = parseInt(itemId, 10);

    if (isNaN(parsedItemId)) {
        console.error(`[itemController.getVariationsForItem] Invalid itemId: ${itemId}`);
        return res.status(400).json({ message: 'Invalid item ID format.' });
    }

    try {
        const itemExists = await knex('items').where({ id: parsedItemId }).first();
        if (!itemExists) {
            return res.status(404).json({ message: 'Base item not found.' });
        }

        const variations_data = await knex('item_variations')
            .select('*') // Select all columns from item_variations
            .where({ item_id: parsedItemId })
            .andWhere('is_active', true); // Optionally, only fetch active variations

        if (!variations_data || variations_data.length === 0) {
            console.log(`[itemController.getVariationsForItem] No variations found for item ID ${parsedItemId}.`);
            return res.status(200).json([]); // Return empty array if no variations
        }

        // Enrich variations with attribute combinations (similar to getItemById)
        const enriched_variations_data = await Promise.all(variations_data.map(async (variation) => {
            const attrs = await knex('item_variation_attribute_values as ivav')
                .join('attribute_values as av', 'ivav.attribute_value_id', 'av.id')
                .join('attributes as a', 'av.attribute_id', 'a.id')
                .where('ivav.item_variation_id', variation.id)
                .select('a.name as attribute_name', 'av.value as attribute_value')
                .orderBy('a.name');
            
            const attribute_combination = {};
            let attribute_combination_display = [];
            attrs.forEach(attr => {
                attribute_combination[attr.attribute_name] = attr.attribute_value;
                attribute_combination_display.push(`${attr.attribute_name}: ${attr.attribute_value}`);
            });
            return { 
                ...variation, 
                attribute_combination, // e.g., { Color: "Red", Size: "M" }
                attribute_combination_display: attribute_combination_display.join(' / ') || 'Default' // e.g., "Color: Red / Size: M"
            };
        }));

        console.log(`[itemController.getVariationsForItem] Found ${enriched_variations_data.length} variations for item ID ${parsedItemId}.`);
        res.status(200).json(enriched_variations_data); // Send the array of variations

    } catch (error) {
        console.error(`[itemController.getVariationsForItem] Error fetching variations for item ID ${parsedItemId}:`, error);
        res.status(500).json({ message: 'Server error fetching variations.' });
    }
};

// --- Delete Item ---
exports.deleteItem = async (req, res) => {
    const { id } = req.params;
    try {
        await knex.transaction(async (trx) => {
            // 1. Get all variation IDs for the item first.
            const variationIds = await trx('item_variations')
                .where({ item_id: parseInt(id) })
                .pluck('id');

            // 2. Delete item_variation_attribute_values for these variations
            if (variationIds.length > 0) {
                await trx('item_variation_attribute_values')
                    .whereIn('item_variation_id', variationIds)
                    .del();
            }

            // 3. Delete item_variations
            await trx('item_variations').where({ item_id: parseInt(id) }).del();

            // 4. Delete item_units
            await trx('item_units').where({ item_id: parseInt(id) }).del();

            // 5. Delete item_attribute_config_values - THIS TABLE DOES NOT EXIST
            // await trx('item_attribute_configuration_values').whereIn('attribute_config_id', function() {
            //     this.select('id').from('item_attribute_configs').where('item_id', parseInt(id));
            // }).del();

            // 6. Then delete item_attribute_configs - THIS TABLE ALSO LIKELY DOES NOT EXIST OR ISN'T USED
            // await trx('item_attribute_configs').where({ item_id: parseInt(id) }).del(); 
            
            // 7. Delete item images if stored in DB or references (Placeholder)
            // await trx('item_images').where({ item_id: parseInt(id) }).del();

            // 8. Finally, delete the item itself
            const count = await trx('items').where({ id: parseInt(id) }).del();

            if (count > 0) {
                // trx.commit() is called automatically if the callback doesn't throw an error
                res.status(200).json({ message: 'Item and its related data deleted successfully' });
            } else {
                // If the item itself wasn't found, it's a 404.
                // Knex transaction automatically rolls back on error.
                // If count is 0, it means item wasn't there to begin with or was already deleted.
                // We explicitly rollback here to be clear if other operations might have occurred
                // before finding the item was not there (though with `parseInt(id)` it's less likely).
                await trx.rollback();
                res.status(404).json({ message: 'Item not found' });
            }
        }); // Transaction commits on success, rolls back on error
    } catch (error) {
        // The transaction should have already rolled back if an error occurred within it.
        console.error(`Error deleting item with ID ${id}:`, error);
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
};

// NEW Endpoint 1: For the first dropdown (Product Lines)
exports.getPurchasableProductLines = async (req, res) => {
    const { supplier_id } = req.query;
    console.log(`[itemController.getPurchasableProductLines] Received request. Query parameters:`, req.query);

    try {
        let query = knex('items as i')
            .select(
                'i.id as base_item_id',
                'i.item_name',
                'i.sku as base_item_sku',
                'i.cost_price as base_cost_price',
                'i.item_type',
                knex.raw("CASE WHEN i.item_type = 'Variable' THEN false ELSE true END as is_directly_purchasable"),
                // --- FIX: Always use a real item_variations.id for Standard/Service items ---
                knex.raw(`
                    CASE 
                        WHEN i.item_type != 'Variable' THEN (
                            SELECT iv.id FROM item_variations iv
                            WHERE iv.item_id = i.id AND iv.is_active = true
                            ORDER BY iv.id ASC LIMIT 1
                        )
                        ELSE null
                    END as item_variant_id_if_direct
                `),
                knex.raw("CASE WHEN i.item_type != 'Variable' THEN i.cost_price ELSE null END as unit_price_if_direct")
            )
            .where('i.is_active', true)
            .orderBy('i.item_name');

        if (supplier_id && supplier_id.trim() !== '') {
            const parsedSupplierId = parseInt(supplier_id, 10);
            if (!isNaN(parsedSupplierId)) {
                console.log(`[itemController.getPurchasableProductLines] Filtering by supplier_id: ${parsedSupplierId}`);
                query.andWhere('i.supplier_id', parsedSupplierId);
            } else {
                console.error(`[itemController.getPurchasableProductLines] Invalid non-numeric supplier_id received: '${supplier_id}'. Returning 400.`);
                return res.status(400).json({ success: false, message: `Invalid supplier ID format: ${supplier_id}`, data: [] });
            }
        } else {
            console.log('[itemController.getPurchasableProductLines] No supplier_id provided or it is empty. Fetching all active product lines.');
        }

        console.log("[itemController.getPurchasableProductLines] Executing query:", query.toString());
        const productLines = await query;

        console.log(`[itemController.getPurchasableProductLines] Found ${productLines.length} product lines. Supplier ID in request was: '${supplier_id}'`);
        res.status(200).json({ success: true, data: productLines });

    } catch (error) {
        console.error('[itemController.getPurchasableProductLines] Error fetching purchasable product lines:', error);
        res.status(500).json({ success: false, message: 'Server error fetching product lines.' });
    }
};

// NEW Endpoint 2: For the second dropdown (Variations)
exports.getVariationsForProductLine = async (req, res) => {
    const { base_item_id } = req.params;
    console.log(`[itemController.getVariationsForProductLine] Received request for base_item_id: ${base_item_id}`);

    const parsedBaseItemId = parseInt(base_item_id, 10);

    if (isNaN(parsedBaseItemId)) {
        console.error(`[itemController.getVariationsForProductLine] Invalid base_item_id: ${base_item_id}`);
        return res.status(400).json({ success: false, message: 'Invalid base_item_id format.' });
    }

    try {
        const variations = await knex('item_variations as iv')
            .select(
                'iv.id as item_variant_id',
                'iv.sku as variation_sku',
                'iv.cost_price as unit_price',
                'iv.item_id as base_item_id',
                knex.raw(`(
                    SELECT STRING_AGG(av.value, ' / ' ORDER BY a.name)
                    FROM item_variation_attribute_values as ivav
                    JOIN attribute_values as av ON ivav.attribute_value_id = av.id
                    JOIN attributes as a ON av.attribute_id = a.id
                    WHERE ivav.item_variation_id = iv.id
                ) as variation_display_name`)
            )
            .where('iv.item_id', parsedBaseItemId)
            .andWhere('iv.is_active', true)
            .groupBy('iv.id', 'iv.sku', 'iv.cost_price', 'iv.item_id') // Group by all non-aggregated selected columns from iv
            .orderBy('variation_display_name'); 

        console.log(`[itemController.getVariationsForProductLine] Found ${variations.length} variations for base_item_id ${parsedBaseItemId}.`);
        // Post-process display name if subquery returns null for variations with no attributes
        const processedVariations = variations.map(v => ({
            ...v,
            variation_display_name: v.variation_display_name || 'Default'
        }));

        res.status(200).json({ success: true, data: processedVariations });

    } catch (error) {
        console.error(`[itemController.getVariationsForProductLine] Error fetching variations for base_item_id ${parsedBaseItemId}:`, error);
        res.status(500).json({ success: false, message: 'Server error fetching variations.' });
    }
};

// Ensure this function definition and export is exactly like this:
exports.getItemVariantsForPurchase = async (req, res) => {
    // ... your function code for getItemVariantsForPurchase ...
    // This is the OLD function for the single dropdown.
    // If you've removed its body, ensure the export line is still correct
    // or that the function is defined, even if it just sends an error or empty array.
    try {
        const { supplier_id } = req.query;
        console.log(`[getItemVariantsForPurchase - OLD] Called. Supplier ID: ${supplier_id}`);
        // ... (rest of the logic for this old function) ...
        // For now, to ensure server starts, you can even have a placeholder:
        // res.status(200).json({ success: true, data: [], message: "Old endpoint, to be deprecated." });

        // Original logic (ensure knex is defined if you use this):
        const variationsQuery = knex('item_variations as iv')
            .join('items as i', 'iv.item_id', 'i.id')
            .select(/* ... specify columns ... */) // Make sure to specify columns
            .where('iv.is_active', true)
            .andWhere('i.is_active', true);
        if (supplier_id) {
            const parsedSupplierId = parseInt(supplier_id, 10);
            if (!isNaN(parsedSupplierId)) {
                variationsQuery.andWhere('i.supplier_id', parsedSupplierId);
            }
        }


        const baseItemsQuery = knex('items as i')
            .select(/* ... specify columns ... */) // Make sure to specify columns
            .where('i.is_active', true)
            .whereNotIn('i.item_type', ['Variable']);
        if (supplier_id) {
            const parsedSupplierId = parseInt(supplier_id, 10);
            if (!isNaN(parsedSupplierId)) {
                baseItemsQuery.andWhere('i.supplier_id', parsedSupplierId);
            }
        }


        const [itemVariationsResults, baseItemsResults] = await Promise.all([
            variationsQuery,
            baseItemsQuery
        ]);
        let combinedResults = [...itemVariationsResults, ...baseItemsResults];
        // Ensure variant_name exists or provide a fallback for sorting
        combinedResults.sort((a, b) => ((a.variant_name || a.item_name || '').toLowerCase()).localeCompare(((b.variant_name || b.item_name || '').toLowerCase())));
        res.status(200).json({ success: true, data: combinedResults });

    } catch (error) {
        console.error('Error in getItemVariantsForPurchase (OLD):', error);
        res.status(500).json({ success: false, message: 'Server error in getItemVariantsForPurchase (OLD).' });
    }
};


