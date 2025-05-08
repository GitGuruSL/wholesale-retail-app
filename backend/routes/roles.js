const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, authorizePermissions } = require('../middleware/authMiddleware'); // Assuming you have this
const { PERMISSIONS } // Assuming you might want to define a permission for managing roles
    // = require('../utils/roles'); // Or wherever PERMISSIONS is defined
    = { ROLE_MANAGE: 'role:manage', ROLE_READ: 'role:read' }; // Placeholder, added ROLE_READ

const createRolesRouter = (knex) => {
    const router = express.Router();

    // GET /api/roles - Fetch all roles
    router.get(
        '/', 
        authenticateToken, 
        // authorizePermissions([PERMISSIONS.ROLE_READ]), // Optional: if you have a specific permission for reading roles
        async (req, res) => { 
        try {
            const rolesFromDb = await knex('roles')
                .select('id', 'name', 'display_name', 'description', 'created_at', 'updated_at')
                .orderBy('display_name');
            res.status(200).json(rolesFromDb);
        } catch (error) {
            console.error('Error fetching roles from database:', error);
            res.status(500).json({ message: 'Failed to fetch roles from database' });
        }
    });

    // --- >>> ADD THIS ROUTE HANDLER <<< ---
    // GET /api/roles/:id - Fetch a single role by ID
    router.get(
        '/:id',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.ROLE_READ]), // Optional: if you have a specific permission for reading roles
        async (req, res) => {
            try {
                const { id } = req.params;
                if (isNaN(parseInt(id))) {
                    return res.status(400).json({ message: 'Role ID must be an integer.' });
                }

                const role = await knex('roles')
                    .select('id', 'name', 'display_name', 'description', 'created_at', 'updated_at')
                    .where({ id: parseInt(id) })
                    .first();

                if (!role) {
                    return res.status(404).json({ message: 'Role not found.' });
                }
                res.status(200).json(role);
            } catch (error) {
                console.error(`Error fetching role by ID ${req.params.id}:`, error);
                res.status(500).json({ message: 'Failed to fetch role details.' });
            }
        }
    );
    // --- END OF ADDED ROUTE HANDLER ---

    // POST /api/roles - Create a new role
    router.post(
        '/',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.ROLE_MANAGE]), // Uncomment if you have role management permission
        [
            body('name')
                .trim()
                .notEmpty().withMessage('Machine-readable name is required.')
                .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters.')
                .matches(/^[a-z0-9_]+$/).withMessage('Name can only contain lowercase letters, numbers, and underscores.'),
            body('display_name')
                .trim()
                .notEmpty().withMessage('Display name is required.')
                .isLength({ min: 3, max: 100 }).withMessage('Display name must be between 3 and 100 characters.'),
            body('description')
                .optional({ checkFalsy: true }) // Allows empty string or null
                .trim()
                .isLength({ max: 255 }).withMessage('Description cannot exceed 255 characters.')
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, display_name, description } = req.body;

            try {
                // Check if role name already exists (case-insensitive for machine name is good practice)
                const existingRole = await knex('roles')
                    .whereRaw('LOWER(name) = LOWER(?)', [name])
                    .first();

                if (existingRole) {
                    return res.status(409).json({ message: `Role with machine name '${name}' already exists.` });
                }

                const [newRole] = await knex('roles')
                    .insert({
                        name: name.toLowerCase(), // Store machine name consistently (e.g., lowercase)
                        display_name,
                        description: description || null, // Ensure null if empty
                        // created_at and updated_at are handled by DB defaults
                    })
                    .returning(['id', 'name', 'display_name', 'description', 'created_at', 'updated_at']); // Return the created role

                res.status(201).json(newRole);
            } catch (error) {
                console.error('Error creating role:', error);
                if (error.code === '23505') { // Unique violation (though we check above, this is a fallback)
                    return res.status(409).json({ message: 'Role name or another unique field already exists.' });
                }
                res.status(500).json({ message: 'Failed to create role.' });
            }
        }
    );

    // You will also need PUT /api/roles/:id for updating roles
    router.put(
        '/:id',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.ROLE_MANAGE]), // Or a specific 'role:update' permission
        [ // Add validation for PUT request as well
            body('name')
                .optional() // Name might not always be updatable, or updatable with caution
                .trim()
                .isLength({ min: 3, max: 50 }).withMessage('Name must be between 3 and 50 characters.')
                .matches(/^[a-z0-9_]+$/).withMessage('Name can only contain lowercase letters, numbers, and underscores.'),
            body('display_name')
                .optional() // Allow partial updates
                .trim()
                .notEmpty().withMessage('Display name cannot be empty if provided.')
                .isLength({ min: 3, max: 100 }).withMessage('Display name must be between 3 and 100 characters.'),
            body('description')
                .optional({ checkFalsy: true })
                .trim()
                .isLength({ max: 255 }).withMessage('Description cannot exceed 255 characters.')
        ],
        async (req, res) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { id } = req.params;
            if (isNaN(parseInt(id))) {
                return res.status(400).json({ message: 'Role ID must be an integer.' });
            }

            const { name, display_name, description } = req.body;
            const updatePayload = {};
            if (name !== undefined) updatePayload.name = name.toLowerCase();
            if (display_name !== undefined) updatePayload.display_name = display_name;
            if (description !== undefined) updatePayload.description = description === '' ? null : description;


            if (Object.keys(updatePayload).length === 0) {
                return res.status(400).json({ message: 'No fields provided for update.' });
            }
            
            updatePayload.updated_at = knex.fn.now(); // Explicitly set updated_at

            try {
                // Check if role exists before updating
                const roleExists = await knex('roles').where({ id: parseInt(id) }).first();
                if (!roleExists) {
                    return res.status(404).json({ message: 'Role not found.' });
                }

                // If name is being updated, check for conflicts (excluding the current role)
                if (name !== undefined) {
                    const existingRoleWithNewName = await knex('roles')
                        .whereRaw('LOWER(name) = LOWER(?)', [name])
                        .whereNot({ id: parseInt(id) })
                        .first();
                    if (existingRoleWithNewName) {
                        return res.status(409).json({ message: `Another role with machine name '${name}' already exists.` });
                    }
                }

                const [updatedRole] = await knex('roles')
                    .where({ id: parseInt(id) })
                    .update(updatePayload)
                    .returning(['id', 'name', 'display_name', 'description', 'created_at', 'updated_at']);
                
                if (!updatedRole) { // Should not happen if roleExists check passed, but good practice
                    return res.status(404).json({ message: 'Role not found after update attempt.' });
                }

                res.status(200).json(updatedRole);
            } catch (error) {
                console.error(`Error updating role ID ${id}:`, error);
                 if (error.code === '23505') { 
                    return res.status(409).json({ message: 'Role name or another unique field already exists.' });
                }
                res.status(500).json({ message: 'Failed to update role.' });
            }
        }
    );


    // You will also need DELETE /api/roles/:id for deleting roles
    router.delete(
        '/:id',
        authenticateToken,
        // authorizePermissions([PERMISSIONS.ROLE_MANAGE]), // Or a specific 'role:delete' permission
        async (req, res) => {
            const { id } = req.params;
            if (isNaN(parseInt(id))) {
                return res.status(400).json({ message: 'Role ID must be an integer.' });
            }

            try {
                 // Optional: Check if the role is assigned to any users before deleting
                // const usersWithRole = await knex('user_roles').where({ role_id: parseInt(id) }).first();
                // if (usersWithRole) {
                //    return res.status(400).json({ message: 'Cannot delete role. It is currently assigned to one or more users.' });
                // }

                // Optional: Remove permissions associated with this role from role_permissions table
                // await knex('role_permissions').where({ role_id: parseInt(id) }).del();


                const numDeleted = await knex('roles')
                    .where({ id: parseInt(id) })
                    .del();

                if (numDeleted === 0) {
                    return res.status(404).json({ message: 'Role not found.' });
                }

                res.status(200).json({ message: `Role with ID ${id} deleted successfully.` }); // Or res.status(204).send();
            } catch (error) {
                console.error(`Error deleting role ID ${id}:`, error);
                // Check for foreign key constraint errors if you don't manually check user_roles
                if (error.code === '23503') { // Foreign key violation
                     return res.status(400).json({ message: 'Cannot delete role. It is currently in use (e.g., assigned to users).' });
                }
                res.status(500).json({ message: 'Failed to delete role.' });
            }
        }
    );

    return router;
};

module.exports = createRolesRouter;