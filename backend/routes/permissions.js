const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware'); // Adjust path if needed
// const { authorizePermissions } = require('../middleware/authMiddleware');
// const { PERMISSIONS } = require('../utils/roles'); // Or your permissions constants

const createPermissionsRouter = (knex) => {
    const router = express.Router();

    // GET /api/permissions - Fetch all available permissions
    router.get(
        '/',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.ROLE_MANAGE]), // Or a more specific permission like 'permission:read'
        async (req, res) => {
            try {
                const permissions = await knex('permissions')
                    .select('id', 'name', 'display_name', 'description', 'created_at', 'updated_at') // Ensure display_name is here
                    .orderBy('display_name'); // Order by name, since 'group' doesn't exist
                res.status(200).json(permissions);
            } catch (error) {
                console.error('Error fetching permissions:', error);
                res.status(500).json({ message: 'Failed to fetch permissions.' });
            }
        }
    );

    // ADD THIS ROUTE: GET /api/permissions/:id - Fetch a single permission by ID
    router.get(
        '/:id',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.ROLE_MANAGE]), // Or 'permission:read'
        async (req, res) => {
            const { id } = req.params;
            try {
                const permission = await knex('permissions')
                    .select('id', 'name', 'display_name', 'description', 'created_at', 'updated_at')
                    .where({ id })
                    .first(); // Use .first() to get a single object or undefined

                if (!permission) {
                    return res.status(404).json({ message: 'Permission not found.' });
                }
                res.status(200).json(permission);
            } catch (error) {
                console.error(`Error fetching permission with ID ${id}:`, error);
                res.status(500).json({ message: 'Failed to fetch permission details.' });
            }
        }
    );

    // You would also need POST, PUT, DELETE routes here for full CRUD
    // For example, a basic POST route (ensure validation and proper permissions):
    router.post(
        '/',
        authenticateToken,
        // authorizePermissions(['permission:create']), // Add appropriate permission check
        async (req, res) => {
            const { name, display_name, description } = req.body;
            // Add validation here (e.g., using express-validator)
            if (!name || !display_name) {
                return res.status(400).json({ message: 'Name and Display Name are required.' });
            }
            try {
                const [newPermissionId] = await knex('permissions').insert({
                    name,
                    display_name,
                    description
                }).returning('id');

                const newPermission = await knex('permissions').where({ id: newPermissionId.id || newPermissionId }).first(); // Knex returns object with id in PostgreSQL
                res.status(201).json(newPermission);
            } catch (error) {
                console.error('Error creating permission:', error);
                if (error.code === '23505') { // Unique constraint violation (e.g., for 'name')
                    return res.status(409).json({ message: `Permission with name '${name}' already exists.` });
                }
                res.status(500).json({ message: 'Failed to create permission.' });
            }
        }
    );

    // Basic PUT route (ensure validation and proper permissions):
    router.put(
        '/:id',
        authenticateToken,
        // authorizePermissions(['permission:update']), // Add appropriate permission check
        async (req, res) => {
            const { id } = req.params;
            const { display_name, description } = req.body; // Name (code) is typically not updatable
            
            // Add validation here
            if (!display_name) {
                return res.status(400).json({ message: 'Display Name is required.' });
            }

            try {
                const updatedCount = await knex('permissions')
                    .where({ id })
                    .update({
                        display_name,
                        description,
                        updated_at: knex.fn.now() // Explicitly set updated_at
                    });

                if (updatedCount === 0) {
                    return res.status(404).json({ message: 'Permission not found or no changes made.' });
                }
                const updatedPermission = await knex('permissions').where({ id }).first();
                res.status(200).json(updatedPermission);
            } catch (error) {
                console.error(`Error updating permission with ID ${id}:`, error);
                res.status(500).json({ message: 'Failed to update permission.' });
            }
        }
    );

    // Basic DELETE route (ensure proper permissions):
    router.delete(
        '/:id',
        authenticateToken,
        // authorizePermissions(['permission:delete']), // Add appropriate permission check
        async (req, res) => {
            const { id } = req.params;
            try {
                // Check if permission is in use by roles (optional but good practice)
                const rolesUsingPermission = await knex('role_permissions').where({ permission_id: id }).count('* as count').first();
                if (rolesUsingPermission && parseInt(rolesUsingPermission.count, 10) > 0) {
                    return res.status(400).json({ message: `Cannot delete permission. It is currently assigned to ${rolesUsingPermission.count} role(s). Please unassign it first.` });
                }

                const deletedCount = await knex('permissions').where({ id }).del();
                if (deletedCount === 0) {
                    return res.status(404).json({ message: 'Permission not found.' });
                }
                res.status(200).json({ message: 'Permission deleted successfully.' }); // Or res.status(204).send();
            } catch (error) {
                console.error(`Error deleting permission with ID ${id}:`, error);
                res.status(500).json({ message: 'Failed to delete permission.' });
            }
        }
    );

    return router;
};

module.exports = createPermissionsRouter;