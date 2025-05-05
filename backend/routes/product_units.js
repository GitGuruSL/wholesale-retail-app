// backend/routes/product_units.js
const express = require('express');

/**
 * Creates router for handling product-specific unit configurations.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createProductUnitsRouter(knex) {
    const router = express.Router();

    // GET /api/product-units?product_id=... - Fetch unit configurations for a specific product
    // GET /api/product-units - Fetch all configurations (less common)
    router.get('/', async (req, res) => {
        const { product_id } = req.query; // Get product_id from query parameter

        try {
            let query = knex('product_units')
                .join('units as unit', 'product_units.unit_id', 'unit.id') // Join for the unit name
                .join('units as base_unit', 'product_units.base_unit_id', 'base_unit.id') // Join for the base unit name
                .join('products', 'product_units.product_id', 'products.id') // Join for product name
                .select(
                    'product_units.id',
                    'product_units.product_id',
                    'products.product_name', // Include product name
                    'product_units.unit_id',
                    'unit.name as unit_name', // Alias for clarity
                    'product_units.base_unit_id',
                    'base_unit.name as base_unit_name', // Alias for clarity
                    'product_units.conversion_factor',
                    'product_units.is_purchase_unit',
                    'product_units.is_sales_unit'
                    // Add prices here if included in the table
                );

            // Filter by product_id if provided
            if (product_id) {
                 if (isNaN(parseInt(product_id))) {
                      return res.status(400).json({ message: 'Invalid product_id query parameter.' });
                 }
                query = query.where('product_units.product_id', parseInt(product_id));
            }

            const productUnits = await query.orderBy(['products.product_name', 'unit.name']); // Order results

            res.status(200).json(productUnits);
        } catch (err) {
            console.error("Error fetching product units:", err);
            res.status(500).json({ message: 'Database error fetching product units.', error: err.message });
        }
    });

    // GET /api/product-units/:id - Fetch a single product unit configuration by its own ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid product unit configuration ID.' });
        }
        try {
            const productUnit = await knex('product_units').where({ id: parseInt(id) }).first();
            if (!productUnit) {
                return res.status(404).json({ message: `Product unit configuration with ID ${id} not found.` });
            }
            res.status(200).json(productUnit);
        } catch (err) {
            console.error(`Error fetching product unit config ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching product unit configuration.', error: err.message });
        }
    });


    // POST /api/product-units - Create a new product unit configuration
    router.post('/', async (req, res) => {
        const {
            product_id,
            unit_id,
            // base_unit_id, // We should fetch this from the product itself
            conversion_factor,
            is_purchase_unit,
            is_sales_unit
        } = req.body;

        // --- Validation ---
        if (!product_id || isNaN(parseInt(product_id))) return res.status(400).json({ message: 'Valid Product ID is required.' });
        if (!unit_id || isNaN(parseInt(unit_id))) return res.status(400).json({ message: 'Valid Unit ID is required.' });
        if (conversion_factor === undefined || conversion_factor === null || isNaN(parseFloat(conversion_factor)) || parseFloat(conversion_factor) <= 0) {
            return res.status(400).json({ message: 'A valid positive Conversion Factor is required.' });
        }

        const productId = parseInt(product_id);
        const unitId = parseInt(unit_id);
        const factor = parseFloat(conversion_factor);

        try {
            // --- Fetch Product and Unit Info for Validation ---
            const product = await knex('products').select('id', 'base_unit_id').where({ id: productId }).first();
            if (!product) return res.status(404).json({ message: `Product with ID ${productId} not found.` });

            const unit = await knex('units').select('id').where({ id: unitId }).first();
            if (!unit) return res.status(404).json({ message: `Unit with ID ${unitId} not found.` });

            // Cannot link a product's base unit to itself with factor != 1 in product_units
            if (unitId === product.base_unit_id && factor !== 1) {
                 return res.status(400).json({ message: `Conversion factor must be 1 when linking a product's base unit (${product.base_unit_id}) to itself.` });
            }

            const newProductUnit = {
                product_id: productId,
                unit_id: unitId,
                base_unit_id: product.base_unit_id, // Use the base unit defined on the product
                conversion_factor: factor,
                is_purchase_unit: is_purchase_unit !== undefined ? Boolean(is_purchase_unit) : false, // Default flags
                is_sales_unit: is_sales_unit !== undefined ? Boolean(is_sales_unit) : false,
            };

            const [insertedConfig] = await knex('product_units').insert(newProductUnit).returning('*');
            res.status(201).json(insertedConfig);

        } catch (err) {
            // Handle unique constraint violation (product_id, unit_id)
            if (err.code === '23505') {
                return res.status(409).json({ message: `Conflict: This unit configuration already exists for this product.`, error: err.detail });
            }
             // Handle foreign key violations
             if (err.code === '23503') {
                 // Could be product_id, unit_id, or base_unit_id FK constraint
                 return res.status(400).json({ message: `Invalid Product ID, Unit ID, or Base Unit ID provided.`, error: err.detail });
             }
            console.error("Error creating product unit configuration:", err);
            res.status(500).json({ message: 'Database error creating product unit configuration.', error: err.message });
        }
    });

    // PUT /api/product-units/:id - Update an existing product unit configuration
    router.put('/:id', async (req, res) => {
        const { id } = req.params; // ID of the product_units record itself
        const {
            // product_id, unit_id, base_unit_id // Usually shouldn't change these links
            conversion_factor,
            is_purchase_unit,
            is_sales_unit
        } = req.body;

         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid product unit configuration ID.' });
        }

        const updates = { updated_at: new Date() };
        let factor = null; // To store parsed factor for validation

        // Validate and add updates
        if (conversion_factor !== undefined) {
             if (conversion_factor === null || isNaN(parseFloat(conversion_factor)) || parseFloat(conversion_factor) <= 0) {
                 return res.status(400).json({ message: 'A valid positive Conversion Factor is required.' });
             }
             factor = parseFloat(conversion_factor);
             updates.conversion_factor = factor;
        }
        if (is_purchase_unit !== undefined) updates.is_purchase_unit = Boolean(is_purchase_unit);
        if (is_sales_unit !== undefined) updates.is_sales_unit = Boolean(is_sales_unit);

        if (Object.keys(updates).length <= 1) {
             // Fetch and return current data if only updated_at would be changed
             const currentConfig = await knex('product_units').where({ id: parseInt(id) }).first();
             if (!currentConfig) return res.status(404).json({ message: `Configuration with ID ${id} not found.` });
             return res.status(200).json(currentConfig);
        }

        try {
            // --- Validation before update ---
            const currentConfig = await knex('product_units').where({ id: parseInt(id) }).first();
            if (!currentConfig) return res.status(404).json({ message: `Configuration with ID ${id} not found.` });

            // If factor is being updated, re-check base unit consistency
            if (factor !== null) {
                 if (currentConfig.unit_id === currentConfig.base_unit_id && factor !== 1) {
                      return res.status(400).json({ message: `Conversion factor must be 1 when linking a product's base unit (${currentConfig.base_unit_id}) to itself.` });
                 }
            }
            // Add other validation if needed (e.g., cannot make base unit non-purchasable?)


            const count = await knex('product_units').where({ id: parseInt(id) }).update(updates);

            if (count === 0) {
                 // Already checked existence, likely identical data
                 console.warn(`Product unit config ${id} existed but update resulted in 0 rows affected.`);
                 res.status(200).json(currentConfig);
                 return;
            }

            // Fetch the updated record (join again for names)
            const updatedConfig = await knex('product_units')
                .join('units as unit', 'product_units.unit_id', 'unit.id')
                .join('units as base_unit', 'product_units.base_unit_id', 'base_unit.id')
                .join('products', 'product_units.product_id', 'products.id')
                .select(
                    'product_units.*', // Select all from product_units
                    'products.product_name',
                    'unit.name as unit_name',
                    'base_unit.name as base_unit_name'
                )
                .where('product_units.id', parseInt(id))
                .first();

            res.status(200).json(updatedConfig);

        } catch (err) {
            // Handle potential constraint violations (less likely on update unless changing FKs, which we aren't here)
             if (err.code === '23505') {
                return res.status(409).json({ message: `Conflict: Update violates a unique constraint.`, error: err.detail });
            }
             if (err.code === '23503') {
                 return res.status(400).json({ message: `Invalid reference ID during update.`, error: err.detail });
             }
            console.error(`Error updating product unit config ${id}:`, err);
            res.status(500).json({ message: 'Database error updating product unit configuration.', error: err.message });
        }
    });

    // DELETE /api/product-units/:id - Delete a product unit configuration
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid product unit configuration ID.' });
        }

        try {
            // Add dependency checks if needed (e.g., if this config is used in active orders/stock somehow)
            // Usually, deleting the config is okay if the base stock is tracked separately.

            const count = await knex('product_units').where({ id: parseInt(id) }).del();

            if (count === 0) {
                return res.status(404).json({ message: `Product unit configuration with ID ${id} not found.` });
            }

            res.status(204).send(); // Success

        } catch (err) {
             // Handle FK issues if other tables directly reference product_units.id
             if (err.code === '23503') {
                 return res.status(409).json({ message: 'Conflict: Cannot delete configuration due to existing references.', error: err.detail });
             }
            console.error(`Error deleting product unit config ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting product unit configuration.', error: err.message });
        }
    });

    return router;
}
module.exports = createProductUnitsRouter;
