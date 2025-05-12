const express = require('express');
const { body, validationResult } = require('express-validator');
// const { authenticateToken, checkPermission } = require('../middleware'); // Assuming combined middleware file

function createProductUnitsRouter(knex, authenticateToken, checkPermission) {
    const router = express.Router();

    // POST /api/product-units - Add a new unit configuration to an EXISTING product
    router.post(
        '/',
        authenticateToken,
        checkPermission('product_unit:create'), // Or a more general product:update permission
        [
            body('product_id').isInt({ gt: 0 }).withMessage('Product ID must be a positive integer.'),
            body('unit_id').isInt({ gt: 0 }).withMessage('Unit ID must be a positive integer.'),
            body('conversion_factor').isFloat({ gt: 0 }).withMessage('Conversion factor must be positive.').toFloat(),
            body('is_purchase_unit').optional().isBoolean().toBoolean(),
            body('is_sales_unit').optional().isBoolean().toBoolean(),
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { product_id, unit_id, conversion_factor, is_purchase_unit = false, is_sales_unit = false } = req.body;
            
            try {
                const product = await knex('products').where({ id: product_id }).first();
                if (!product) {
                    return res.status(404).json({ message: `Product with ID ${product_id} not found.` });
                }
                if (!product.base_unit_id) {
                    return res.status(400).json({ message: `Product ${product_id} has no base unit defined.` });
                }

                const existingConfig = await knex('product_units').where({ product_id, unit_id }).first();
                if (existingConfig) {
                    return res.status(409).json({ message: 'This unit is already configured for this product.' });
                }
                
                if (product.base_unit_id === unit_id && conversion_factor !== 1) {
                    return res.status(400).json({ message: 'Conversion factor for the product\'s base unit must be 1.' });
                }

                const [newProductUnit] = await knex('product_units')
                    .insert({
                        product_id,
                        unit_id,
                        base_unit_id: product.base_unit_id, // Store the product's base_unit_id for context
                        conversion_factor,
                        is_purchase_unit,
                        is_sales_unit,
                    })
                    .returning('*'); 

                // Fetch unit name for the response
                const unitDetails = await knex('units').where({id: newProductUnit.unit_id}).first();
                const responseProductUnit = {...newProductUnit, unit_name: unitDetails?.name || 'Unknown Unit'};


                res.status(201).json({ message: 'Unit configuration added successfully.', productUnit: responseProductUnit });

            } catch (error) {
                console.error('Error adding product unit configuration:', error);
                if (error.code === '23503') { // FK violation
                    return res.status(400).json({ message: 'Invalid unit ID or product ID.' });
                }
                res.status(500).json({ message: 'Failed to add unit configuration.' });
            }
        }
    );

    // GET /api/product-units?productId=X - Get all unit configurations for a specific product
    router.get('/', authenticateToken, checkPermission('product_unit:read'), async (req, res) => {
        const { productId } = req.query;
        if (!productId || isNaN(parseInt(productId))) {
            return res.status(400).json({ message: 'Valid Product ID query parameter is required.' });
        }
        const parsedProductId = parseInt(productId);

        try {
            const productUnitsData = await knex('product_units as pu')
                .join('units', 'pu.unit_id', 'units.id')
                .where('pu.product_id', parsedProductId)
                .select(
                    'pu.id', 'pu.product_id', 'pu.unit_id', 'units.name as unit_name', 
                    'units.short_name as unit_short_name', 'pu.base_unit_id as product_base_unit_id_ref',
                    'pu.conversion_factor', 'pu.is_purchase_unit', 'pu.is_sales_unit',
                    'pu.created_at', 'pu.updated_at'
                )
                .orderBy('units.name');
            
            res.status(200).json(productUnitsData); // Send array directly
        } catch (error) {
            console.error('Error fetching product unit configurations:', error);
            res.status(500).json({ message: 'Failed to fetch unit configurations.' });
        }
    });
    
    // PUT /api/product-units/:id - Update an existing unit configuration
    router.put('/:id', authenticateToken, checkPermission('product_unit:update'),
        [ /* Validations for updatable fields */
            body('conversion_factor').optional().isFloat({ gt: 0 }).withMessage('Conversion factor must be positive.').toFloat(),
            body('is_purchase_unit').optional().isBoolean().toBoolean(),
            body('is_sales_unit').optional().isBoolean().toBoolean(),
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

            const { id } = req.params; // This is product_units.id
            const configId = parseInt(id);
            const updatePayload = {};
            if (req.body.hasOwnProperty('conversion_factor')) updatePayload.conversion_factor = req.body.conversion_factor;
            if (req.body.hasOwnProperty('is_purchase_unit')) updatePayload.is_purchase_unit = req.body.is_purchase_unit;
            if (req.body.hasOwnProperty('is_sales_unit')) updatePayload.is_sales_unit = req.body.is_sales_unit;

            if (Object.keys(updatePayload).length === 0) {
                return res.status(400).json({ message: 'No update data provided.' });
            }
            updatePayload.updated_at = knex.fn.now();

            try {
                const existingConfig = await knex('product_units').where({ id: configId }).first();
                if (!existingConfig) return res.status(404).json({ message: 'Unit configuration not found.' });

                const product = await knex('products').where({id: existingConfig.product_id}).first();
                if (!product) return res.status(404).json({ message: 'Associated product not found.' });


                if (updatePayload.hasOwnProperty('conversion_factor') && 
                    existingConfig.unit_id === product.base_unit_id && // Check against product's actual base unit
                    updatePayload.conversion_factor !== 1) {
                     return res.status(400).json({ message: 'Conversion factor for the product\'s base unit must be 1.' });
                }

                const [updatedRecord] = await knex('product_units').where({ id: configId }).update(updatePayload).returning('*');
                const unitDetails = await knex('units').where({id: updatedRecord.unit_id}).first();
                const responseProductUnit = {...updatedRecord, unit_name: unitDetails?.name || 'Unknown Unit'};

                res.status(200).json({ message: 'Unit configuration updated.', productUnit: responseProductUnit });
            } catch (error) {
                console.error('Error updating unit configuration:', error);
                res.status(500).json({ message: 'Failed to update unit configuration.' });
            }
        }
    );

    // DELETE /api/product-units/:id - Delete a specific unit configuration
    router.delete('/:id', authenticateToken, checkPermission('product_unit:delete'), async (req, res) => {
        const { id } = req.params; // This is product_units.id
        const configId = parseInt(id);
        if (isNaN(configId)) return res.status(400).json({ message: 'Invalid configuration ID.' });

        try {
            const configToDelete = await knex('product_units').where({ id: configId }).first();
            if (!configToDelete) return res.status(404).json({ message: 'Unit configuration not found.' });
            
            // Optional: Check if this is the product's base unit itself being deleted from product_units.
            // Generally allowed, as the true base unit is on the `products` table.

            await knex('product_units').where({ id: configId }).del();
            res.status(200).json({ message: 'Unit configuration deleted successfully.' });
        } catch (error) {
            console.error('Error deleting unit configuration:', error);
            res.status(500).json({ message: 'Failed to delete unit configuration.' });
        }
    });

    return router;
}

module.exports = createProductUnitsRouter;