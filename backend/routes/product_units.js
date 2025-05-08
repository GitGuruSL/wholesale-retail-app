const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizePermissions } = require('../middleware/authMiddleware'); // Adjust path as needed
// Define specific permissions for managing permissions, e.g., 'permission:manage', 'permission:read'
// For simplicity, we'll assume a general admin capability for now or use a placeholder.
const PERMISSIONS = { 
    PERMISSION_MANAGE: 'permission:manage', // Example permission to manage permissions
    PERMISSION_READ: 'permission:read'      // Example permission to read permissions
};

const createPermissionsRouter = (knex) => {
    const router = express.Router();

    // GET /api/permissions - Fetch all permissions
    router.get(
        '/',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.PERMISSION_READ]), // Protect this route
        async (req, res) => {
            try {
                const permissions = await knex('permissions')
                    .select('id', 'name', 'display_name', 'description', 'created_at', 'updated_at')
                    .orderBy('display_name');
                res.status(200).json(permissions);
            } catch (error) {
                console.error('Error fetching permissions:', error);
                res.status(500).json({ message: 'Failed to fetch permissions.' });
            }
        }
    );

    // GET /api/permissions/:id - Fetch a single permission by ID
    router.get(
        '/:id',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.PERMISSION_READ]),
        async (req, res) => {
            try {
                const { id } = req.params;
                if (isNaN(parseInt(id))) {
                    return res.status(400).json({ message: 'Permission ID must be an integer.' });
                }
                const permission = await knex('permissions')
                    .where({ id: parseInt(id) })
                    .first();
                if (!permission) {
                    return res.status(404).json({ message: 'Permission not found.' });
                }
                res.status(200).json(permission);
            } catch (error) {
                console.error(`Error fetching permission ID ${req.params.id}:`, error);
                res.status(500).json({ message: 'Failed to fetch permission.' });
            }
        }
    );

    // POST /api/permissions - Create a new permission
    router.post(
        '/',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.PERMISSION_MANAGE]),
        [
            body('name')
                .trim().notEmpty().withMessage('Permission name (machine-readable) is required.')
                .isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters.')
                .matches(/^[a-z0-9_:-]+$/).withMessage('Name can only contain lowercase letters, numbers, underscores, hyphens, and colons (e.g., user:create).'),
            body('display_name')
                .trim().notEmpty().withMessage('Display name is required.')
                .isLength({ min: 3, max: 100 }).withMessage('Display name must be 3-100 characters.'),
            body('description')
                .optional({ checkFalsy: true }).trim()
                .isLength({ max: 255 }).withMessage('Description cannot exceed 255 characters.')
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, display_name, description } = req.body;
            try {
                const existingPermission = await knex('permissions').where({ name: name.toLowerCase() }).first();
                if (existingPermission) {
                    return res.status(409).json({ message: `Permission with name '${name}' already exists.` });
                }

                const [newPermission] = await knex('permissions')
                    .insert({
                        name: name.toLowerCase(),
                        display_name,
                        description: description || null
                    })
                    .returning('*');
                res.status(201).json(newPermission);
            } catch (error) {
                console.error('Error creating permission:', error);
                if (error.code === '23505') { // Unique constraint violation
                    return res.status(409).json({ message: 'Permission name already exists.' });
                }
                res.status(500).json({ message: 'Failed to create permission.' });
            }
        }
    );

    // PUT /api/permissions/:id - Update an existing permission
    router.put(
        '/:id',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.PERMISSION_MANAGE]),
        [
            // Name is often not updatable or updatable with caution as it's used in code.
            // For this example, we'll allow display_name and description updates.
            body('display_name')
                .optional().trim().notEmpty().withMessage('Display name cannot be empty if provided.')
                .isLength({ min: 3, max: 100 }).withMessage('Display name must be 3-100 characters.'),
            body('description')
                .optional({ checkFalsy: true }).trim()
                .isLength({ max: 255 }).withMessage('Description cannot exceed 255 characters.')
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            if (isNaN(parseInt(id))) {
                return res.status(400).json({ message: 'Permission ID must be an integer.' });
            }

            const { display_name, description } = req.body;
            const updatePayload = {};
            if (display_name !== undefined) updatePayload.display_name = display_name;
            if (description !== undefined) updatePayload.description = description === '' ? null : description;
            
            if (Object.keys(updatePayload).length === 0) {
                return res.status(400).json({ message: 'No fields provided for update.' });
            }
            updatePayload.updated_at = knex.fn.now();

            try {
                const [updatedPermission] = await knex('permissions')
                    .where({ id: parseInt(id) })
                    .update(updatePayload)
                    .returning('*');

                if (!updatedPermission) {
                    return res.status(404).json({ message: 'Permission not found.' });
                }
                res.status(200).json(updatedPermission);
            } catch (error) {
                console.error(`Error updating permission ID ${id}:`, error);
                res.status(500).json({ message: 'Failed to update permission.' });
            }
        }
    );

    // DELETE /api/permissions/:id - Delete a permission
    router.delete(
        '/:id',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.PERMISSION_MANAGE]),
        async (req, res) => {
            const { id } = req.params;
            if (isNaN(parseInt(id))) {
                return res.status(400).json({ message: 'Permission ID must be an integer.' });
            }
            try {
                // Before deleting, you might want to check if this permission is used in 'role_permissions'
                // and decide on a strategy (e.g., prevent deletion, or cascade delete from role_permissions).
                // For simplicity, we'll directly attempt deletion.
                // await knex('role_permissions').where({ permission_id: parseInt(id) }).del(); // Example: orphan removal

                const numDeleted = await knex('permissions').where({ id: parseInt(id) }).del();
                if (numDeleted === 0) {
                    return res.status(404).json({ message: 'Permission not found.' });
                }
                res.status(200).json({ message: `Permission with ID ${id} deleted successfully.` });
            } catch (error) {
                console.error(`Error deleting permission ID ${id}:`, error);
                 if (error.code === '23503') { // Foreign key violation if permission is in use by roles
                     return res.status(400).json({ message: 'Cannot delete permission. It is currently assigned to one or more roles.' });
                }
                res.status(500).json({ message: 'Failed to delete permission.' });
            }
        }
    );

    return router;
};

module.exports = createPermissionsRouter;