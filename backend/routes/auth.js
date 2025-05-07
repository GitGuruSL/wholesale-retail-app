const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// const { ROLES } = require('../utils/roles'); // May not be needed here anymore
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
                .select(
                    'users.id',
                    'users.username',
                    'users.password_hash',
                    'users.role_id',         // Select role_id
                    'roles.name as role_name', // Select role_name
                    'users.employee_id',
                    'users.first_name',      // User's own first name
                    'users.last_name',       // User's own last name
                    'users.email',           // User's own email
                    'users.is_active'
                )
                .whereRaw('LOWER(users.username) = LOWER(?)', [username]) // Case-insensitive username check
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

            // Fetch user's permissions
            const permissions = await knex('role_permissions')
                .select('permissions.name as permission_name')
                .join('permissions', 'role_permissions.permission_id', 'permissions.id')
                .where({ 'role_permissions.role_id': user.role_id });

            const userPermissions = permissions.map(p => p.permission_name);

            // Create JWT Payload
            const jwtPayload = {
                userId: user.id,
                username: user.username,
                roleId: user.role_id,       // Use role_id
                roleName: user.role_name,   // Include role_name
                permissions: userPermissions // Include permissions
                // Add other non-sensitive info if needed
            };

            if (!process.env.JWT_SECRET) {
                console.error("CRITICAL: JWT_SECRET is not defined. Cannot sign token.");
                return res.status(500).json({ message: "Authentication configuration error." });
            }

            const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });

            // Prepare user object for the response (without password_hash)
            const userResponse = {
                id: user.id,
                username: user.username,
                role_id: user.role_id,
                role_name: user.role_name,
                employee_id: user.employee_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                is_active: user.is_active,
                permissions: userPermissions
            };

            console.log(`Login successful: User ${user.username} (ID: ${user.id}, Role: ${user.role_name})`);
            res.json({
                message: 'Login successful',
                token,
                user: userResponse
            });

        } catch (err) {
            console.error("Login error:", err);
            next(err); // Pass to global error handler
        }
    });


    // --- GET /api/auth/profile --- Get current user's profile (requires token)
    router.get('/profile', authenticateToken, async (req, res, next) => {
        // req.user is populated by authenticateToken and already includes:
        // id, username, role_id, role_name, permissions, employee_id, is_active, first_name, last_name, email
        // We just need to make sure we are not sending sensitive data like password_hash (which authenticateToken already omits)

        if (!req.user) { // Should not happen if authenticateToken works
            return res.status(404).json({ message: 'User profile not found.' });
        }

        // Construct a safe user object for the response
        // authenticateToken already populates req.user with role_name and permissions
        const userProfile = {
            id: req.user.id,
            username: req.user.username,
            role_id: req.user.role_id,
            role_name: req.user.role_name,
            employee_id: req.user.employee_id,
            first_name: req.user.first_name,
            last_name: req.user.last_name,
            email: req.user.email,
            is_active: req.user.is_active,
            permissions: req.user.permissions, // Permissions are already fetched by authenticateToken
        };

        // If employee_id exists, fetch employee details to enrich the profile
        if (userProfile.employee_id) {
            try {
                const employeeDetails = await knex('employees')
                    .select('first_name as emp_first_name', 'last_name as emp_last_name', 'employee_code', 'email as emp_email', 'phone as emp_phone')
                    .where({ id: userProfile.employee_id })
                    .first();
                if (employeeDetails) {
                    userProfile.employee_details = employeeDetails;
                }
            } catch (err) {
                console.error(`Error fetching employee details for user ${userProfile.id}:`, err);
                // Non-critical error, so we don't fail the request, just log it.
            }
        }


        res.json(userProfile);
    });

    // --- POST /api/auth/logout --- User Logout (conceptual - client-side token removal)
    router.post('/logout', (req, res) => {
        // For JWT, logout is typically handled client-side by deleting the token.
        // If you implement server-side token blocklisting, you'd do it here.
        res.json({ message: 'Logout successful. Please clear your token.' });
    });

    // --- POST /api/auth/change-password --- User changes their own password
    router.post('/change-password', authenticateToken, async (req, res, next) => {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // From authenticateToken

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        try {
            const user = await knex('users').where({ id: userId }).select('password_hash').first();
            if (!user) {
                return res.status(404).json({ message: 'User not found.' }); // Should not happen if authenticated
            }

            const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ message: 'Incorrect current password.' });
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10); // saltRounds = 10
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