// backend/routes/sub_categories.js
const express = require('express');

/**
 * Creates router for handling sub-category related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createSubCategoriesRouter(knex) {
    const router = express.Router();

     // --- Helper: Check for Item dependencies ---
     const hasItems = async (subCategoryId) => {
        const hasSubCategoryColumn = await knex.schema.hasColumn('Items', 'sub_category_id');
        if (!hasSubCategoryColumn) {
            return false;
        }
        const countResult = await knex('Items')
                                .where({ sub_category_id: subCategoryId })
                                .count('id as count')
                                .first();
        return countResult && countResult.count > 0;
    };


    // GET /api/sub-categories - Fetch all sub-categories with parent category name
    router.get('/', async (req, res) => {
        try {
            const subCategories = await knex('sub_categories')
                                     .join('categories', 'sub_categories.category_id', '=', 'categories.id')
                                     .select(
                                         'sub_categories.id',
                                         'sub_categories.name',
                                         'sub_categories.category_id',
                                         'categories.name as category_name'
                                        )
                                     .orderBy('categories.name') // Primary sort by parent category name
                                     .orderBy('sub_categories.name'); // **FIXED**: Secondary sort using another orderBy
            res.status(200).json(subCategories);
        } catch (err) {
            console.error("Error fetching sub-categories:", err);
            res.status(500).json({ message: 'Database error fetching sub-categories.', error: err.message });
        }
    });

    // GET /api/sub-categories/:id - Fetch a single sub-category by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid sub-category ID.' });
        }
        try {
            const subCategory = await knex('sub_categories').where({ id: parseInt(id) }).first();
            if (!subCategory) {
                return res.status(404).json({ message: `Sub-category with ID ${id} not found.` });
            }
            res.status(200).json(subCategory);
        } catch (err) {
            console.error(`Error fetching sub-category ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching sub-category details.', error: err.message });
        }
    });


    // POST /api/sub-categories - Create a new sub-category
    router.post('/', async (req, res) => {
        const { name, category_id } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Sub-category name is required.' });
        }
        if (!category_id || isNaN(parseInt(category_id))) {
             return res.status(400).json({ message: 'Valid Parent Category ID is required.' });
        }

        const newSubCategory = {
            name: name.trim(),
            category_id: parseInt(category_id),
        };

        try {
             const parentExists = await knex('categories').where({ id: newSubCategory.category_id }).first();
             if (!parentExists) {
                 return res.status(400).json({ message: `Parent Category with ID ${newSubCategory.category_id} does not exist.` });
             }

            const [insertedSubCategory] = await knex('sub_categories').insert(newSubCategory).returning('*');
            res.status(201).json(insertedSubCategory);
        } catch (err) {
            if (err.code === '23505') {
                 if (err.constraint === 'sub_categories_category_id_name_unique') {
                      return res.status(409).json({ message: `Conflict: Sub-category name "${name}" already exists within the selected parent category.`, error: err.detail });
                 }
                 return res.status(409).json({ message: 'Conflict: Could not create sub-category due to a unique constraint.', error: err.detail });
            }
             if (err.code === '23503') {
                 return res.status(400).json({ message: `Invalid Parent Category ID provided.`, error: err.detail });
             }
            console.error("Error creating sub-category:", err);
            res.status(500).json({ message: 'Database error creating sub-category.', error: err.message });
        }
    });

    // PUT /api/sub-categories/:id - Update an existing sub-category
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, category_id } = req.body;

         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid sub-category ID.' });
        }

        const subCategoryUpdates = {
            updated_at: new Date()
        };

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                 return res.status(400).json({ message: 'Sub-category name must be a non-empty string.' });
            }
            subCategoryUpdates.name = name.trim();
        }

        if (category_id !== undefined) {
             if (category_id === null || category_id === '' || isNaN(parseInt(category_id))) {
                return res.status(400).json({ message: 'Valid Parent Category ID must be provided.' });
             }
             const newParentId = parseInt(category_id);
             subCategoryUpdates.category_id = newParentId;

             const parentExists = await knex('categories').where({ id: newParentId }).first();
             if (!parentExists) {
                 return res.status(400).json({ message: `Parent Category with ID ${newParentId} does not exist.` });
             }
        }

         if (Object.keys(subCategoryUpdates).length <= 1) {
             const currentSubCategory = await knex('sub_categories').where({ id: parseInt(id) }).first();
              if (!currentSubCategory) return res.status(404).json({ message: `Sub-category with ID ${id} not found.` });
              return res.status(200).json(currentSubCategory);
         }


        try {
            const count = await knex('sub_categories').where({ id: parseInt(id) }).update(subCategoryUpdates);

            if (count === 0) {
                const exists = await knex('sub_categories').where({ id: parseInt(id) }).first();
                if (!exists) {
                    return res.status(404).json({ message: `Sub-category with ID ${id} not found.` });
                } else {
                    console.warn(`Sub-category ${id} existed but update resulted in 0 rows affected.`);
                    res.status(200).json(exists);
                    return;
                }
            }

            const updatedSubCategory = await knex('sub_categories')
                                            .join('categories', 'sub_categories.category_id', 'categories.id')
                                            .select('sub_categories.*', 'categories.name as category_name')
                                            .where('sub_categories.id', parseInt(id))
                                            .first();
            res.status(200).json(updatedSubCategory);

        } catch (err) {
            if (err.code === '23505') {
                if (err.constraint === 'sub_categories_category_id_name_unique') {
                    return res.status(409).json({ message: `Conflict: Sub-category name "${subCategoryUpdates.name}" already exists within the selected parent category.`, error: err.detail });
                }
                return res.status(409).json({ message: 'Conflict: Could not update sub-category due to a unique constraint.', error: err.detail });
            }
             if (err.code === '23503') {
                 return res.status(400).json({ message: `Invalid Parent Category ID provided.`, error: err.detail });
             }
            console.error(`Error updating sub-category ${id}:`, err);
            res.status(500).json({ message: 'Database error updating sub-category.', error: err.message });
        }
    });

    // DELETE /api/sub-categories/:id - Delete a sub-category
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid sub-category ID.' });
        }

        try {
            const subCategoryHasItems = await hasItems(parseInt(id));
             if (subCategoryHasItems) {
                return res.status(409).json({ message: 'Conflict: Cannot delete sub-category because it has associated Items.' });
            }

            const count = await knex('sub_categories').where({ id: parseInt(id) }).del();

            if (count === 0) {
                return res.status(404).json({ message: `Sub-category with ID ${id} not found.` });
            }

            res.status(204).send(); // Success

        } catch (err) {
             if (err.code === '23503') {
                 console.warn(`Attempted to delete sub-category ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete sub-category due to existing references in other tables.', error: err.detail });
             }
            console.error(`Error deleting sub-category ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting sub-category.', error: err.message });
        }
    });

    return router;
}

module.exports = createSubCategoriesRouter;