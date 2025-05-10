// filepath: d:\Development\wholesale-retail-app\backend\routes\auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/authMiddleware');

function createAuthRouter(knex) {
    const router = express.Router();

    // --- POST /api/auth/login --- User Login
    router.post('/login', async (req, res, next) => {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        try {
            const user = await knex('users')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .leftJoin('stores', 'users.current_store_id', 'stores.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.password_hash',
                    'users.role_id',
                    'roles.name as role_name',
                    'roles.display_name as role_display_name',
                    'users.employee_id',
                    'users.first_name',
                    'users.last_name',
                    'users.email',
                    'users.is_active',
                    'users.current_store_id as store_id',
                    'stores.name as store_name'
                )
                .whereRaw('LOWER(users.username) = LOWER(?)', [username])
                .first();

            if (!user) {
                console.warn(`Login attempt: User not found - ${username}`);
                return res.status(401).json({ message: 'Invalid username or password.' });
            }

            if (!user.is_active) {
                console.warn(`Login attempt: User inactive - ${username}`);
                return res.status(403).json({ message: 'Account is inactive. Please contact an administrator.' });
            }

            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (!passwordMatch) {
                console.warn(`Login attempt: Invalid password for user - ${username}`);
                return res.status(401).json({ message: 'Invalid username or password.' });
            }

            const permissionsData = await knex('role_permissions')
                .select('permissions.name as permission_name')
                .join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .where({ 'role_permissions.role_id': user.role_id });

            const userPermissions = permissionsData.map(p => p.permission_name);

            const jwtPayload = {
                userId: user.user_id,
                username: user.username,
                roleId: user.role_id,
                roleName: user.role_name,
                roleDisplayName: user.role_display_name,
                permissions: userPermissions,
                storeId: user.store_id,
            };

            if (!process.env.JWT_SECRET) {
                console.error("CRITICAL: JWT_SECRET is not defined. Cannot sign token.");
                return res.status(500).json({ message: "Authentication configuration error." });
            }

            const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });

            const userResponse = {
                user_id: user.user_id,
                username: user.username,
                role_id: user.role_id,
                role_name: user.role_name,
                role_display_name: user.role_display_name,
                employee_id: user.employee_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                is_active: user.is_active,
                permissions: userPermissions,
                store_id: user.store_id,
                store_name: user.store_name
            };

            console.log(`Login successful: User ${user.username} (ID: ${user.user_id}, Role: ${user.role_name}, Store ID: ${user.store_id}, Store Name: ${user.store_name})`);
            res.json({
                message: 'Login successful',
                token,
                user: userResponse
            });

        } catch (err) {
            console.error("Login error:", err);
            next(err);
        }
    });

    // --- GET /api/auth/profile --- Get current user's profile
    router.get('/profile', authenticateToken, async (req, res, next) => {
        if (!req.user || !req.user.userId) {
            // This check might be redundant if authenticateToken already handles it
            return res.status(401).json({ message: 'Authentication required.' });
        }

        try {
            const userProfileData = await knex('users')
                .leftJoin('roles', 'users.role_id', 'roles.id')
                .leftJoin('stores', 'users.current_store_id', 'stores.id')
                .select(
                    'users.id as user_id',
                    'users.username',
                    'users.role_id',
                    'roles.name as role_name',
                    'roles.display_name as role_display_name',
                    'users.employee_id',
                    'users.first_name',
                    'users.last_name',
                    'users.email',
                    'users.is_active',
                    'users.current_store_id as store_id',
                    'stores.name as store_name'
                )
                .where('users.id', req.user.userId)
                .first();

            if (!userProfileData) {
                return res.status(404).json({ message: 'User profile not found.' });
            }

            // Re-fetch permissions to ensure they are current, or use from req.user.permissions if freshness isn't paramount
            const permissionsData = await knex('role_permissions')
                .select('permissions.name as permission_name')
                .join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .where({ 'role_permissions.role_id': userProfileData.role_id });
            const userPermissions = permissionsData.map(p => p.permission_name);

            const userProfileResponse = {
                ...userProfileData,
                permissions: userPermissions
            };
            
            if (userProfileResponse.employee_id) {
                const employeeDetails = await knex('employees')
                    .select('first_name as emp_first_name', 'last_name as emp_last_name', 'employee_code', 'email as emp_email', 'phone as emp_phone')
                    .where({ id: userProfileResponse.employee_id })
                    .first();
                if (employeeDetails) {
                    userProfileResponse.employee_details = employeeDetails;
                }
            }
            console.log(`Profile fetched for user ${userProfileResponse.username} (ID: ${userProfileResponse.user_id}, Store ID: ${userProfileResponse.store_id}, Store Name: ${userProfileResponse.store_name})`);
            res.json(userProfileResponse);

        } catch (err) {
            console.error(`Error fetching profile for user ${req.user.userId}:`, err);
            next(err);
        }
    });

    // --- POST /api/auth/logout --- User Logout
    router.post('/logout', (req, res) => {
        // For JWT, logout is primarily a client-side action (clearing the token).
        // Server can optionally blacklist the token if using a more complex setup.
        res.json({ message: 'Logout successful. Please clear your token.' });
    });

    // --- POST /api/auth/change-password --- User changes their own password
    router.post('/change-password', authenticateToken, async (req, res, next) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        try {
            const user = await knex('users').where({ id: userId }).select('password_hash').first();
            if (!user) {
                // Should not happen if authenticateToken works correctly
                return res.status(404).json({ message: 'User not found.' });
            }

            const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Incorrect current password.' });
            }

            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10; // Read from .env, fallback to 10
            const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
            
            await knex('users')
                .where({ id: userId })
                .update({
                    password_hash: hashedNewPassword,
                    updated_at: knex.fn.now()
                });

            res.json({ message: 'Password changed successfully.' });
        } catch (err) {
            console.error(`Error changing password for user ${userId}:`, err);
            next(err);
        }
    });

    return router;
}

module.exports = createAuthRouter;