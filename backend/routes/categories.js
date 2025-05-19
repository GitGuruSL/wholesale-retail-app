// backend/routes/categories.js
const express = require('express');

/**
 * Creates router for handling category-related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createCategoriesRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for Sub-category dependencies ---
    const hasSubCategories = async (categoryId) => {
        const tableExists = await knex.schema.hasTable('sub_categories');
        if (!tableExists) {
            console.warn("Sub-categories table check skipped: Table does not exist.");
            return false;
        }
        const countResult = await knex('sub_categories')
                                .where({ category_id: categoryId })
                                .count('id as count')
                                .first();
        return countResult && countResult.count > 0;
    };

     // --- Helper: Check for Item dependencies ---
     const hasItems = async (categoryId) => {
        const countResult = await knex('Items')
                                .where({ category_id: categoryId })
                                .count('id as count')
                                .first();
        return countResult && countResult.count > 0;
    };


    // GET /api/categories - Fetch all categories
    router.get('/', async (req, res) => {
        try {
            const categories = await knex('categories')
                                     .select('id', 'name', 'description')
                                     .orderBy('name');
            res.status(200).json(categories);
        } catch (err) {
            console.error("Error fetching categories:", err);
            res.status(500).json({ message: 'Database error fetching categories.', error: err.message });
        }
    });

    // GET /api/categories/:id - Fetch a single category by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid category ID.' });
        }
        try {
            const category = await knex('categories').where({ id: parseInt(id) }).first();
            if (!category) {
                return res.status(404).json({ message: `Category with ID ${id} not found.` });
            }
            res.status(200).json(category);
        } catch (err) {
            console.error(`Error fetching category ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching category details.', error: err.message });
        }
    });


    // POST /api/categories - Create a new category
    router.post('/', async (req, res) => {
        const { name, description } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Category name is required.' });
        }

        const newCategory = {
            name: name.trim(),
            // Handle description safely: trim if it's a string, otherwise null
            description: typeof description === 'string' ? (description.trim() || null) : null,
        };

        try {
            const [insertedCategory] = await knex('categories').insert(newCategory).returning('*');
            res.status(201).json(insertedCategory);
        } catch (err) {
            if (err.code === '23505') {
                return res.status(409).json({ message: `Conflict: Category name "${name}" already exists.`, error: err.detail });
            }
            console.error("Error creating category:", err);
            res.status(500).json({ message: 'Database error creating category.', error: err.message });
        }
    });

    // PUT /api/categories/:id - Update an existing category
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, description } = req.body; // Get potential name and description from body

         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid category ID.' });
        }

        // Prepare updates object
        const categoryUpdates = {
            updated_at: new Date() // Always update the timestamp
        };

        // Validate and add name if provided
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                 return res.status(400).json({ message: 'Category name must be a non-empty string.' });
            }
            categoryUpdates.name = name.trim();
        }

        // **FIXED**: Handle description safely
        // Only add description to updates if it was explicitly provided in the request body
        if (description !== undefined) {
             // If description is provided, trim it if it's a string, otherwise set to null
             categoryUpdates.description = typeof description === 'string' ? (description.trim() || null) : null;
        }
        // If name and description were both undefined in req.body, categoryUpdates will only contain updated_at
        // We might want to prevent updates with no actual changes, but this is safer for now.


        // Prevent updating if only updated_at is present (no actual data change sent)
         if (Object.keys(categoryUpdates).length <= 1) {
             // Fetch and return current data as no changes were requested
             const currentCategory = await knex('categories').where({ id: parseInt(id) }).first();
             if (!currentCategory) return res.status(404).json({ message: `Category with ID ${id} not found.` });
             return res.status(200).json(currentCategory); // Return current data
         }


        try {
            const count = await knex('categories').where({ id: parseInt(id) }).update(categoryUpdates);

            if (count === 0) {
                const exists = await knex('categories').where({ id: parseInt(id) }).first();
                if (!exists) {
                    return res.status(404).json({ message: `Category with ID ${id} not found.` });
                } else {
                    console.warn(`Category ${id} existed but update resulted in 0 rows affected (data might be identical).`);
                    res.status(200).json(exists); // Return existing data if no change occurred
                    return;
                }
            }

            const updatedCategory = await knex('categories').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedCategory);

        } catch (err) {
            if (err.code === '23505' && categoryUpdates.name) { // Check if the error is due to name conflict
                return res.status(409).json({ message: `Conflict: Category name "${categoryUpdates.name}" already exists.`, error: err.detail });
            }
            console.error(`Error updating category ${id}:`, err);
            res.status(500).json({ message: 'Database error updating category.', error: err.message });
        }
    });

    // DELETE /api/categories/:id - Delete a category
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid category ID.' });
        }

        try {
            // Check for dependencies
            const categoryHasSubCategories = await hasSubCategories(parseInt(id));
            if (categoryHasSubCategories) {
                return res.status(409).json({ message: 'Conflict: Cannot delete category because it has associated sub-categories.' });
            }
            const categoryHasItems = await hasItems(parseInt(id));
             if (categoryHasItems) {
                return res.status(409).json({ message: 'Conflict: Cannot delete category because it has associated Items.' });
            }

            // Proceed with deletion
            const count = await knex('categories').where({ id: parseInt(id) }).del();

            if (count === 0) {
                return res.status(404).json({ message: `Category with ID ${id} not found.` });
            }

            res.status(204).send(); // Success

        } catch (err) {
             if (err.code === '23503') {
                 console.warn(`Attempted to delete category ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete category due to existing references in other tables.', error: err.detail });
             }
            console.error(`Error deleting category ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting category.', error: err.message });
        }
    });

    return router;
}

module.exports = createCategoriesRouter;