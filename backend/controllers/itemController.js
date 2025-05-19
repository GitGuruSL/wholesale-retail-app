const knex = require('../db/knex'); // Adjust path if needed
const {
    prepareItemData,
    processItemUnits, // Ensure this is imported
    processAttributesAndVariations
} = require('../utils/ItemDataProcessors');

// --- Create Item ---
exports.createItem = async (req, res) => {
    const { item_units_config, attributes_config, variations_data, item_images, ...mainItemDataFromPayload } = req.body;
    let newItemId;

    // Use a transaction
    const trx = await knex.transaction();
    try {
        // Validate that item_units_config is provided and not empty
        if (!item_units_config || !Array.isArray(item_units_config) || item_units_config.length === 0) {
            return res.status(400).json({ message: 'Item must have at least one unit configuration.' });
        }

        // Prepare main item data using the utility function if it handles defaults, slug generation etc.
        const preparedMainItemData = prepareItemData(mainItemDataFromPayload);

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
        if (trx.isCompleted && !trx.isCompleted()) { 
          await trx.rollback();
        }
        console.error('Error creating item:', error);
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Failed to create item';
        res.status(500).json({ message: 'Failed to create item', error: errorMessage });
    }
};

// --- Update Item ---
exports.updateItem = async (req, res) => {
    const { id } = req.params;
    const {
        item_units_config,
        attributes_config, 
        variations_data,   
        store_id,          
        ...itemDataFromPayload
    } = req.body;

    // Validate that item_units_config, if provided for update, is not an empty array
    // If item_units_config is undefined, it means units are not being updated, which is fine.
    // But if it's provided as an empty array, it implies an attempt to remove all units,
    // which we want to prevent if the rule is "must have at least one unit".
    if (item_units_config && Array.isArray(item_units_config) && item_units_config.length === 0) {
        return res.status(400).json({ message: 'Item must have at least one unit configuration. Cannot remove all units.' });
    }


    const trx = await knex.transaction();
    try {
        const preparedItemData = prepareItemData(itemDataFromPayload); 

        // 1. Update main item details
        const updatedItemCount = await trx('items')
            .where({ id: parseInt(id) })
            .update({
                ...preparedItemData,
                updated_at: knex.fn.now(),
            });

        if (updatedItemCount === 0) {
            await trx.rollback();
            return res.status(404).json({ message: 'Item not found or no changes made to item data.' });
        }

        // 2. Process item units
        // If item_units_config is provided (and not empty, due to check above), process them.
        // If item_units_config is undefined, existing units are untouched.
        if (item_units_config !== undefined) { 
            // The check above ensures item_units_config is not an empty array if it's provided.
            // So, if it's not undefined here, it's a non-empty array.
            await processItemUnits(parseInt(id), item_units_config, trx);
        }

        // 3. Process attributes and variations if item_type is 'Variable'
        // Ensure you get the item_type, either from preparedItemData or fetch the item
        const currentItem = await trx('items').where({id: parseInt(id)}).first(); 

        if (currentItem && currentItem.item_type === 'Variable') {
            // If it's a variable item, attributes_config and variations_data from the payload
            // define the desired state of its attributes and variations.
            // To properly manage variations (add, update, DELETE), both should ideally be provided,
            // representing the complete new state.
            if (attributes_config !== undefined && variations_data !== undefined) {
                // The processAttributesAndVariations function is responsible for:
                // - Creating new attributes/variations.
                // - Updating existing attributes/variations.
                // - CRITICALLY: Deleting attributes/variations that are in the DB 
                //   but NOT present in the provided attributes_config/variations_data arrays.
                //   This is essential for the "delete" functionality on the frontend to work.
                const storeIdForStock = preparedItemData.store_id || currentItem.store_id; 
                if (!storeIdForStock) {
                    console.warn(`[itemController.js updateItem] store_id is not available for item ${id}. Stock for variations might not be created if required by processAttributesAndVariations.`);
                }
                await processAttributesAndVariations( 
                    trx,
                    parseInt(id),
                    attributes_config,
                    variations_data,
                    storeIdForStock 
                );
            } else {
                // If attributes_config or variations_data is undefined, variation processing is skipped.
                // The frontend must send both arrays (even if one is empty or unchanged)
                // when intending to modify the item's variable structure.
                let missingParts = [];
                if (attributes_config === undefined) missingParts.push('attributes_config');
                if (variations_data === undefined) missingParts.push('variations_data');
                console.log(`[itemController.js updateItem] Item ${id} is Variable. The following parts were not provided in the payload: ${missingParts.join(', ')}. Skipping variation/attribute processing.`);
            }
        }


        await trx.commit();
        const finalUpdatedItem = await exports.getItemByIdForResponse(parseInt(id));
        res.status(200).json(finalUpdatedItem);

    } catch (error) {
        await trx.rollback();
        console.error(`Error updating item with ID ${id}:`, error);
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Failed to update item';
        res.status(500).json({ message: 'Failed to update item', error: errorMessage });
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
        // Basic query, you'll want to add pagination, filtering, sorting, searching
        const items = await knex('items')
            .select(
                'items.id', 'items.item_name', 'items.sku', 'items.item_barcode', 'items.retail_price', 'items.is_active', 'items.item_type',
                'categories.name as category_name',
                'brands.name as brand_name',
                'units.name as base_unit_name'
                // Add other fields or joins as needed for the list view
            )
            .leftJoin('categories', 'items.category_id', 'categories.id')
            .leftJoin('brands', 'items.brand_id', 'brands.id')
            .leftJoin('units', 'items.base_unit_id', 'units.id')
            .orderBy('items.id', 'desc'); // Example ordering

        // Example: Get total count for pagination
        const totalCountResult = await knex('items').count('id as total').first();
        const totalCount = totalCountResult ? totalCountResult.total : 0;

        res.json({
            items,
            totalCount, // For pagination
            // currentPage, totalPages, etc.
        });
    } catch (error) {
        console.error('Error fetching all items:', error);
        res.status(500).json({ message: 'Error fetching items', error: error.message });
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

            // 5. Delete item_attribute_config_values
            // This subquery approach is correct for item_attribute_configs.
            await trx('item_attribute_config_values').whereIn('attribute_config_id', function() {
                this.select('id').from('item_attribute_configs').where('item_id', parseInt(id));
            }).del();

            // 6. Then delete item_attribute_configs
            await trx('item_attribute_configs').where({ item_id: parseInt(id) }).del();
            
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
        }); // Transaction commits on success, rolls back on error or explicit rollback.
    } catch (error) {
        // The transaction should have already rolled back if an error occurred within it.
        console.error(`Error deleting item with ID ${id}:`, error);
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
};

// DO NOT PUT ROUTER DEFINITIONS OR `module.exports = router;` HERE ANYMORE