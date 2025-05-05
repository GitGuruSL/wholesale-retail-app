// backend/routes/barcode_symbologies.js
const express = require('express');

/**
 * Creates router for handling barcode symbology related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createBarcodeSymbologiesRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    const isSymbologyInUse = async (symbologyId) => {
        const countResult = await knex('products')
                                .where({ barcode_symbology_id: symbologyId })
                                .count('id as count').first();
        return countResult && countResult.count > 0;
    };

    // GET /api/barcode-symbologies - Fetch all symbologies
    router.get('/', async (req, res) => {
        try {
            const symbologies = await knex('barcode_symbologies')
                                      .select('id', 'name')
                                      .orderBy('name');
            res.status(200).json(symbologies);
        } catch (err) {
            console.error("Error fetching barcode symbologies:", err);
            res.status(500).json({ message: 'Database error fetching barcode symbologies.', error: err.message });
        }
    });

    // GET /api/barcode-symbologies/:id - Fetch a single symbology by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid symbology ID.' });
        try {
            const symbology = await knex('barcode_symbologies').where({ id: parseInt(id) }).first();
            if (!symbology) return res.status(404).json({ message: `Barcode symbology with ID ${id} not found.` });
            res.status(200).json(symbology);
        } catch (err) {
            console.error(`Error fetching symbology ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching symbology details.', error: err.message });
        }
    });


    // POST /api/barcode-symbologies - Create a new symbology
    router.post('/', async (req, res) => {
        const { name } = req.body;
        if (!name || name.trim() === '') return res.status(400).json({ message: 'Symbology name is required.' });

        const newSymbology = { name: name.trim() };

        try {
            const [insertedSymbology] = await knex('barcode_symbologies').insert(newSymbology).returning('*');
            res.status(201).json(insertedSymbology);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Barcode symbology name "${newSymbology.name}" already exists.`, error: err.detail });
            console.error("Error creating symbology:", err);
            res.status(500).json({ message: 'Database error creating symbology.', error: err.message });
        }
    });

    // PUT /api/barcode-symbologies/:id - Update an existing symbology
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid symbology ID.' });
        if (name === undefined) return res.status(400).json({ message: 'Symbology name is required for update.' });
        if (typeof name !== 'string' || name.trim() === '') return res.status(400).json({ message: 'Symbology name must be a non-empty string.' });

        const symbologyUpdates = { name: name.trim() }; // Only name is updatable here

        try {
            const count = await knex('barcode_symbologies').where({ id: parseInt(id) }).update(symbologyUpdates);
            if (count === 0) {
                const exists = await knex('barcode_symbologies').where({ id: parseInt(id) }).first();
                if (!exists) return res.status(404).json({ message: `Symbology with ID ${id} not found.` });
                console.warn(`Symbology ${id} existed but update resulted in 0 rows affected.`);
                res.status(200).json(exists); return;
            }
            const updatedSymbology = await knex('barcode_symbologies').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedSymbology);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Symbology name "${symbologyUpdates.name}" already exists.`, error: err.detail });
            console.error(`Error updating symbology ${id}:`, err);
            res.status(500).json({ message: 'Database error updating symbology.', error: err.message });
        }
    });

    // DELETE /api/barcode-symbologies/:id - Delete a symbology
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const symbologyId = parseInt(id);
        if (isNaN(symbologyId)) return res.status(400).json({ message: 'Invalid symbology ID.' });

        try {
            // Check for dependencies
            const symbologyUsed = await isSymbologyInUse(symbologyId);
            if (symbologyUsed) return res.status(409).json({ message: 'Conflict: Cannot delete symbology because it is used by products.' });

            const count = await knex('barcode_symbologies').where({ id: symbologyId }).del();
            if (count === 0) return res.status(404).json({ message: `Symbology with ID ${id} not found.` });
            res.status(204).send(); // Success
        } catch (err) {
             if (err.code === '23503') { // Fallback FK check
                 console.warn(`Attempted to delete symbology ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete symbology due to existing references.', error: err.detail });
             }
            console.error(`Error deleting symbology ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting symbology.', error: err.message });
        }
    });

    return router;
}
module.exports = createBarcodeSymbologiesRouter;
