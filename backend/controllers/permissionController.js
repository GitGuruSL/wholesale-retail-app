const knex = require('../db/knex'); // Adjust path

exports.getStructuredPermissions = async (req, res) => {
    try {
        const permissionsData = await knex('permissions as p')
            .join('permission_categories as pc', 'p.permission_category_id', 'pc.id')
            .select(
                'p.id as permission_id',
                'p.name as permission_name',
                'p.display_name as permission_display_name',
                'p.description as permission_description',
                'p.sub_group_key',
                'p.sub_group_display_name',
                'pc.id as category_id',
                'pc.name as category_name',
                'pc.display_order as category_display_order'
            )
            .orderBy(['pc.display_order', 'pc.name', 'p.sub_group_display_name', 'p.display_name']);

        if (!permissionsData.length) {
            return res.json([]);
        }

        const structuredPermissions = permissionsData.reduce((acc, perm) => {
            let category = acc.find(cat => cat.categoryName === perm.category_name);
            if (!category) {
                category = {
                    categoryName: perm.category_name,
                    displayOrder: perm.category_display_order,
                    subGroups: []
                };
                acc.push(category);
            }

            let subGroup = category.subGroups.find(sg => sg.subGroupName === perm.sub_group_display_name);
            if (!subGroup) {
                subGroup = {
                    subGroupName: perm.sub_group_display_name,
                    subGroupKey: perm.sub_group_key,
                    permissions: []
                };
                category.subGroups.push(subGroup);
            }

            subGroup.permissions.push({
                id: perm.permission_id,
                name: perm.permission_name,
                display_name: perm.permission_display_name,
                description: perm.permission_description
            });
            return acc;
        }, []);

        structuredPermissions.sort((a, b) => a.displayOrder - b.displayOrder);
        structuredPermissions.forEach(category => {
            if (category.subGroups) {
                category.subGroups.sort((a, b) => {
                    if (a.subGroupName && b.subGroupName) {
                        return a.subGroupName.localeCompare(b.subGroupName);
                    }
                    return 0;
                });
            }
        });
        res.status(200).json(structuredPermissions);
    } catch (error) {
        console.error('Error fetching structured permissions:', error);
        res.status(500).json({ message: 'Failed to fetch permissions.' });
    }
};

exports.getFlatListOfPermissions = async (req, res) => {
    try {
        const permissions = await knex('permissions')
            .leftJoin('permission_categories', 'permissions.permission_category_id', 'permission_categories.id')
            .select(
                'permissions.id',
                'permissions.name',
                'permissions.display_name',
                'permissions.description',
                'permissions.permission_category_id',
                'permission_categories.name as category_name',
                'permissions.sub_group_key',
                'permissions.sub_group_display_name',
                'permissions.created_at',
                'permissions.updated_at'
            )
            .orderBy('permissions.display_name');
        res.status(200).json(permissions);
    } catch (error) {
        console.error('Error fetching flat list of permissions:', error);
        res.status(500).json({ message: 'Failed to fetch permissions list.' });
    }
};

exports.getPermissionById = async (req, res) => {
    const { id } = req.params;
    try {
        const permission = await knex('permissions')
            .select(
                'id',
                'name',
                'display_name',
                'description',
                'permission_category_id',
                'sub_group_key',
                'sub_group_display_name',
                'created_at',
                'updated_at'
            )
            .where({ id })
            .first();

        if (!permission) {
            return res.status(404).json({ message: 'Permission not found.' });
        }
        res.status(200).json(permission);
    } catch (error) {
        console.error(`Error fetching permission with ID ${id}:`, error);
        res.status(500).json({ message: 'Failed to fetch permission details.' });
    }
};

exports.createPermission = async (req, res) => {
    const {
        name,
        display_name,
        description,
        permission_category_id,
        sub_group_key,
        sub_group_display_name
    } = req.body;

    if (!name || !display_name || !permission_category_id || !sub_group_key || !sub_group_display_name) {
        return res.status(400).json({ message: 'Name, Display Name, Category ID, Sub-Group Key, and Sub-Group Display Name are required.' });
    }
    if (!/^[a-z0-9_:-]+$/.test(name.trim())) {
        return res.status(400).json({ message: 'Permission Name (code) can only contain lowercase letters, numbers, underscores, hyphens, and colons (e.g., user:create).' });
    }

    try {
        const categoryExists = await knex('permission_categories').where({ id: permission_category_id }).first();
        if (!categoryExists) {
            return res.status(400).json({ message: `Permission Category with ID ${permission_category_id} not found.` });
        }

        const inserted = await knex('permissions').insert({
            name: name.trim(),
            display_name: display_name.trim(),
            description: description ? description.trim() : null,
            permission_category_id: parseInt(permission_category_id, 10),
            sub_group_key: sub_group_key.trim(),
            sub_group_display_name: sub_group_display_name.trim()
        }).returning('id');
        
        const newPermissionId = Array.isArray(inserted)
            ? (inserted[0].id || inserted[0])
            : inserted;
        
        const newPermission = await knex('permissions').where({ id: newPermissionId }).first();
        res.status(201).json(newPermission);
    } catch (error) {
        console.error('Error creating permission:', error);
        if (error.code === '23505' && error.constraint === 'permissions_name_unique') {
            return res.status(409).json({ message: `Permission with name '${name}' already exists.` });
        }
        if (error.code === '23503' && error.constraint && error.constraint.includes('permissions_permission_category_id_foreign')) {
            return res.status(400).json({ message: `Invalid Permission Category ID: ${permission_category_id}. Category does not exist.` });
        }
        res.status(500).json({ message: 'Failed to create permission.' });
    }
};

exports.updatePermission = async (req, res) => {
    const { id } = req.params;
    const {
        display_name,
        description,
        permission_category_id,
        sub_group_key,
        sub_group_display_name
    } = req.body;

    if (!display_name || !permission_category_id || !sub_group_key || !sub_group_display_name) {
        return res.status(400).json({ message: 'Display Name, Category ID, Sub-Group Key, and Sub-Group Display Name are required.' });
    }

    try {
        const categoryExists = await knex('permission_categories').where({ id: permission_category_id }).first();
        if (!categoryExists) {
            return res.status(400).json({ message: `Permission Category with ID ${permission_category_id} not found.` });
        }

        const updatedCount = await knex('permissions')
            .where({ id })
            .update({
                display_name: display_name.trim(),
                description: description ? description.trim() : null,
                permission_category_id: parseInt(permission_category_id, 10),
                sub_group_key: sub_group_key.trim(),
                sub_group_display_name: sub_group_display_name.trim(),
                updated_at: knex.fn.now()
            });

        if (updatedCount === 0) {
            return res.status(404).json({ message: 'Permission not found or no changes made.' });
        }
        const updatedPermission = await knex('permissions').where({ id }).first();
        res.status(200).json(updatedPermission);
    } catch (error) {
        console.error(`Error updating permission with ID ${id}:`, error);
        if (error.code === '23503' && error.constraint && error.constraint.includes('permissions_permission_category_id_foreign')) {
            return res.status(400).json({ message: `Invalid Permission Category ID: ${permission_category_id}. Category does not exist.` });
        }
        res.status(500).json({ message: 'Failed to update permission.' });
    }
};

exports.deletePermission = async (req, res) => {
    const { id } = req.params;
    const forceDelete = req.query.force === 'true';
    try {
        if (!forceDelete) {
            const rolesUsingPermission = await knex('role_permissions').where({ permission_id: id }).count('* as count').first();
            if (rolesUsingPermission && parseInt(rolesUsingPermission.count, 10) > 0) {
                return res.status(400).json({
                    message: `Cannot delete permission. It is currently assigned to ${rolesUsingPermission.count} role(s). Please unassign it first or use force deletion.`
                });
            }
        } else {
            await knex('role_permissions').where({ permission_id: id }).del();
        }

        const deletedCount = await knex('permissions').where({ id }).del();
        if (deletedCount === 0) {
            return res.status(404).json({ message: 'Permission not found.' });
        }
        res.status(200).json({ message: 'Permission deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting permission with ID ${id}:`, error);
        res.status(500).json({ message: 'Failed to delete permission.' });
    }
};