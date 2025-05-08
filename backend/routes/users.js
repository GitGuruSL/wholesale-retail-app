const express = require('express');
const bcrypt = require('bcrypt');
const { PERMISSIONS } = require('../utils/roles');
const { authenticateToken, checkPermission } = require('../middleware/authMiddleware');

function createUsersRouter(knex) {
    const router = express.Router();
    const saltRounds = 10;

    // --- GET /api/users --- List all users with their current store (if set)
    router.get('/', authenticateToken, checkPermission(PERMISSIONS.USER_READ_ALL), async (req, res, next) => {
        try {
            const users = await knex('users')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .leftJoin('stores', 'users.current_store_id', 'stores.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role_id',
                    'roles.name as role_name',
                    'users.employee_id',
                    'users.is_active',
                    'users.created_at as user_created_at',
                    'users.updated_at as user_updated_at',
                    'employees.first_name as emp_first_name',
                    'employees.last_name as emp_last_name',
                    'employees.employee_code',
                    'employees.email as emp_email',
                    'users.first_name as user_first_name',
                    'users.last_name as user_last_name',
                    'users.email as user_email',
                    'users.current_store_id',
                    'stores.name as current_store_name'
                );
            res.json(users);
        } catch (err) {
            console.error("Error fetching users:", err);
            next(err);
        }
    });

    // --- POST /api/users --- Create a new user (with current store)
    router.post('/', authenticateToken, checkPermission(PERMISSIONS.USER_CREATE), async (req, res, next) => {
        const {
            username,
            password,
            role_id,
            employee_id,
            is_active = true,
            first_name,
            last_name,
            email,
            current_store_id  // New field for store assignment
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
                const existingUserLink = await knex('users').where({ employee_id }).first();
                if (existingUserLink) {
                    return res.status(409).json({ message: `Employee ID ${employee_id} is already assigned to another user.` });
                }
            }
      
            // Optional: validate current_store_id if provided
            let storeIdToAssign = null;
            if (current_store_id) {
                const store = await knex('stores').where({ id: current_store_id }).first();
                if (!store) {
                    return res.status(400).json({ message: `Invalid current_store_id: ${current_store_id}. Store does not exist.` });
                }
                storeIdToAssign = parseInt(current_store_id, 10);
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
                email: email || null,
                current_store_id: storeIdToAssign
            };
      
            const [newUserObj] = await knex('users').insert(userData).returning(['id']);
      
            const createdUser = await knex('users')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .leftJoin('stores', 'users.current_store_id', 'stores.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role_id',
                    'roles.name as role_name',
                    'users.employee_id',
                    'users.is_active',
                    'users.created_at as user_created_at',
                    'users.updated_at as user_updated_at',
                    'employees.first_name as emp_first_name',
                    'employees.last_name as emp_last_name',
                    'employees.employee_code',
                    'employees.email as emp_email',
                    'users.first_name as user_first_name',
                    'users.last_name as user_last_name',
                    'users.email as user_email',
                    'users.current_store_id',
                    'stores.name as current_store_name'
                )
                .where('users.id', newUserObj.id)
                .first();
      
            res.status(201).json(createdUser);
        } catch (err) {
            if (err.code === '23505') {
                if (err.constraint && err.constraint.includes('users_username_unique')) {
                    return res.status(409).json({ message: 'Username is already in use.' });
                }
                if (err.constraint && err.constraint.includes('users_employee_id_unique')) {
                    return res.status(409).json({ message: 'This employee is already linked to a user account.' });
                }
                return res.status(409).json({ message: 'A unique field conflict occurred.' });
            }
            console.error("Error creating user:", err);
            next(err);
        }
    });

    // --- GET /api/users/:id --- Fetch a single user by ID (with current store)
    router.get('/:id', authenticateToken, async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }
        // Authorization: user can view their own profile or must have USER_READ_ALL
        if (req.user.id !== userId && !req.user.permissions.includes(PERMISSIONS.USER_READ_ALL)) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to view this user.' });
        }
        try {
            const user = await knex('users')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .leftJoin('stores', 'users.current_store_id', 'stores.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role_id',
                    'roles.name as role_name',
                    'users.employee_id',
                    'users.is_active',
                    'users.created_at as user_created_at',
                    'users.updated_at as user_updated_at',
                    'employees.first_name as emp_first_name',
                    'employees.last_name as emp_last_name',
                    'employees.employee_code',
                    'employees.email as emp_email',
                    'users.first_name as user_first_name',
                    'users.last_name as user_last_name',
                    'users.email as user_email',
                    'users.current_store_id',
                    'stores.name as current_store_name'
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
    
    // --- PUT /api/users/:id --- Update user details (including current store)
    router.put('/:id', authenticateToken, async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        const { username, role_id, employee_id, is_active, first_name, last_name, email, current_store_id } = req.body;
      
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }
      
        // Authorization: allow self-update or require USER_UPDATE_ALL
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
                if (!req.user.permissions.includes(PERMISSIONS.USER_ASSIGN_ROLES) && currentUser.role_id !== parseInt(role_id, 10)) {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to change user roles.' });
                }
                const roleExists = await knex('roles').where({ id: role_id }).first();
                if (!roleExists) return res.status(400).json({ message: `Invalid role_id: ${role_id}. Role does not exist.` });
                updatedUserData.role_id = parseInt(role_id, 10);
            }
      
            if (is_active !== undefined) {
                if (!canUpdateAll && currentUser.is_active !== is_active) {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to change user active status.' });
                }
                updatedUserData.is_active = is_active;
            }
      
            if (first_name !== undefined) updatedUserData.first_name = first_name;
            if (last_name !== undefined) updatedUserData.last_name = last_name;
            if (email !== undefined) updatedUserData.email = email;
      
            if (employee_id !== undefined) {
                if (!canUpdateAll && currentUser.employee_id !== (employee_id ? parseInt(employee_id, 10) : null)) {
                    return res.status(403).json({ message: 'Forbidden: You do not have permission to change employee linkage.' });
                }
                if (employee_id === null) {
                    updatedUserData.employee_id = null;
                } else {
                    const empIdNum = parseInt(employee_id, 10);
                    const employee = await knex('employees').where({ id: empIdNum }).first();
                    if (!employee) return res.status(404).json({ message: `Employee with ID ${empIdNum} not found.` });
                    const existingUserLink = await knex('users')
                        .where({ employee_id: empIdNum })
                        .andWhereNot({ id: userId })
                        .first();
                    if (existingUserLink) return res.status(409).json({ message: `Employee ID ${empIdNum} is already assigned to another user.` });
                    updatedUserData.employee_id = empIdNum;
                }
            }
      
            // --- NEW: Update current store assignment ---
            if (current_store_id !== undefined) {
                if (current_store_id) {
                    const store = await knex('stores').where({ id: current_store_id }).first();
                    if (!store) {
                        return res.status(400).json({ message: `Invalid current_store_id: ${current_store_id}. Store does not exist.` });
                    }
                    updatedUserData.current_store_id = parseInt(current_store_id, 10);
                } else {
                    updatedUserData.current_store_id = null;
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
                .leftJoin('stores', 'users.current_store_id', 'stores.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role_id',
                    'roles.name as role_name',
                    'users.employee_id',
                    'users.is_active',
                    'users.created_at as user_created_at',
                    'users.updated_at as user_updated_at',
                    'employees.first_name as emp_first_name',
                    'employees.last_name as emp_last_name',
                    'employees.employee_code',
                    'employees.email as emp_email',
                    'users.first_name as user_first_name',
                    'users.last_name as user_last_name',
                    'users.email as user_email',
                    'users.current_store_id',
                    'stores.name as current_store_name'
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
            await knex.transaction(async (trx) => {
                // Assuming related deletions (if not handled on cascade)
                await trx('users').where({ id: userId }).del();
            });
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
            const userExists = await knex('users').where({ id: userId }).first();
            if (!userExists) {
                return res.status(404).json({ message: 'User not found.' });
            }
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            await knex('users').where({ id: userId }).update({
                password_hash: hashedPassword,
                updated_at: knex.fn.now()
            });
            res.json({ message: `Password for user ID ${userId} has been reset successfully.` });
        } catch (err) {
            console.error(`Error resetting password for user ${userId}:`, err);
            next(err);
        }
    });

    return router;
}

module.exports = createUsersRouter;