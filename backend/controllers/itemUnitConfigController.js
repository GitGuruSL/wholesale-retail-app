const knex = require('../db/knex'); // Ensure this path is correct

// Get all unit configurations for a specific item
exports.getItemUnitConfigsByItemId = async (req, res) => {
    const { itemId } = req.query;
    if (!itemId || isNaN(parseInt(itemId))) {
        return res.status(400).json({ message: "A valid Item ID is required to fetch unit configurations." });
    }
    try {
        const parsedItemId = parseInt(itemId, 10);
        const configs = await knex('item_units')
            .select(
                'item_units.*',
                'units.name as unit_name' // Removed units.short_name
            )
            .leftJoin('units', 'item_units.unit_id', 'units.id')
            .where('item_units.item_id', parsedItemId)
            .orderBy('item_units.is_base_unit', 'desc')
            .orderBy('item_units.conversion_factor');

        res.status(200).json(configs);
    } catch (error) {
        console.error('Error fetching item unit configurations:', error);
        res.status(500).json({ message: 'Failed to fetch item unit configurations', error: error.message });
    }
};

// Create a new item unit configuration
exports.createItemUnitConfig = async (req, res) => {
    const {
        item_id,
        unit_id,
        conversion_factor,
        is_purchase_unit,
        is_sales_unit
    } = req.body;

    // --- 1. Basic Validation & Parsing ---
    if (item_id === undefined || unit_id === undefined) {
        return res.status(400).json({
            message: 'Missing required fields. item_id and unit_id are required.'
        });
    }

    const parsedItemId = parseInt(item_id, 10);
    const parsedUnitId = parseInt(unit_id, 10);
    let parsedConversionFactor = conversion_factor !== undefined ? parseFloat(conversion_factor) : undefined;

    if (isNaN(parsedItemId) || isNaN(parsedUnitId) || (conversion_factor !== undefined && isNaN(parsedConversionFactor))) {
        return res.status(400).json({ message: 'Invalid numeric value for item_id, unit_id, or conversion_factor.' });
    }
    if (conversion_factor !== undefined && parsedConversionFactor <= 0) {
        return res.status(400).json({ message: 'Conversion factor must be a positive number.' });
    }

    try {
        // --- 2. Check for duplicate unit configuration for the same item ---
        const duplicateUnitEntry = await knex('item_units')
            .where({ item_id: parsedItemId, unit_id: parsedUnitId })
            .first();

        if (duplicateUnitEntry) {
            return res.status(409).json({ message: `Unit ID ${parsedUnitId} is already configured for item ID ${parsedItemId}.` });
        }

        // --- 3. Determine base unit status and related fields ---
        const existingItemUnits = await knex('item_units')
            .where({ item_id: parsedItemId })
            .select('unit_id', 'is_base_unit')
            .orderBy('created_at');

        const currentBaseUnitForThisItem = existingItemUnits.find(iu => iu.is_base_unit);

        let actual_is_base_unit;
        let actual_base_unit_id;
        let actual_conversion_factor;

        if (!currentBaseUnitForThisItem) {
            actual_is_base_unit = true;
            actual_base_unit_id = parsedUnitId;
            actual_conversion_factor = 1.0;
            if (parsedConversionFactor !== undefined && parsedConversionFactor !== 1.0) {
                console.warn(`Attempted to set conversion factor ${parsedConversionFactor} for a new base unit (item ${parsedItemId}, unit ${parsedUnitId}). Forcing to 1.0.`);
            }
        } else {
            actual_is_base_unit = false;
            actual_base_unit_id = currentBaseUnitForThisItem.unit_id;
            if (parsedConversionFactor === undefined) {
                 return res.status(400).json({ message: 'Conversion factor is required for non-base units.' });
            }
            actual_conversion_factor = parsedConversionFactor;

            if (parsedUnitId === currentBaseUnitForThisItem.unit_id) {
                return res.status(400).json({ message: `Unit ID ${parsedUnitId} is already the base unit. Cannot add as a non-base unit.` });
            }
        }

        // --- 4. Prepare data for insertion ---
        const newItemUnitData = {
            item_id: parsedItemId,
            unit_id: parsedUnitId,
            base_unit_id: actual_base_unit_id,
            conversion_factor: actual_conversion_factor,
            is_purchase_unit: is_purchase_unit === true,
            is_sales_unit: is_sales_unit === true,
            is_base_unit: actual_is_base_unit,
        };

        // --- 5. Insert into database ---
        const [createdConfig] = await knex('item_units')
            .insert(newItemUnitData)
            .returning('*');

        // --- 6. Fetch unit details for the response ---
        const unitDetails = await knex('units')
            .where({ id: createdConfig.unit_id })
            .select('name as unit_name') // Removed 'short_name as unit_short_name'
            .first();

        res.status(201).json({
            ...createdConfig,
            unit_name: unitDetails?.unit_name // Removed unit_short_name
        });

    } catch (error) {
        console.error('Error creating item unit configuration in controller:', error);
        let detailedError = 'Failed to create item unit configuration.';
        if (process.env.NODE_ENV === 'development') {
            detailedError = error.detail || error.message || detailedError;
            if (error.column) {
                detailedError += ` Problem with column: ${error.column}.`;
            }
        }
        res.status(500).json({
            message: 'Error creating item unit',
            error: detailedError
        });
    }
};

// Delete an item unit configuration
exports.deleteItemUnitConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseInt(id, 10);

        if (isNaN(parsedId)) {
            return res.status(400).json({ message: "Invalid ID format for unit configuration." });
        }

        const unitToDelete = await knex('item_units').where({ id: parsedId }).first();

        if (!unitToDelete) {
            return res.status(404).json({ message: 'Item unit configuration not found.' });
        }

        if (unitToDelete.is_base_unit) {
            const dependentUnits = await knex('item_units')
                .where({ item_id: unitToDelete.item_id })
                .andWhereNot({ id: parsedId })
                .count('* as count')
                .first();

            if (dependentUnits && parseInt(dependentUnits.count, 10) > 0) {
                return res.status(400).json({ message: 'Cannot delete base unit. Other unit configurations depend on it. Please reassign the base unit first or delete dependent units.' });
            }
        }

        const deletedCount = await knex('item_units')
            .where({ id: parsedId })
            .del();

        if (deletedCount === 0) {
            return res.status(404).json({ message: 'Item unit configuration not found or already deleted.' });
        }

        res.status(200).json({ message: 'Item unit configuration deleted successfully.' });
    } catch (error) {
        console.error('Error deleting item unit config:', error);
        res.status(500).json({ message: 'Failed to delete item unit configuration', error: error.message });
    }
};

// (Optional) Update an item unit configuration - if needed
// exports.updateItemUnitConfig = async (req, res) => { ... }