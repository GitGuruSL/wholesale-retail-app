// backend/routes/warranties.js
const express = require('express');

/**
 * Creates router for handling warranty-related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createWarrantiesRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    const isWarrantyInUse = async (warrantyId) => {
        const countResult = await knex('items')
                                .where({ warranty_id: warrantyId })
                                .count('id as count').first();
        return countResult && countResult.count > 0;
    };

    // GET /api/warranties - Fetch all warranties (with dynamic filtering)
    router.get('/', async (req, res) => {
        try {
            const query = knex('warranties')
                .select(
                    'id',
                    'name',
                    'duration_months',
                    'description'
                );

            // --- DYNAMIC FILTERING ---
            const allowedFields = [
                'id', 'name', 'duration_months', 'description'
            ];
            for (const key in req.query) {
                const match = key.match(/^(\w+)\[(\w+)\]$/);
                if (match && allowedFields.includes(match[1])) {
                    const field = match[1];
                    const operator = match[2];
                    const value = req.query[key];

                    let column = `warranties.${field}`;

                    if (operator === 'contains') {
                        query.whereILike(column, `%${value}%`);
                    } else if (operator === 'equals' || operator === 'eq') {
                        query.where(column, value);
                    } else if (operator === 'gt') {
                        query.where(column, '>', value);
                    } else if (operator === 'lt') {
                        query.where(column, '<', value);
                    } else if (operator === 'notEquals') {
                        query.whereNot(column, value);
                    }
                }
            }

            query.orderBy('warranties.name');
            const warranties = await query;
            res.json(warranties);
        } catch (err) {
            console.error("Error fetching warranties:", err);
            res.status(500).json({ message: 'Database error fetching warranties.', error: err.message });
        }
    });

    // GET /api/warranties/:id - Fetch a single warranty by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid warranty ID.' });
        try {
            const warranty = await knex('warranties').where({ id: parseInt(id) }).first();
            if (!warranty) return res.status(404).json({ message: `Warranty with ID ${id} not found.` });
            res.status(200).json(warranty);
        } catch (err) {
            console.error(`Error fetching warranty ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching warranty details.', error: err.message });
        }
    });


    // POST /api/warranties - Create a new warranty
    router.post('/', async (req, res) => {
        const { name, duration_months, description } = req.body;

        if (!name || name.trim() === '') return res.status(400).json({ message: 'Warranty name is required.' });

        // Validate duration_months if provided
        let parsedDuration = null;
        if (duration_months !== undefined && duration_months !== null && duration_months !== '') {
             if (isNaN(parseInt(duration_months)) || parseInt(duration_months) < 0) {
                 return res.status(400).json({ message: 'Duration (Months) must be a non-negative integer.' });
             }
             parsedDuration = parseInt(duration_months, 10);
        }


        const newWarranty = {
            name: name.trim(),
            duration_months: parsedDuration, // Use parsed value or null
            description: typeof description === 'string' ? (description.trim() || null) : null,
            // created_at/updated_at handled by DB defaults
        };

        try {
            const [insertedWarranty] = await knex('warranties').insert(newWarranty).returning('*');
            res.status(201).json(insertedWarranty);
        } catch (err) {
            // Handle potential unique constraint violation on 'name' if set
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Warranty name "${newWarranty.name}" might already exist.`, error: err.detail });
            console.error("Error creating warranty:", err);
            res.status(500).json({ message: 'Database error creating warranty.', error: err.message });
        }
    });

    // PUT /api/warranties/:id - Update an existing warranty
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, duration_months, description } = req.body;
        if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid warranty ID.' });

        const warrantyUpdates = { updated_at: new Date() };

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') return res.status(400).json({ message: 'Warranty name must be a non-empty string.' });
            warrantyUpdates.name = name.trim();
        }
        if (duration_months !== undefined) {
             if (duration_months === null || duration_months === '') {
                 warrantyUpdates.duration_months = null;
             } else if (isNaN(parseInt(duration_months)) || parseInt(duration_months) < 0) {
                 return res.status(400).json({ message: 'Duration (Months) must be a non-negative integer or empty.' });
             } else {
                 warrantyUpdates.duration_months = parseInt(duration_months, 10);
             }
        }
        if (description !== undefined) {
             warrantyUpdates.description = typeof description === 'string' ? (description.trim() || null) : null;
        }


         if (Object.keys(warrantyUpdates).length <= 1) {
             const currentWarranty = await knex('warranties').where({ id: parseInt(id) }).first();
              if (!currentWarranty) return res.status(404).json({ message: `Warranty with ID ${id} not found.` });
              return res.status(200).json(currentWarranty);
         }

        try {
            const count = await knex('warranties').where({ id: parseInt(id) }).update(warrantyUpdates);
            if (count === 0) {
                const exists = await knex('warranties').where({ id: parseInt(id) }).first();
                if (!exists) return res.status(404).json({ message: `Warranty with ID ${id} not found.` });
                console.warn(`Warranty ${id} existed but update resulted in 0 rows affected.`);
                res.status(200).json(exists); return;
            }
            const updatedWarranty = await knex('warranties').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedWarranty);
        } catch (err) {
            if (err.code === '23505' && warrantyUpdates.name) return res.status(409).json({ message: `Conflict: Warranty name "${warrantyUpdates.name}" might already exist.`, error: err.detail });
            console.error(`Error updating warranty ${id}:`, err);
            res.status(500).json({ message: 'Database error updating warranty.', error: err.message });
        }
    });

    // DELETE /api/warranties/:id - Delete a warranty
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            // Check if warranty is in use
            if (await isWarrantyInUse(id)) {
                return res.status(400).json({ message: 'Cannot delete warranty: it is used by one or more items.' });
            }
            // Proceed to delete
            await knex('warranties').where({ id }).del();
            res.json({ message: 'Warranty deleted successfully.' });
        } catch (err) {
            console.error("Error deleting warranty:", err);
            res.status(500).json({ message: 'Database error deleting warranty.', error: err.message });
        }
    });

    return router;
}
module.exports = createWarrantiesRouter;
