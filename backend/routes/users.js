const express = require('express');
const bcrypt = require('bcrypt');
const { PERMISSIONS } = require('../utils/roles'); // Your permissions constants
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

function createUsersRouter(knex) {
    const router = express.Router();
    const saltRounds = 10;

    // --- GET /api/users --- List all users
    router.get('/', authenticateToken, checkPermission(PERMISSIONS.USER_READ_ALL), async (req, res, next) => {
        try {
            const users = await knex('users')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role_id',
                    'roles.name as role_name',
                    'users.employee_id',
                    'users.is_active',
                    'users.created_at as user_created_at', // Alias to avoid conflict if joining other tables with timestamps
                    'users.updated_at as user_updated_at', // Alias
                    'employees.first_name as emp_first_name', // Alias for clarity
                    'employees.last_name as emp_last_name',   // Alias
                    'employees.employee_code',
                    'employees.email as emp_email',           // Alias
                    'users.first_name as user_first_name',
                    'users.last_name as user_last_name',
                    'users.email as user_email'
                );
            res.json(users);
        } catch (err) {
            console.error("Error fetching users:", err);
            next(err);
        }
    });

    // --- POST /api/users --- Create a new user
    router.post('/', authenticateToken, checkPermission(PERMISSIONS.USER_CREATE), async (req, res, next) => {
        const {
            username, password, role_id, employee_id,
            is_active = true, first_name, last_name, email
        } = req.body;

        if (!username || !password || role_id === undefined) {
            return res.status(400).json({ message: 'Username, password, and role_id are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        try {
            const roleExists = await knex('roles').where({ id: role_id }).first();
            if (!roleExists) {
                return res.status(400).json({ message: `Invalid role_id: ${role_id}. Role does not exist.` });
            }

            if (employee_id) {
                const employee = await knex('employees').where({ id: employee_id }).first();
                if (!employee) {
                    return res.status(404).json({ message: `Employee with ID ${employee_id} not found.` });
                }
                // Check if employee_id is already linked, only if users.employee_id has a unique constraint
                // If users.employee_id is nullable and not unique, this check might be too strict or handled differently
                const existingUserLink = await knex('users').where({ employee_id: employee_id }).first();
                if (existingUserLink) {
                    return res.status(409).json({ message: `Employee ID ${employee_id} is already assigned to another user.` });
                }
            }

            const hashedPassword = await bcrypt.hash(password, saltRounds);
            const userData = {
                username,
                password_hash: hashedPassword,
                role_id: parseInt(role_id, 10),
                employee_id: employee_id ? parseInt(employee_id, 10) : null,
                is_active: typeof is_active === 'boolean' ? is_active : true,
                first_name: first_name || null,
                last_name: last_name || null,
                email: email || null
            };

            const [newUserObject] = await knex('users').insert(userData).returning(['id', 'username']); // Return minimal necessary fields

            const createdUser = await knex('users')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .select(
                    'users.id as user_id', 'users.username', 'users.role_id', 'roles.name as role_name',
                    'users.employee_id', 'users.is_active', 'users.created_at as user_created_at', 'users.updated_at as user_updated_at',
                    'employees.first_name as emp_first_name', 'employees.last_name as emp_last_name', 'employees.employee_code', 'employees.email as emp_email',
                    'users.first_name as user_first_name', 'users.last_name as user_last_name', 'users.email as user_email'
                )
                .where('users.id', newUserObject.id)
                .first();

            res.status(201).json(createdUser);
        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation (PostgreSQL)
                if (err.constraint && err.constraint.includes('users_username_unique')) {
                    return res.status(409).json({ message: 'Username is already in use.' });
                }
                if (err.constraint && err.constraint.includes('users_employee_id_unique')) { // Assuming you have this constraint
                    return res.status(409).json({ message: 'This employee is already linked to a user account.' });
                }
                 return res.status(409).json({ message: 'A unique field conflict occurred.' }); // Generic unique conflict
            }
            console.error("Error creating user:", err);
            next(err);
        }
    });

    // --- GET /api/users/:id --- Fetch a single user by ID
    router.get('/:id', authenticateToken, async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }

        // Authorization: User can read their own profile OR must have USER_READ_ALL permission
        if (req.user.id !== userId && !req.user.permissions.includes(PERMISSIONS.USER_READ_ALL)) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view this user.' });
        }
        // If only USER_READ_ALL is allowed, the above check simplifies to just checkPermission(PERMISSIONS.USER_READ_ALL) in the route definition

        try {
            const user = await knex('users')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .select(
                    'users.id as user_id', 'users.username', 'users.role_id', 'roles.name as role_name',
                    'users.employee_id', 'users.is_active', 'users.created_at as user_created_at', 'users.updated_at as user_updated_at',
                    'employees.first_name as emp_first_name', 'employees.last_name as emp_last_name', 'employees.employee_code', 'employees.email as emp_email',
                    'users.first_name as user_first_name', 'users.last_name as user_last_name', 'users.email as user_email'
                )
                .where({ 'users.id': userId })
                .first();

            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }
            res.json(user);
        } catch (err) {
            console.error(`Error fetching user ${userId}:`, err);
            next(err);
        }
    });

    // --- PUT /api/users/:id --- Update user details
    router.put('/:id', authenticateToken, async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        const { username, role_id, employee_id, is_active, first_name, last_name, email } = req.body;

        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }

        // Authorization: User can update their own profile OR must have USER_UPDATE_ALL permission
        const canUpdateSelf = req.user.id === userId && req.user.permissions.includes(PERMISSIONS.USER_UPDATE_SELF);
        const canUpdateAll = req.user.permissions.includes(PERMISSIONS.USER_UPDATE_ALL);

        if (!canUpdateSelf && !canUpdateAll) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to update this user.' });
        }

        try {
            const currentUser = await knex('users').where({ id: userId }).first();
            if (!currentUser) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const updatedUserData = {};
            if (username !== undefined) updatedUserData.username = username;
            if (role_id !== undefined) {
                // Only allow role_id change if user has USER_ASSIGN_ROLES permission
                if (!req.user.permissions.includes(PERMISSIONS.USER_ASSIGN_ROLES) && currentUser.role_id !== parseInt(role_id, 10)) {
                     return res.status(403).json({ message: 'Forbidden: You do not have permission to change user roles.' });
                }
                const roleExists = await knex('roles').where({ id: role_id }).first();
                if (!roleExists) return res.status(400).json({ message: `Invalid role_id: ${role_id}. Role does not exist.` });
                updatedUserData.role_id = parseInt(role_id, 10);
            }
            if (is_active !== undefined) {
                // Potentially restrict who can deactivate/activate users
                if (!canUpdateAll && currentUser.is_active !== is_active) { // Example: only admin can change active status
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to change user active status.' });
                }
                updatedUserData.is_active = is_active;
            }

            if (first_name !== undefined) updatedUserData.first_name = first_name;
            if (last_name !== undefined) updatedUserData.last_name = last_name;
            if (email !== undefined) updatedUserData.email = email;

            if (employee_id !== undefined) {
                // Only allow employee_id change if user has appropriate permission (e.g., USER_UPDATE_ALL or a specific one)
                if (!canUpdateAll && currentUser.employee_id !== (employee_id ? parseInt(employee_id, 10) : null) ) {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to change employee linkage.' });
                }
                if (employee_id === null) {
                    updatedUserData.employee_id = null;
                } else {
                    const empIdNum = parseInt(employee_id, 10);
                    const employee = await knex('employees').where({ id: empIdNum }).first();
                    if (!employee) return res.status(404).json({ message: `Employee with ID ${empIdNum} not found.` });

                    const existingUserLink = await knex('users').where({ employee_id: empIdNum }).andWhereNot({ id: userId }).first();
                    if (existingUserLink) return res.status(409).json({ message: `Employee ID ${empIdNum} is already assigned to another user.` });
                    updatedUserData.employee_id = empIdNum;
                }
            }

            if (Object.keys(updatedUserData).length === 0) {
                return res.status(400).json({ message: 'No valid update data provided.' });
            }
            updatedUserData.updated_at = knex.fn.now();

            await knex('users').where({ id: userId }).update(updatedUserData);

            const updatedUser = await knex('users')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .select(
                    'users.id as user_id', 'users.username', 'users.role_id', 'roles.name as role_name',
                    'users.employee_id', 'users.is_active', 'users.created_at as user_created_at', 'users.updated_at as user_updated_at',
                    'employees.first_name as emp_first_name', 'employees.last_name as emp_last_name', 'employees.employee_code', 'employees.email as emp_email',
                    'users.first_name as user_first_name', 'users.last_name as user_last_name', 'users.email as user_email'
                )
                .where('users.id', userId)
                .first();

            res.json(updatedUser);
        } catch (err) {
            if (err.code === '23505') {
                 if (err.constraint && err.constraint.includes('users_username_unique')) {
                    return res.status(409).json({ message: 'Username is already in use by another account.' });
                }
                 if (err.constraint && err.constraint.includes('users_employee_id_unique')) {
                    return res.status(409).json({ message: 'This employee is already linked to another user account.' });
                }
                 return res.status(409).json({ message: 'A unique field conflict occurred.' });
            }
            console.error(`Error updating user ${userId}:`, err);
            next(err);
        }
    });

    // --- DELETE /api/users/:id --- Delete a user
    router.delete('/:id', authenticateToken, checkPermission(PERMISSIONS.USER_DELETE), async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }

        if (req.user.id === userId) {
            return res.status(403).json({ message: "You cannot delete your own account through this endpoint." });
        }

        try {
            // Check if user is linked to critical data before deleting, or rely on DB constraints / soft delete
            const deletedCount = await knex.transaction(async (trx) => {
                await trx('user_stores').where({ user_id: userId }).del(); // Assuming ON DELETE CASCADE is on user_stores.user_id
                // Add deletions from other related tables if necessary and not handled by CASCADE
                const count = await trx('users').where({ id: userId }).del();
                return count;
            });

            if (deletedCount === 0) {
                return res.status(404).json({ message: 'User not found or already deleted.' });
            }
            res.status(200).json({ message: `User ID ${userId} deleted successfully.` });
        } catch (err) {
            console.error(`Error deleting user ${userId}:`, err);
            next(err);
        }
    });

    // --- PUT /api/users/:id/reset-password --- Reset user password (Admin action)
    router.put('/:id/reset-password', authenticateToken, checkPermission(PERMISSIONS.USER_UPDATE_ALL), async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        const { newPassword } = req.body;

        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        try {
            const userExists = await knex('users').where({id: userId}).first();
            if (!userExists) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            await knex('users')
                .where({ id: userId })
                .update({
                    password_hash: hashedPassword,
                    updated_at: knex.fn.now()
                });

            res.json({ message: `Password for user ID ${userId} has been reset successfully.` });
        } catch (err) {
            console.error(`Error resetting password for user ${userId}:`, err);
            next(err);
        }
    });

    // --- User-Store Assignment Routes ---
    // GET assigned stores for a user
    router.get('/:userId/stores', authenticateToken, checkPermission(PERMISSIONS.USER_ASSIGN_STORES), async (req, res, next) => {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) { return res.status(400).json({ message: 'User ID must be a number.' }); }
        try {
            const userExists = await knex('users').where({ id: userId }).first();
            if (!userExists) { return res.status(404).json({ message: 'User not found.' }); }

            const assignedStores = await knex('user_stores')
                .join('stores', 'user_stores.store_id', 'stores.id')
                .where({ 'user_stores.user_id': userId })
                // Select only columns that exist in your 'stores' table
                .select('stores.id', 'stores.name'); // Assuming 'stores' has 'id' and 'name'
            res.json(assignedStores);
        } catch (err) {
            console.error(`Error fetching stores for user ${userId}:`, err);
            next(err);
        }
    });

    // PUT (update/replace) assigned stores for a user
    router.put('/:userId/stores', authenticateToken, checkPermission(PERMISSIONS.USER_ASSIGN_STORES), async (req, res, next) => {
        const userId = parseInt(req.params.userId, 10);
        const { storeIds } = req.body; // Expect an array of store IDs

        if (isNaN(userId)) { return res.status(400).json({ message: 'User ID must be a number.' }); }
        if (!Array.isArray(storeIds) || !storeIds.every(id => Number.isInteger(id))) {
            return res.status(400).json({ message: 'storeIds must be an array of integers.' });
        }

        try {
            const userExists = await knex('users').where({ id: userId }).first();
            if (!userExists) { return res.status(404).json({ message: 'User not found.' }); }

            if (storeIds.length > 0) {
                const validStores = await knex('stores').whereIn('id', storeIds).pluck('id');
                if (validStores.length !== storeIds.length) {
                    const invalidProvidedIds = storeIds.filter(id => !validStores.includes(id));
                    return res.status(400).json({ message: `One or more invalid store IDs provided: ${invalidProvidedIds.join(', ')}.` });
                }
            }

            await knex.transaction(async (trx) => {
                await trx('user_stores').where({ user_id: userId }).del();
                if (storeIds.length > 0) {
                    const newAssignments = storeIds.map(storeId => ({ user_id: userId, store_id: storeId }));
                    await trx('user_stores').insert(newAssignments);
                }
            });

            const updatedAssignedStores = await knex('user_stores')
                .join('stores', 'user_stores.store_id', 'stores.id')
                .where({ 'user_stores.user_id': userId })
                // Select only columns that exist in your 'stores' table
                .select('stores.id', 'stores.name'); // Assuming 'stores' has 'id' and 'name'
            res.json(updatedAssignedStores);
        } catch (err) {
            console.error(`Error updating stores for user ${userId}:`, err);
            next(err);
        }
    });

    return router;
}

module.exports = createUsersRouter;