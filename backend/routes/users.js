const express = require('express');
const bcrypt = require('bcrypt');
const ROLES = require('../utils/roles'); // Adjust path if needed
const authorizeRoles = require('../middleware/authorizeRoles'); // Adjust path if needed

function createUsersRouter(knex) {
    const router = express.Router();
    const saltRounds = 10; // Cost factor for hashing

    // --- GET /api/users --- List all users
    // Requires GLOBAL_ADMIN role
    router.get('/', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        try {
            const users = await knex('users')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .select(
                    'users.id as user_id', // Alias to avoid confusion if employees also had an 'id' selected
                    'users.username',
                    'users.role',
                    'users.employee_id',
                    'users.created_at',
                    'users.updated_at',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.employee_code',
                    'employees.email as employee_email' // Alias to distinguish from a potential future user email
                );
            res.json(users);
        } catch (err) {
            console.error("Error fetching users:", err);
            next(err);
        }
    });

    // --- POST /api/users --- Create a new user
    // Requires GLOBAL_ADMIN role
    router.post('/', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        const { username, password, role, employee_id } = req.body;

        // Basic Validation
        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Username, password, and role are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }
        // Ensure role is valid and not trying to create another GLOBAL_ADMIN directly (if that's a rule)
        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified.' });
        }
        // Optional: Prevent direct creation of GLOBAL_ADMIN if desired
        // if (role === ROLES.GLOBAL_ADMIN && req.user.role !== ROLES.GLOBAL_ADMIN) { // Or some other check
        //     return res.status(403).json({ message: 'Forbidden to create Global Admin.' });
        // }

        if (employee_id && isNaN(parseInt(employee_id, 10))) {
            return res.status(400).json({ message: 'Employee ID must be a number.' });
        }

        try {
            // If employee_id is provided, validate it
            if (employee_id) {
                const employee = await knex('employees').where({ id: employee_id }).first();
                if (!employee) {
                    return res.status(404).json({ message: `Employee with ID ${employee_id} not found.` });
                }
                // Check if this employee is already linked to a user
                const existingUserLink = await knex('users').where({ employee_id: employee_id }).first();
                if (existingUserLink) {
                    return res.status(409).json({ message: `Employee ID ${employee_id} is already assigned to another user.` });
                }
            }

            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const [newUserObject] = await knex('users')
                .insert({
                    username,
                    password_hash: hashedPassword,
                    role,
                    employee_id: employee_id ? parseInt(employee_id, 10) : null,
                })
                .returning(['id', 'username', 'role', 'employee_id', 'created_at', 'updated_at']);

            if (!newUserObject) { // Should not happen if insert is successful
                throw new Error('User creation failed after insert.');
            }
            
            // Fetch complete new user details including employee info for the response
            const newUserDetails = await knex('users')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role',
                    'users.employee_id',
                    'users.created_at',
                    'users.updated_at',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.employee_code',
                    'employees.email as employee_email'
                )
                .where('users.id', newUserObject.id)
                .first();


            console.log(`User created: ${newUserDetails.username} (ID: ${newUserDetails.user_id})`);
            res.status(201).json(newUserDetails);

        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation
                if (err.constraint && err.constraint.includes('users_username_unique')) {
                    console.error(`Error creating user: Username already exists.`);
                    return res.status(409).json({ message: 'Username is already in use.' });
                }
                if (err.constraint && err.constraint.includes('users_employee_id_unique')) { // If you added a unique constraint on employee_id
                    console.error(`Error creating user: Employee ID already linked.`);
                    return res.status(409).json({ message: 'This employee is already linked to a user account.' });
                }
            }
            console.error("Error creating user:", err);
            next(err);
        }
    });

    // --- GET /api/users/:id --- Fetch a single user by ID
    // Requires GLOBAL_ADMIN role
    router.get('/:id', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }

        try {
            const user = await knex('users')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role',
                    'users.employee_id',
                    'users.created_at',
                    'users.updated_at',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.employee_code',
                    'employees.email as employee_email'
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

    // --- PUT /api/users/:id --- Update user details (username, role, employee_id)
    // Requires GLOBAL_ADMIN role
    router.put('/:id', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        const { username, role, employee_id } = req.body; // Password is not updated here

        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }

        // Basic validation for presence of fields being updated
        if (username === undefined && role === undefined && employee_id === undefined) {
            return res.status(400).json({ message: 'No update data provided.' });
        }
        if (role && !Object.values(ROLES).includes(role)) {
            return res.status(400).json({ message: 'Invalid role specified.' });
        }
        if (employee_id !== undefined && employee_id !== null && isNaN(parseInt(employee_id, 10))) {
            return res.status(400).json({ message: 'Employee ID must be a number or null.' });
        }

        try {
            const currentUser = await knex('users').where({ id: userId }).first();
            if (!currentUser) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const updatedUserData = {};
            if (username !== undefined) updatedUserData.username = username;
            if (role !== undefined) updatedUserData.role = role;
            
            if (employee_id !== undefined) { // Allows setting to null or a new ID
                if (employee_id === null) {
                    updatedUserData.employee_id = null;
                } else {
                    const empIdNum = parseInt(employee_id, 10);
                    const employee = await knex('employees').where({ id: empIdNum }).first();
                    if (!employee) {
                        return res.status(404).json({ message: `Employee with ID ${empIdNum} not found.` });
                    }
                    // Check if this employee is already linked to another user (excluding the current user)
                    const existingUserLink = await knex('users')
                        .where({ employee_id: empIdNum })
                        .andWhereNot({ id: userId })
                        .first();
                    if (existingUserLink) {
                        return res.status(409).json({ message: `Employee ID ${empIdNum} is already assigned to another user.` });
                    }
                    updatedUserData.employee_id = empIdNum;
                }
            }

            if (Object.keys(updatedUserData).length === 0) {
                return res.status(400).json({ message: 'No valid update data provided.' });
            }
            updatedUserData.updated_at = knex.fn.now();


            const [resultObject] = await knex('users')
                .where({ id: userId })
                .update(updatedUserData)
                .returning(['id', 'username', 'role', 'employee_id', 'created_at', 'updated_at']);
            
            if (!resultObject) { // Should not happen if user was found earlier
                 return res.status(404).json({ message: 'User not found during update.' });
            }

            const updatedUserDetails = await knex('users')
                .leftJoin('employees', 'users.employee_id', 'employees.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role',
                    'users.employee_id',
                    'users.created_at',
                    'users.updated_at',
                    'employees.first_name',
                    'employees.last_name',
                    'employees.employee_code',
                    'employees.email as employee_email'
                )
                .where('users.id', resultObject.id)
                .first();

            console.log(`User updated: ID ${userId}`);
            res.json(updatedUserDetails);

        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation
                if (err.constraint && err.constraint.includes('users_username_unique')) {
                    console.error(`Error updating user ${userId}: Username already exists.`);
                    return res.status(409).json({ message: 'Username is already in use by another account.' });
                }
                 if (err.constraint && err.constraint.includes('users_employee_id_unique')) {
                    console.error(`Error updating user ${userId}: Employee ID already linked.`);
                    return res.status(409).json({ message: 'This employee is already linked to another user account.' });
                }
            }
            console.error(`Error updating user ${userId}:`, err);
            next(err);
        }
    });

    // --- DELETE /api/users/:id --- Delete a user
    // Requires GLOBAL_ADMIN role
    router.delete('/:id', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }

        try {
            // Check if the user is trying to delete themselves (optional, but often good practice)
            // if (req.user && req.user.userId === userId) {
            //     return res.status(403).json({ message: "You cannot delete your own account." });
            // }

            const deletedCount = await knex.transaction(async (trx) => {
                // If you have user_stores or other related tables with foreign keys to users.id,
                // ensure ON DELETE CASCADE is set on those foreign keys in your migrations.
                // Otherwise, you'd need to delete from child tables first:
                // await trx('user_stores').where({ user_id: userId }).del();
                // await trx('other_related_table').where({ user_id: userId }).del();

                const count = await trx('users').where({ id: userId }).del();
                return count;
            });

            if (deletedCount === 0) {
                return res.status(404).json({ message: 'User not found.' });
            }

            console.log(`User deleted: ID ${userId}`);
            res.status(200).json({ message: `User ID ${userId} deleted successfully.` });

        } catch (err) {
            console.error(`Error deleting user ${userId}:`, err);
            next(err);
        }
    });

    // --- PUT /api/users/:id/reset-password --- Reset user password (Admin action)
    // Requires GLOBAL_ADMIN role
    router.put('/:id/reset-password', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        const userId = parseInt(req.params.id, 10);
        const { newPassword } = req.body;

        if (isNaN(userId)) {
            return res.status(400).json({ message: 'User ID must be a number.' });
        }
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

            const updatedCount = await knex('users')
                .where({ id: userId })
                .update({
                    password_hash: hashedPassword,
                    updated_at: knex.fn.now()
                });

            if (updatedCount === 0) {
                 return res.status(404).json({ message: 'User not found.' });
            }

            console.log(`Password reset for user ID: ${userId}`);
            res.json({ message: `Password for user ID ${userId} has been reset successfully.` });

        } catch (err) {
            console.error(`Error resetting password for user ${userId}:`, err);
            next(err);
        }
    });

    // --- User-Store Assignment Routes ---
    // These routes should be fine as they operate on user_id and store_id
    router.get('/:userId/stores', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) { return res.status(400).json({ message: 'User ID must be a number.' }); }
        try {
            const userExists = await knex('users').where({ id: userId }).first();
            if (!userExists) { return res.status(404).json({ message: 'User not found.' }); }

            const assignedStoreIds = await knex('user_stores').where({ user_id: userId }).pluck('store_id');
            res.json(assignedStoreIds);
        } catch (err) {
            console.error(`Error fetching stores for user ${userId}:`, err);
            next(err);
        }
    });

    router.put('/:userId/stores', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        const userId = parseInt(req.params.userId, 10);
        const { storeIds } = req.body; // Expect an array of store IDs

        if (isNaN(userId)) { return res.status(400).json({ message: 'User ID must be a number.' }); }
        if (!Array.isArray(storeIds)) { return res.status(400).json({ message: 'storeIds must be an array.' }); }

        try {
            const userExists = await knex('users').where({ id: userId }).first();
            if (!userExists) { return res.status(404).json({ message: 'User not found.' }); }

            // Validate store IDs (optional, but good practice)
            if (storeIds.length > 0) {
                const validStoreIds = await knex('stores').whereIn('id', storeIds).pluck('id');
                if (validStoreIds.length !== storeIds.length) {
                    return res.status(400).json({ message: 'One or more invalid store IDs provided.' });
                }
            }

            await knex.transaction(async (trx) => {
                await trx('user_stores').where({ user_id: userId }).del(); // Clear existing assignments

                if (storeIds.length > 0) {
                    const newAssignments = storeIds
                        .map(id => parseInt(id, 10))
                        .filter(id => !isNaN(id)) // Ensure they are numbers
                        .map(storeId => ({ user_id: userId, store_id: storeId }));
                    
                    if (newAssignments.length > 0) {
                        await trx('user_stores').insert(newAssignments);
                    }
                }
            });

            const updatedAssignedStoreIds = await knex('user_stores').where({ user_id: userId }).pluck('store_id');
            res.json(updatedAssignedStoreIds);
        } catch (err) {
            console.error(`Error updating stores for user ${userId}:`, err);
            next(err);
        }
    });

    return router;
}

module.exports = createUsersRouter;