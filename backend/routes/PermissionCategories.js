const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
// const { authorizePermissions } = require('../middleware/authMiddleware'); // Uncomment if you implement this

const createPermissionCategoriesRouter = (knex) => {
    const router = express.Router();

    // GET /api/permission-categories - Fetch all permission categories for management
    router.get(
        '/',
        authenticateToken,
        // authorizePermissions(['system:manage_permission_categories']), // Or a specific read permission
        async (req, res) => {
            try {
                const categories = await knex('permission_categories')
                    .select('id', 'name', 'display_order', 'created_at', 'updated_at')
                    .orderBy('display_order');
                res.status(200).json(categories);
            } catch (error) {
                console.error('Error fetching permission categories:', error);
                res.status(500).json({ message: 'Failed to fetch permission categories.' });
            }
        }
    );

    // GET /api/permission-categories/:id - Fetch a single permission category by ID
    router.get(
        '/:id',
        authenticateToken,
        // authorizePermissions(['system:manage_permission_categories']),
        async (req, res) => {
            const { id } = req.params;
            try {
                const category = await knex('permission_categories')
                    .select('id', 'name', 'display_order', 'created_at', 'updated_at')
                    .where({ id })
                    .first();

                if (!category) {
                    return res.status(404).json({ message: 'Permission category not found.' });
                }
                res.status(200).json(category);
            } catch (error) {
                console.error(`Error fetching permission category with ID ${id}:`, error);
                res.status(500).json({ message: 'Failed to fetch permission category details.' });
            }
        }
    );

    // POST /api/permission-categories - Create a new permission category
    router.post(
        '/',
        authenticateToken,
        // authorizePermissions(['system:manage_permission_categories']),
        async (req, res) => {
            const { name, display_order } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Category name is required.' });
            }
            if (display_order === undefined || display_order === null || isNaN(parseInt(display_order, 10))) {
                return res.status(400).json({ message: 'Display order is required and must be a number.' });
            }

            try {
                const [newCategoryIdObj] = await knex('permission_categories').insert({
                    name: name.trim(),
                    display_order: parseInt(display_order, 10)
                }).returning('id');
                
                const newCategoryId = newCategoryIdObj.id || newCategoryIdObj;

                const newCategory = await knex('permission_categories').where({ id: newCategoryId }).first();
                res.status(201).json(newCategory);
            } catch (error) {
                console.error('Error creating permission category:', error);
                if (error.code === '23505') { // Unique constraint violation (if you add one for name)
                    return res.status(409).json({ message: `Permission category with name '${name}' already exists.` });
                }
                res.status(500).json({ message: 'Failed to create permission category.' });
            }
        }
    );

    // PUT /api/permission-categories/:id - Update an existing permission category
    router.put(
        '/:id',
        authenticateToken,
        // authorizePermissions(['system:manage_permission_categories']),
        async (req, res) => {
            const { id } = req.params;
            const { name, display_order } = req.body;

            if (!name || name.trim() === '') {
                return res.status(400).json({ message: 'Category name is required.' });
            }
            if (display_order === undefined || display_order === null || isNaN(parseInt(display_order, 10))) {
                return res.status(400).json({ message: 'Display order is required and must be a number.' });
            }

            try {
                const updatedCount = await knex('permission_categories')
                    .where({ id })
                    .update({
                        name: name.trim(),
                        display_order: parseInt(display_order, 10),
                        updated_at: knex.fn.now()
                    });

                if (updatedCount === 0) {
                    return res.status(404).json({ message: 'Permission category not found or no changes made.' });
                }
                const updatedCategory = await knex('permission_categories').where({ id }).first();
                res.status(200).json(updatedCategory);
            } catch (error) {
                console.error(`Error updating permission category with ID ${id}:`, error);
                 if (error.code === '23505') { // Unique constraint violation
                    return res.status(409).json({ message: `Permission category with name '${name}' already exists.` });
                }
                res.status(500).json({ message: 'Failed to update permission category.' });
            }
        }
    );

    // DELETE /api/permission-categories/:id - Delete a permission category
    router.delete(
        '/:id',
        authenticateToken,
        // authorizePermissions(['system:manage_permission_categories']),
        async (req, res) => {
            const { id } = req.params;
            try {
                // Check if any permissions are using this category
                const permissionsUsingCategory = await knex('permissions')
                    .where({ permission_category_id: id })
                    .count('* as count')
                    .first();

                if (permissionsUsingCategory && parseInt(permissionsUsingCategory.count, 10) > 0) {
                    return res.status(400).json({ 
                        message: `Cannot delete category. It is currently assigned to ${permissionsUsingCategory.count} permission(s). Please reassign them first.` 
                    });
                }

                const deletedCount = await knex('permission_categories').where({ id }).del();
                if (deletedCount === 0) {
                    return res.status(404).json({ message: 'Permission category not found.' });
                }
                res.status(200).json({ message: 'Permission category deleted successfully.' });
            } catch (error) {
                console.error(`Error deleting permission category with ID ${id}:`, error);
                res.status(500).json({ message: 'Failed to delete permission category.' });
            }
        }
    );

    return router;
};

module.exports = createPermissionCategoriesRouter;