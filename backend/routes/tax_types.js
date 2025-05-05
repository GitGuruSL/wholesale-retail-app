// backend/routes/tax_types.js
const express = require('express');

/**
 * Creates router for handling tax type related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createTaxTypesRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    // Checks if a tax type is used by any taxes
    const isTaxTypeInUse = async (taxTypeId) => {
        const countResult = await knex('taxes')
                                .where({ tax_type_id: taxTypeId })
                                .count('id as count').first();
        return countResult && countResult.count > 0;
    };

    // GET /api/tax-types - Fetch all tax types
    router.get('/', async (req, res) => {
        try {
            const taxTypes = await knex('tax_types')
                                   .select('id', 'name')
                                   .orderBy('name');
            res.status(200).json(taxTypes);
        } catch (err) {
            console.error("Error fetching tax types:", err);
            res.status(500).json({ message: 'Database error fetching tax types.', error: err.message });
        }
    });

    // GET /api/tax-types/:id - Fetch a single tax type by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid tax type ID.' });
        try {
            const taxType = await knex('tax_types').where({ id: parseInt(id) }).first();
            if (!taxType) return res.status(404).json({ message: `Tax type with ID ${id} not found.` });
            res.status(200).json(taxType);
        } catch (err) {
            console.error(`Error fetching tax type ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching tax type details.', error: err.message });
        }
    });


    // POST /api/tax-types - Create a new tax type
    router.post('/', async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') return res.status(400).json({ message: 'Tax type name is required.' });

        const newTaxType = { name: name.trim() };

        try {
            const [insertedType] = await knex('tax_types').insert(newTaxType).returning('*');
            res.status(201).json(insertedType);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Tax type name "${newTaxType.name}" already exists.`, error: err.detail });
            console.error("Error creating tax type:", err);
            res.status(500).json({ message: 'Database error creating tax type.', error: err.message });
        }
    });

    // PUT /api/tax-types/:id - Update an existing tax type
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid tax type ID.' });
        if (name === undefined) return res.status(400).json({ message: 'Tax type name is required for update.' });
        if (typeof name !== 'string' || name.trim() === '') return res.status(400).json({ message: 'Tax type name must be a non-empty string.' });

        const typeUpdates = { name: name.trim() }; // Only name is updatable here

        try {
            const count = await knex('tax_types').where({ id: parseInt(id) }).update(typeUpdates);
            if (count === 0) {
                const exists = await knex('tax_types').where({ id: parseInt(id) }).first();
                if (!exists) return res.status(404).json({ message: `Tax type with ID ${id} not found.` });
                console.warn(`Tax type ${id} existed but update resulted in 0 rows affected.`);
                res.status(200).json(exists); return;
            }
            const updatedType = await knex('tax_types').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedType);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Tax type name "${typeUpdates.name}" already exists.`, error: err.detail });
            console.error(`Error updating tax type ${id}:`, err);
            res.status(500).json({ message: 'Database error updating tax type.', error: err.message });
        }
    });

    // DELETE /api/tax-types/:id - Delete a tax type
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const typeId = parseInt(id);
        if (isNaN(typeId)) return res.status(400).json({ message: 'Invalid tax type ID.' });

        try {
            // Check for dependencies (taxes using this type)
            const typeUsed = await isTaxTypeInUse(typeId);
            if (typeUsed) return res.status(409).json({ message: 'Conflict: Cannot delete tax type because it is used by existing taxes.' });

            const count = await knex('tax_types').where({ id: typeId }).del();
            if (count === 0) return res.status(404).json({ message: `Tax type with ID ${id} not found.` });
            res.status(204).send(); // Success
        } catch (err) {
             if (err.code === '23503') { // Fallback FK check
                 console.warn(`Attempted to delete tax type ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete tax type due to existing references.', error: err.detail });
             }
            console.error(`Error deleting tax type ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting tax type.', error: err.message });
        }
    });

    return router;
}
module.exports = createTaxTypesRouter;
