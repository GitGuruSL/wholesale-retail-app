// backend/routes/units.js
const express = require('express');

/**
 * Creates router for handling the simplified unit definitions (names only).
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createUnitsRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    // Checks if a unit is used as a base unit for any product OR
    // if it's referenced in the product_units table.
    const isUnitInUse = async (unitId) => {
        // Check product base units
        const productBaseCount = await knex('products')
                                     .where({ base_unit_id: unitId })
                                     .count('id as count').first();
        if (productBaseCount && productBaseCount.count > 0) return true;

        // Check product_units table (unit_id or base_unit_id)
        const productUnitsTableExists = await knex.schema.hasTable('product_units');
        if (productUnitsTableExists) {
             const productUnitCount = await knex('product_units')
                                          .where({ unit_id: unitId })
                                          .orWhere({ base_unit_id: unitId })
                                          .count('id as count').first();
             if (productUnitCount && productUnitCount.count > 0) return true;
        }
        // Add checks for stock, orders etc. if those tables reference unit_id directly

        return false;
    };

    // GET /api/units - Fetch all unit definitions (id, name)
    router.get('/', async (req, res) => {
        try {
            const units = await knex('units')
                                .select('id', 'name')
                                .orderBy('name');
            res.status(200).json(units);
        } catch (err) {
            console.error("Error fetching units:", err);
            res.status(500).json({ message: 'Database error fetching units.', error: err.message });
        }
    });

    // GET /api/units/:id - Fetch a single unit by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid unit ID.' });
        }
        try {
            const unit = await knex('units').select('id', 'name').where({ id: parseInt(id) }).first();
            if (!unit) {
                return res.status(404).json({ message: `Unit with ID ${id} not found.` });
            }
            res.status(200).json(unit);
        } catch (err) {
            console.error(`Error fetching unit ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching unit details.', error: err.message });
        }
    });


    // POST /api/units - Create a new unit definition (name only)
    router.post('/', async (req, res) => {
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Unit name is required.' });
        }

        const newUnit = {
            name: name.trim(),
            // created_at/updated_at handled by DB defaults
        };

        try {
            const [insertedUnit] = await knex('units').insert(newUnit).returning(['id', 'name']); // Return only relevant fields
            res.status(201).json(insertedUnit);
        } catch (err) {
            // Handle potential unique constraint violation on 'name'
            if (err.code === '23505') {
                return res.status(409).json({ message: `Conflict: Unit name "${newUnit.name}" already exists.`, error: err.detail });
            }
            console.error("Error creating unit:", err);
            res.status(500).json({ message: 'Database error creating unit.', error: err.message });
        }
    });

    // PUT /api/units/:id - Update an existing unit's name
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;

         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid unit ID.' });
        }

        if (name === undefined) {
             // If only other fields were sent (which don't exist here), return current data
             const currentUnit = await knex('units').select('id', 'name').where({ id: parseInt(id) }).first();
             if (!currentUnit) return res.status(404).json({ message: `Unit with ID ${id} not found.` });
             return res.status(200).json(currentUnit);
        }

        if (typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Unit name must be a non-empty string.' });
        }

        const unitUpdates = {
            name: name.trim(),
            updated_at: new Date()
        };

        try {
            const count = await knex('units').where({ id: parseInt(id) }).update(unitUpdates);

            if (count === 0) {
                const exists = await knex('units').where({ id: parseInt(id) }).first();
                if (!exists) {
                    return res.status(404).json({ message: `Unit with ID ${id} not found.` });
                } else {
                     console.warn(`Unit ${id} existed but update resulted in 0 rows affected.`);
                     res.status(200).json(exists); // Return existing data
                     return;
                }
            }

            const updatedUnit = await knex('units').select('id', 'name').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedUnit);

        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation
                return res.status(409).json({ message: `Conflict: Unit name "${unitUpdates.name}" already exists.`, error: err.detail });
            }
            console.error(`Error updating unit ${id}:`, err);
            res.status(500).json({ message: 'Database error updating unit.', error: err.message });
        }
    });

    // DELETE /api/units/:id - Delete a unit definition
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const unitId = parseInt(id);
         if (isNaN(unitId)) {
             return res.status(400).json({ message: 'Invalid unit ID.' });
        }

        try {
            // ** Check for dependencies before deleting **
            const unitUsed = await isUnitInUse(unitId);
            if (unitUsed) {
                 return res.status(409).json({ message: 'Conflict: Cannot delete unit because it is referenced by products or product unit configurations.' });
            }

            // Proceed with deletion
            const count = await knex('units').where({ id: unitId }).del();

            if (count === 0) {
                return res.status(404).json({ message: `Unit with ID ${id} not found.` });
            }

            res.status(204).send(); // Success

        } catch (err) {
             // Fallback FK check (less likely now with explicit checks)
             if (err.code === '23503') {
                 console.warn(`Attempted to delete unit ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete unit due to existing references.', error: err.detail });
             }
            console.error(`Error deleting unit ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting unit.', error: err.message });
        }
    });

    // Remove the GET /api/units/base-units route if it existed, it's no longer needed

    return router;
}
module.exports = createUnitsRouter;
