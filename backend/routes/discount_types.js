// backend/routes/discount_types.js
const express = require('express');

/**
 * Creates router for handling discount type related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createDiscountTypesRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    // Checks if a discount type is used by any products
    const isDiscountTypeInUse = async (typeId) => {
        const countResult = await knex('products')
                                .where({ discount_type_id: typeId })
                                .count('id as count').first();
        return countResult && countResult.count > 0;
    };

    // GET /api/discount-types - Fetch all discount types
    router.get('/', async (req, res) => {
        try {
            const discountTypes = await knex('discount_types')
                                        .select('id', 'name')
                                        .orderBy('name');
            res.status(200).json(discountTypes);
        } catch (err) {
            console.error("Error fetching discount types:", err);
            res.status(500).json({ message: 'Database error fetching discount types.', error: err.message });
        }
    });

    // GET /api/discount-types/:id - Fetch a single discount type by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid discount type ID.' });
        try {
            const discountType = await knex('discount_types').where({ id: parseInt(id) }).first();
            if (!discountType) return res.status(404).json({ message: `Discount type with ID ${id} not found.` });
            res.status(200).json(discountType);
        } catch (err) {
            console.error(`Error fetching discount type ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching discount type details.', error: err.message });
        }
    });


    // POST /api/discount-types - Create a new discount type
    router.post('/', async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') return res.status(400).json({ message: 'Discount type name is required.' });

        const newDiscountType = { name: name.trim() };

        try {
            const [insertedType] = await knex('discount_types').insert(newDiscountType).returning('*');
            res.status(201).json(insertedType);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Discount type name "${newDiscountType.name}" already exists.`, error: err.detail });
            console.error("Error creating discount type:", err);
            res.status(500).json({ message: 'Database error creating discount type.', error: err.message });
        }
    });

    // PUT /api/discount-types/:id - Update an existing discount type
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid discount type ID.' });
        if (name === undefined) return res.status(400).json({ message: 'Discount type name is required for update.' });
        if (typeof name !== 'string' || name.trim() === '') return res.status(400).json({ message: 'Discount type name must be a non-empty string.' });

        const typeUpdates = { name: name.trim() }; // Only name is updatable here

        try {
            const count = await knex('discount_types').where({ id: parseInt(id) }).update(typeUpdates);
            if (count === 0) {
                const exists = await knex('discount_types').where({ id: parseInt(id) }).first();
                if (!exists) return res.status(404).json({ message: `Discount type with ID ${id} not found.` });
                console.warn(`Discount type ${id} existed but update resulted in 0 rows affected.`);
                res.status(200).json(exists); return;
            }
            const updatedType = await knex('discount_types').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedType);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Discount type name "${typeUpdates.name}" already exists.`, error: err.detail });
            console.error(`Error updating discount type ${id}:`, err);
            res.status(500).json({ message: 'Database error updating discount type.', error: err.message });
        }
    });

    // DELETE /api/discount-types/:id - Delete a discount type
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const typeId = parseInt(id);
        if (isNaN(typeId)) return res.status(400).json({ message: 'Invalid discount type ID.' });

        try {
            // Check for dependencies
            const typeUsed = await isDiscountTypeInUse(typeId);
            if (typeUsed) return res.status(409).json({ message: 'Conflict: Cannot delete discount type because it is used by products.' });

            const count = await knex('discount_types').where({ id: typeId }).del();
            if (count === 0) return res.status(404).json({ message: `Discount type with ID ${id} not found.` });
            res.status(204).send(); // Success
        } catch (err) {
             if (err.code === '23503') { // Fallback FK check
                 console.warn(`Attempted to delete discount type ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete discount type due to existing references.', error: err.detail });
             }
            console.error(`Error deleting discount type ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting discount type.', error: err.message });
        }
    });

    return router;
}
module.exports = createDiscountTypesRouter;
