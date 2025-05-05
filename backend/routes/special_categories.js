// backend/routes/special_categories.js
const express = require('express');

/**
 * Creates router for handling special category related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createSpecialCategoriesRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    // Checks if a special category is used by any products
    const isSpecialCategoryInUse = async (categoryId) => {
        const countResult = await knex('products')
                                .where({ special_category_id: categoryId })
                                .count('id as count').first();
        return countResult && countResult.count > 0;
    };

    // GET /api/special-categories - Fetch all special categories
    router.get('/', async (req, res) => {
        try {
            const categories = await knex('special_categories')
                                     .select('id', 'name', 'description')
                                     .orderBy('name');
            res.status(200).json(categories);
        } catch (err) {
            console.error("Error fetching special categories:", err);
            res.status(500).json({ message: 'Database error fetching special categories.', error: err.message });
        }
    });

    // GET /api/special-categories/:id - Fetch a single special category by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid special category ID.' });
        try {
            const category = await knex('special_categories').where({ id: parseInt(id) }).first();
            if (!category) return res.status(404).json({ message: `Special category with ID ${id} not found.` });
            res.status(200).json(category);
        } catch (err) {
            console.error(`Error fetching special category ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching special category details.', error: err.message });
        }
    });


    // POST /api/special-categories - Create a new special category
    router.post('/', async (req, res) => {
        const { name, description } = req.body;
        if (!name || name.trim() === '') return res.status(400).json({ message: 'Special category name is required.' });

        const newCategory = {
            name: name.trim(),
            description: typeof description === 'string' ? (description.trim() || null) : null,
             // created_at/updated_at handled by DB defaults
        };

        try {
            const [insertedCategory] = await knex('special_categories').insert(newCategory).returning('*');
            res.status(201).json(insertedCategory);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Special category name "${newCategory.name}" already exists.`, error: err.detail });
            console.error("Error creating special category:", err);
            res.status(500).json({ message: 'Database error creating special category.', error: err.message });
        }
    });

    // PUT /api/special-categories/:id - Update an existing special category
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, description } = req.body;
        if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid special category ID.' });

        const categoryUpdates = { updated_at: new Date() }; // Assuming timestamps(true,true) was used

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') return res.status(400).json({ message: 'Special category name must be a non-empty string.' });
            categoryUpdates.name = name.trim();
        }
        if (description !== undefined) {
             categoryUpdates.description = typeof description === 'string' ? (description.trim() || null) : null;
        }

         if (Object.keys(categoryUpdates).length <= 1) {
             const currentCategory = await knex('special_categories').where({ id: parseInt(id) }).first();
              if (!currentCategory) return res.status(404).json({ message: `Special category with ID ${id} not found.` });
              return res.status(200).json(currentCategory);
         }

        try {
            const count = await knex('special_categories').where({ id: parseInt(id) }).update(categoryUpdates);
            if (count === 0) {
                const exists = await knex('special_categories').where({ id: parseInt(id) }).first();
                if (!exists) return res.status(404).json({ message: `Special category with ID ${id} not found.` });
                console.warn(`Special category ${id} existed but update resulted in 0 rows affected.`);
                res.status(200).json(exists); return;
            }
            const updatedCategory = await knex('special_categories').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedCategory);
        } catch (err) {
            if (err.code === '23505' && categoryUpdates.name) return res.status(409).json({ message: `Conflict: Special category name "${categoryUpdates.name}" already exists.`, error: err.detail });
            console.error(`Error updating special category ${id}:`, err);
            res.status(500).json({ message: 'Database error updating special category.', error: err.message });
        }
    });

    // DELETE /api/special-categories/:id - Delete a special category
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const categoryId = parseInt(id);
        if (isNaN(categoryId)) return res.status(400).json({ message: 'Invalid special category ID.' });

        try {
            // Check for dependencies
            const categoryUsed = await isSpecialCategoryInUse(categoryId);
            if (categoryUsed) return res.status(409).json({ message: 'Conflict: Cannot delete special category because it is used by products.' });

            const count = await knex('special_categories').where({ id: categoryId }).del();
            if (count === 0) return res.status(404).json({ message: `Special category with ID ${id} not found.` });
            res.status(204).send(); // Success
        } catch (err) {
             if (err.code === '23503') { // Fallback FK check
                 console.warn(`Attempted to delete special category ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete special category due to existing references.', error: err.detail });
             }
            console.error(`Error deleting special category ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting special category.', error: err.message });
        }
    });

    return router;
}
module.exports = createSpecialCategoriesRouter;
