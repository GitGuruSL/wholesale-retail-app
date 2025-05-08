const express = require('express');
const { authenticateToken, authorizePermissions } = require('../middleware/authMiddleware');
// const { PERMISSIONS } = require('../utils/roles'); // Your permission constants

const createRolesRouter = (knex) => {
    const router = express.Router();

    // GET all roles
    router.get('/', authenticateToken, /* authorizePermissions(['role:read']), */ async (req, res) => {
        try {
            const roles = await knex('roles')
                .select('id', 'name', 'display_name', 'description', 'is_system_role', 'created_at', 'updated_at')
                .orderBy('name');
            res.json(roles);
        } catch (error) {
            console.error('Error fetching roles:', error);
            res.status(500).json({ message: 'Failed to fetch roles' });
        }
    });

    // GET a single role by ID with its permissions
    router.get('/:id', authenticateToken, /* authorizePermissions(['role:read']), */ async (req, res) => {
        const { id } = req.params;
        try {
            const role = await knex('roles')
                .select('id', 'name', 'display_name', 'description', 'is_system_role', 'created_at', 'updated_at')
                .where({ id })
                .first();

            if (!role) {
                return res.status(404).json({ message: 'Role not found' });
            }

            const permissions = await knex('role_permissions')
                .where({ role_id: id })
                .pluck('permission_id');

            res.json({ ...role, permissions });
        } catch (error) {
            console.error(`Error fetching role ${id}:`, error);
            res.status(500).json({ message: 'Failed to fetch role details' });
        }
    });

    // POST - Create a new role (permissions are NOT assigned here anymore)
    router.post('/', authenticateToken, /* authorizePermissions(['role:create']), */ async (req, res) => {
        const { name, display_name, description } = req.body; // No 'permissions' array here

        if (!name || !display_name) {
            return res.status(400).json({ message: 'Role machine name and display name are required.' });
        }
        if (!/^[a-z0-9_]+$/.test(name)) {
            return res.status(400).json({ message: "Role machine name can only contain lowercase letters, numbers, and underscores." });
        }

        try {
            const [newRoleIdObj] = await knex('roles')
                .insert({
                    name: name.toLowerCase(),
                    display_name,
                    description: description || null, // Ensure description can be null
                    is_system_role: false // Default for new roles, can be changed if needed
                })
                .returning('id');
            
            const roleId = newRoleIdObj.id || newRoleIdObj;
            const newRole = await knex('roles').where({id: roleId}).first();

            // New roles will have an empty permissions array by default
            res.status(201).json({...newRole, permissions: [] }); 
        } catch (error) {
            console.error('Error creating role:', error);
            if (error.code === '23505' && error.constraint === 'roles_name_unique') { // Check for unique constraint on 'name'
                return res.status(409).json({ message: `Role machine name '${name}' already exists.` });
            }
            res.status(500).json({ message: 'Failed to create role' });
        }
    });

    // PUT - Update an existing role (permissions are NOT updated here anymore)
    router.put('/:id', authenticateToken, /* authorizePermissions(['role:update']), */ async (req, res) => {
        const { id } = req.params;
        const { name, display_name, description } = req.body; // No 'permissions' array here

        if (!name && !display_name && description === undefined) {
            return res.status(400).json({ message: 'No update data provided. At least one field (name, display_name, or description) is required.' });
        }
         if (name && !/^[a-z0-9_]+$/.test(name)) {
            return res.status(400).json({ message: "Role machine name can only contain lowercase letters, numbers, and underscores." });
        }

        try {
            const roleToUpdate = await knex('roles').where({ id }).first();
            if (!roleToUpdate) {
                return res.status(404).json({ message: 'Role not found' });
            }

            // Prevent changing name of system role, description is fine
            if (roleToUpdate.is_system_role && name && name !== roleToUpdate.name) {
                return res.status(403).json({ message: 'System role machine name cannot be changed.' });
            }
            
            const updateData = {};
            if (name) updateData.name = name.toLowerCase();
            if (display_name) updateData.display_name = display_name;
            if (description !== undefined) updateData.description = description;

            if (Object.keys(updateData).length === 0) {
                 return res.status(400).json({ message: 'No valid fields provided for update.' });
            }
            updateData.updated_at = knex.fn.now();

            const updatedCount = await knex('roles')
                .where({ id })
                .update(updateData);

            if (updatedCount === 0 && Object.keys(updateData).length > 0) {
                // This case might happen if the data provided is the same as existing data,
                // but we've already checked if roleToUpdate exists.
                // For simplicity, we assume if role exists and updateData is provided, an update should occur or data is identical.
            }
            
            const updatedRole = await knex('roles').where({id}).first();
            // Fetch current permissions for the response, even if not updated by this endpoint
            const currentPermissions = await knex('role_permissions')
                .where({ role_id: id })
                .pluck('permission_id');

            res.json({...updatedRole, permissions: currentPermissions });
        } catch (error) {
            console.error(`Error updating role ${id}:`, error);
            if (error.code === '23505' && error.constraint === 'roles_name_unique') { // Check for unique constraint on 'name'
                return res.status(409).json({ message: `Role machine name '${name}' already exists.` });
            }
            res.status(500).json({ message: 'Failed to update role' });
        }
    });

    // NEW ROUTE: Assign/Update permissions for a specific role
    router.post('/:roleId/permissions', authenticateToken, /* authorizePermissions(['role:assign_permissions']), */ async (req, res) => {
        const { roleId } = req.params;
        const { permissionIds } = req.body;

        if (!Array.isArray(permissionIds)) {
            return res.status(400).json({ message: 'permissionIds must be an array.' });
        }

        try {
            const role = await knex('roles').where({ id: roleId }).first();
            if (!role) {
                return res.status(404).json({ message: 'Role not found.' });
            }

            // Optional: Validate all permissionIds exist in the 'permissions' table
            if (permissionIds.length > 0) {
                const existingPermissionsCount = await knex('permissions').whereIn('id', permissionIds).count('* as count').first();
                if (parseInt(existingPermissionsCount.count, 10) !== permissionIds.length) {
                    // For simplicity, we'll just give a generic error. 
                    // You could find which IDs are invalid if needed.
                    return res.status(400).json({ message: 'One or more provided permission IDs are invalid.' });
                }
            }

            await knex.transaction(async trx => {
                await trx('role_permissions').where({ role_id: roleId }).del();

                if (permissionIds.length > 0) {
                    const newRolePermissions = permissionIds.map(permissionId => ({
                        role_id: parseInt(roleId, 10),
                        permission_id: parseInt(permissionId, 10)
                    }));
                    await trx('role_permissions').insert(newRolePermissions);
                }
            });

            res.status(200).json({ message: `Permissions for role '${role.display_name}' updated successfully.` });

        } catch (error) {
            console.error(`Error updating permissions for role ${roleId}:`, error);
            res.status(500).json({ message: 'Failed to update role permissions.' });
        }
    });

    // DELETE a role
    router.delete('/:id', authenticateToken, /* authorizePermissions(['role:delete']), */ async (req, res) => {
        const { id } = req.params;
        try {
            const role = await knex('roles').where({ id }).first();
            if (!role) {
                return res.status(404).json({ message: 'Role not found' });
            }
            if (role.is_system_role) {
                return res.status(403).json({ message: 'System roles cannot be deleted.' });
            }

            const usersWithRoleCount = await knex('user_roles').where({ role_id: id }).count('* as count').first();
            if (usersWithRoleCount && parseInt(usersWithRoleCount.count, 10) > 0) {
                return res.status(400).json({ message: `Cannot delete role. It is currently assigned to ${usersWithRoleCount.count} user(s). Please unassign it first.` });
            }
            
            await knex.transaction(async trx => {
                await trx('role_permissions').where({ role_id: id }).del();
                await trx('roles').where({ id }).del();
            });

            res.status(200).json({ message: 'Role and its permission assignments deleted successfully' });
        } catch (error) {
            console.error(`Error deleting role ${id}:`, error);
            res.status(500).json({ message: 'Failed to delete role' });
        }
    });

    return router;
};

module.exports = createRolesRouter;