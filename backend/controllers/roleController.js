const knex = require('../db/knex'); // Adjust path to your knex instance

// GET all roles
exports.getAllRoles = async (req, res) => {
    try {
        const roles = await knex('roles')
            .select('id', 'name', 'display_name', 'description', 'is_system_role', 'created_at', 'updated_at')
            .orderBy('name');
        res.json(roles);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
};

// GET a single role by ID with its permissions
exports.getRoleById = async (req, res) => {
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
};

// POST - Create a new role
exports.createRole = async (req, res) => {
    const { name, display_name, description } = req.body;

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
                description: description || null,
                is_system_role: false
            })
            .returning('id');
        
        const roleId = newRoleIdObj.id || newRoleIdObj;
        const newRole = await knex('roles').where({id: roleId}).first();

        res.status(201).json({...newRole, permissions: [] }); 
    } catch (error) {
        console.error('Error creating role:', error);
        if (error.code === '23505' && error.constraint === 'roles_name_unique') {
            return res.status(409).json({ message: `Role machine name '${name}' already exists.` });
        }
        res.status(500).json({ message: 'Failed to create role' });
    }
};

// PUT - Update an existing role
exports.updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, display_name, description } = req.body;

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

        await knex('roles')
            .where({ id })
            .update(updateData);
        
        const updatedRole = await knex('roles').where({id}).first();
        const currentPermissions = await knex('role_permissions')
            .where({ role_id: id })
            .pluck('permission_id');

        res.json({...updatedRole, permissions: currentPermissions });
    } catch (error) {
        console.error(`Error updating role ${id}:`, error);
        if (error.code === '23505' && error.constraint === 'roles_name_unique') {
            return res.status(409).json({ message: `Role machine name '${name}' already exists.` });
        }
        res.status(500).json({ message: 'Failed to update role' });
    }
};

// Assign/Update permissions for a specific role
exports.assignPermissionsToRole = async (req, res) => {
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

        if (permissionIds.length > 0) {
            const existingPermissionsCount = await knex('permissions').whereIn('id', permissionIds).count('* as count').first();
            if (parseInt(existingPermissionsCount.count, 10) !== permissionIds.length) {
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
};

// DELETE a role
exports.deleteRole = async (req, res) => {
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
};