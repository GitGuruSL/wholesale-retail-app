// backend/routes/manufacturers.js
const express = require('express');

/**
 * Creates router for handling manufacturer-related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createManufacturersRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    const isManufacturerInUse = async (manufacturerId) => { /* ... same as before ... */
        const countResult = await knex('Items').where({ manufacturer_id: manufacturerId }).count('id as count').first();
        return countResult && countResult.count > 0;
     };

    // --- Helper: Prepare Data ---
    const prepareManufacturerData = (inputData) => {
        const data = { ...inputData };
        // Fields to nullify if empty
        const fieldsToNullifyIfEmpty = [
            'address', 'city', 'contact_person', 'telephone', 'fax', 'email',
            'relationship_start_date', 'tax_details', 'contact_info'
            // Add others like main_category_id if used
        ];
        // Add numeric/integer/boolean/date fields if they exist in your final schema
        // const numericFields = [];
        // const integerFields = ['main_category_id'];
        const booleanFields = []; // None added in migration example
        const dateFields = ['relationship_start_date'];

        for (const key in data) {
            if (typeof data[key] === 'string') { data[key] = data[key].trim(); }
            if (fieldsToNullifyIfEmpty.includes(key) && data[key] === '') { data[key] = null; }
            // if (numericFields.includes(key) && data[key] !== null) { const parsed = parseFloat(data[key]); data[key] = isNaN(parsed) ? null : parsed; }
            // if (integerFields.includes(key) && data[key] !== null) { const parsed = parseInt(data[key], 10); data[key] = isNaN(parsed) ? null : parsed; }
            if (booleanFields.includes(key)) { data[key] = Boolean(data[key]); }
            if (dateFields.includes(key) && data[key] !== null) { const date = new Date(data[key]); data[key] = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]; }
        }
        delete data.id; delete data.created_at;
        return data;
    };


    // GET /api/manufacturers - Fetch all manufacturers
    router.get('/', async (req, res) => {
        try {
            const manufacturers = await knex('manufacturers')
                                        // Select all new fields
                                        .select('id', 'name', 'address', 'city', 'contact_person', 'telephone', 'fax', 'email', 'relationship_start_date', 'tax_details', 'contact_info')
                                        .orderBy('name');
            res.status(200).json(manufacturers);
        } catch (err) { /* ... error handling ... */
             console.error("Error fetching manufacturers:", err);
             res.status(500).json({ message: 'Database error fetching manufacturers.', error: err.message });
        }
    });

    // GET /api/manufacturers/:id - Fetch a single manufacturer by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid manufacturer ID.' });
        try {
            // Select all fields
            const manufacturer = await knex('manufacturers').where({ id: parseInt(id) }).first();
            if (!manufacturer) return res.status(404).json({ message: `Manufacturer with ID ${id} not found.` });
            res.status(200).json(manufacturer);
        } catch (err) { /* ... error handling ... */
             console.error(`Error fetching manufacturer ${id}:`, err);
             res.status(500).json({ message: 'Database error fetching manufacturer details.', error: err.message });
        }
    });


    // POST /api/manufacturers - Create a new manufacturer
    router.post('/', async (req, res) => {
        if (!req.body.name || req.body.name.trim() === '') {
            return res.status(400).json({ message: 'Manufacturer name is required.' });
        }
        const preparedData = prepareManufacturerData(req.body);
        const newManufacturerData = { ...preparedData };

        try {
            // Add FK checks if needed (e.g., main_category_id)
            const [insertedManufacturer] = await knex('manufacturers').insert(newManufacturerData).returning('*');
            res.status(201).json(insertedManufacturer);
        } catch (err) { /* ... error handling ... */
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Manufacturer name or other unique field already exists.`, error: err.detail });
            // Add FK error check if needed
            console.error("Error creating manufacturer:", err);
            res.status(500).json({ message: 'Database error creating manufacturer.', error: err.message });
        }
    });

    // PUT /api/manufacturers/:id - Update an existing manufacturer
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid manufacturer ID.' });

        const preparedData = prepareManufacturerData(req.body);
        const manufacturerUpdates = { ...preparedData, updated_at: new Date() };

        if (Object.keys(manufacturerUpdates).length <= 1) { /* ... handle no change ... */
             const current = await knex('manufacturers').where({ id: parseInt(id) }).first();
             if (!current) return res.status(404).json({ message: `Manufacturer with ID ${id} not found.` });
             return res.status(200).json(current);
        }

        try {
            // Add FK checks if needed (e.g., main_category_id)
            const count = await knex('manufacturers').where({ id: parseInt(id) }).update(manufacturerUpdates);
            if (count === 0) { /* ... handle no rows affected ... */
                const exists = await knex('manufacturers').where({ id: parseInt(id) }).first();
                if (!exists) return res.status(404).json({ message: `Manufacturer with ID ${id} not found.` });
                console.warn(`Manufacturer ${id} existed but update resulted in 0 rows affected.`);
                res.status(200).json(exists); return;
            }
            const updatedManufacturer = await knex('manufacturers').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedManufacturer);
        } catch (err) { /* ... error handling ... */
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Update violates unique constraint (e.g., name).`, error: err.detail });
            // Add FK error check if needed
            console.error(`Error updating manufacturer ${id}:`, err);
            res.status(500).json({ message: 'Database error updating manufacturer.', error: err.message });
        }
    });

    // DELETE /api/manufacturers/:id - Delete a manufacturer
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const manufacturerId = parseInt(id);
        if (isNaN(manufacturerId)) return res.status(400).json({ message: 'Invalid manufacturer ID.' });

        try {
            const manufacturerUsed = await isManufacturerInUse(manufacturerId);
            if (manufacturerUsed) return res.status(409).json({ message: 'Conflict: Cannot delete manufacturer because it is used by Items.' });

            const count = await knex('manufacturers').where({ id: manufacturerId }).del();
            if (count === 0) return res.status(404).json({ message: `Manufacturer with ID ${id} not found.` });
            res.status(204).send(); // Success
        } catch (err) { /* ... error handling ... */
             if (err.code === '23503') { console.warn(`Attempted to delete manufacturer ${id} with existing references (FK violation).`); return res.status(409).json({ message: 'Conflict: Cannot delete manufacturer due to existing references.', error: err.detail }); }
            console.error(`Error deleting manufacturer ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting manufacturer.', error: err.message });
        }
    });

    return router;
}
module.exports = createManufacturersRouter;
