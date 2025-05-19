const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const itemUnitConfigController = require('../controllers/itemUnitConfigController');

module.exports = function(knex, authenticateToken, checkPermission) {
    const router = express.Router();

    // --- GET all unit configurations for a specific item ---
    router.get(
        '/',
        authenticateToken,
        checkPermission('item_unit:read'), // Or an appropriate read permission
        [
            query('itemId').notEmpty().isInt({ gt: 0 }).withMessage('Item ID must be a positive integer.')
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { itemId } = req.query;
            try {
                const itemUnits = await knex('item_units')
                    .select(
                        'item_units.id',
                        'item_units.item_id',
                        'item_units.unit_id',
                        'item_units.conversion_factor',
                        'item_units.is_purchase_unit',
                        'item_units.is_sales_unit',
                        'units.name as unit_name', // Get unit name from units table
                        'units.short_name as unit_short_name' // Get unit short_name
                    )
                    .leftJoin('units', 'item_units.unit_id', 'units.id')
                    .where('item_units.item_id', itemId)
                    .orderBy('item_units.id'); // Optional: order them consistently

                res.json(itemUnits);
            } catch (error) {
                console.error(`Error fetching item units for item ID ${itemId}:`, error);
                res.status(500).json({ message: 'Error fetching item units', error: error.message });
            }
        }
    );

    // --- POST (Create) a new item unit configuration ---
    router.post(
        '/',
        authenticateToken,
        checkPermission('item_unit:create'),
        [
            body('item_id').isInt().withMessage('Item ID must be an integer'),
            body('unit_id').isInt().withMessage('Unit ID must be an integer'),
            body('conversion_factor').isFloat({ gt: 0 }).withMessage('Conversion factor must be a positive number'),
            body('is_purchase_unit').optional().isBoolean().toBoolean(),
            body('is_sales_unit').optional().isBoolean().toBoolean(),
        ],
        // itemUnitConfigController.createItemUnitConfig // Use the controller function here
        // If the controller needs knex and it's not self-initialized, you'd adapt how it's called or structured.
        // However, with the controller initializing its own knex (as per the fix above), this direct usage is fine.
        (req, res) => { // Or, if the controller needs knex passed:
            // Create a temporary wrapper if the controller expects knex but doesn't init it itself
            // For now, assuming the controller inits its own knex as per the fix above:
            itemUnitConfigController.createItemUnitConfig(req, res);
        }
    );


    // --- DELETE an item unit configuration ---
    router.delete(
        '/:id',
        authenticateToken,
        checkPermission('item_unit:delete'),
        [param('id').isInt().withMessage('Item unit ID must be an integer')],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            try {
                const { id } = req.params;
                const count = await knex('item_units').where({ id }).del();
                if (count > 0) {
                    res.status(200).json({ message: 'Item unit deleted successfully' });
                } else {
                    res.status(404).json({ message: 'Item unit not found' });
                }
            } catch (error) {
                console.error('Error deleting item unit:', error);
                res.status(500).json({ message: 'Error deleting item unit', error: error.message });
            }
        }
    );

    // ... other routes like PUT if you have them ...

    return router;
};