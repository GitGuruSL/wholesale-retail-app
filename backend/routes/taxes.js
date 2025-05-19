// backend/routes/taxes.js
const express = require('express');

/**
 * Creates router for handling specific tax rate API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createTaxesRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    // Checks if a tax is used by any Items
    const isTaxInUse = async (taxId) => {
        const countResult = await knex('Items')
                                .where({ tax_id: taxId })
                                .count('id as count').first();
        return countResult && countResult.count > 0;
    };

    // GET /api/taxes - Fetch all taxes with their type name
    router.get('/', async (req, res) => {
        try {
            const taxes = await knex('taxes')
                                .join('tax_types', 'taxes.tax_type_id', '=', 'tax_types.id')
                                .select(
                                    'taxes.id',
                                    'taxes.name',
                                    'taxes.rate',
                                    'taxes.tax_type_id',
                                    'tax_types.name as tax_type_name' // Include type name
                                )
                                .orderBy('taxes.name');
            res.status(200).json(taxes);
        } catch (err) {
            console.error("Error fetching taxes:", err);
            res.status(500).json({ message: 'Database error fetching taxes.', error: err.message });
        }
    });

    // GET /api/taxes/:id - Fetch a single tax by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid tax ID.' });
        try {
            const tax = await knex('taxes').where({ id: parseInt(id) }).first();
            if (!tax) return res.status(404).json({ message: `Tax with ID ${id} not found.` });
            res.status(200).json(tax);
        } catch (err) {
            console.error(`Error fetching tax ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching tax details.', error: err.message });
        }
    });


    // POST /api/taxes - Create a new tax
    router.post('/', async (req, res) => {
        const { name, rate, tax_type_id } = req.body;

        // Validation
        if (!name || name.trim() === '') return res.status(400).json({ message: 'Tax name is required.' });
        if (rate === undefined || rate === null || isNaN(parseFloat(rate))) return res.status(400).json({ message: 'A valid numeric rate is required.' });
        if (!tax_type_id || isNaN(parseInt(tax_type_id))) return res.status(400).json({ message: 'A valid Tax Type ID is required.' });

        const parsedTypeId = parseInt(tax_type_id);
        const parsedRate = parseFloat(rate);

        const newTax = {
            name: name.trim(),
            rate: parsedRate,
            tax_type_id: parsedTypeId,
            // created_at/updated_at handled by DB defaults
        };

        try {
            // Check if tax_type_id exists
            const typeExists = await knex('tax_types').where({ id: parsedTypeId }).first();
            if (!typeExists) return res.status(400).json({ message: `Tax Type with ID ${parsedTypeId} does not exist.` });

            const [insertedTax] = await knex('taxes').insert(newTax).returning('*');
            res.status(201).json(insertedTax);
        } catch (err) {
            // Handle unique constraint (e.g., name + type_id unique)
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: This tax name might already exist for the selected type.`, error: err.detail });
            // Handle foreign key violation (should be caught above, but good fallback)
            if (err.code === '23503') return res.status(400).json({ message: `Invalid Tax Type ID provided.`, error: err.detail });
            console.error("Error creating tax:", err);
            res.status(500).json({ message: 'Database error creating tax.', error: err.message });
        }
    });

    // PUT /api/taxes/:id - Update an existing tax
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, rate, tax_type_id } = req.body;
        if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid tax ID.' });

        const taxUpdates = { updated_at: new Date() };

        // Validate and add updates if provided
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') return res.status(400).json({ message: 'Tax name must be a non-empty string.' });
            taxUpdates.name = name.trim();
        }
        if (rate !== undefined) {
             if (rate === null || isNaN(parseFloat(rate))) return res.status(400).json({ message: 'A valid numeric rate is required.' });
             taxUpdates.rate = parseFloat(rate);
        }
        if (tax_type_id !== undefined) {
            if (!tax_type_id || isNaN(parseInt(tax_type_id))) return res.status(400).json({ message: 'A valid Tax Type ID must be provided.' });
            const parsedTypeId = parseInt(tax_type_id);
            // Check if new type exists
            const typeExists = await knex('tax_types').where({ id: parsedTypeId }).first();
            if (!typeExists) return res.status(400).json({ message: `Tax Type with ID ${parsedTypeId} does not exist.` });
            taxUpdates.tax_type_id = parsedTypeId;
        }

        if (Object.keys(taxUpdates).length <= 1) {
            const currentTax = await knex('taxes').where({ id: parseInt(id) }).first();
            if (!currentTax) return res.status(404).json({ message: `Tax with ID ${id} not found.` });
            return res.status(200).json(currentTax);
        }

        try {
            const count = await knex('taxes').where({ id: parseInt(id) }).update(taxUpdates);
            if (count === 0) {
                const exists = await knex('taxes').where({ id: parseInt(id) }).first();
                if (!exists) return res.status(404).json({ message: `Tax with ID ${id} not found.` });
                console.warn(`Tax ${id} existed but update resulted in 0 rows affected.`);
                res.status(200).json(exists); return;
            }
            const updatedTax = await knex('taxes').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedTax);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Update violates a unique constraint (e.g., name + type).`, error: err.detail });
            if (err.code === '23503') return res.status(400).json({ message: `Invalid Tax Type ID provided.`, error: err.detail });
            console.error(`Error updating tax ${id}:`, err);
            res.status(500).json({ message: 'Database error updating tax.', error: err.message });
        }
    });

    // DELETE /api/taxes/:id - Delete a tax
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const taxId = parseInt(id);
        if (isNaN(taxId)) return res.status(400).json({ message: 'Invalid tax ID.' });

        try {
            // Check for dependencies (Items using this tax)
            const taxUsed = await isTaxInUse(taxId);
            if (taxUsed) return res.status(409).json({ message: 'Conflict: Cannot delete tax because it is used by Items.' });

            const count = await knex('taxes').where({ id: taxId }).del();
            if (count === 0) return res.status(404).json({ message: `Tax with ID ${id} not found.` });
            res.status(204).send(); // Success
        } catch (err) {
             if (err.code === '23503') { // Fallback FK check
                 console.warn(`Attempted to delete tax ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete tax due to existing references.', error: err.detail });
             }
            console.error(`Error deleting tax ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting tax.', error: err.message });
        }
    });

    return router;
}
module.exports = createTaxesRouter;
