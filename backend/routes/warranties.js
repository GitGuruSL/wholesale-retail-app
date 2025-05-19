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
    // Checks if a warranty is used by any Items
    const isWarrantyInUse = async (warrantyId) => {
        const countResult = await knex('Items')
                                .where({ warranty_id: warrantyId })
                                .count('id as count').first();
        return countResult && countResult.count > 0;
    };

    // GET /api/warranties - Fetch all warranties
    router.get('/', async (req, res) => {
        try {
            const warranties = await knex('warranties')
                                     .select('id', 'name', 'duration_months', 'description') // Select relevant fields
                                     .orderBy('name');
            res.status(200).json(warranties);
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
        const warrantyId = parseInt(id);
        if (isNaN(warrantyId)) return res.status(400).json({ message: 'Invalid warranty ID.' });

        try {
            // Check for dependencies (Items using this warranty)
            const warrantyUsed = await isWarrantyInUse(warrantyId);
            if (warrantyUsed) return res.status(409).json({ message: 'Conflict: Cannot delete warranty because it is used by Items.' });

            const count = await knex('warranties').where({ id: warrantyId }).del();
            if (count === 0) return res.status(404).json({ message: `Warranty with ID ${id} not found.` });
            res.status(204).send(); // Success
        } catch (err) {
             if (err.code === '23503') { // Fallback FK check
                 console.warn(`Attempted to delete warranty ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete warranty due to existing references.', error: err.detail });
             }
            console.error(`Error deleting warranty ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting warranty.', error: err.message });
        }
    });

    return router;
}
module.exports = createWarrantiesRouter;
