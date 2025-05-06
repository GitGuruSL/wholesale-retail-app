const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Assuming authenticateToken is now the one from authMiddleware.js that you've updated
const { authenticateToken } = require('../middleware/authMiddleware'); 

function createAuthRouter(knex) {
    const router = express.Router();

    router.post('/login', async (req, res, next) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' });
        }

        try {
            const user = await knex('users')
                .select(
                    'id', 
                    'username', 
                    'password_hash', 
                    'role', 
                    'employee_id',
                    'first_name', // New
                    'last_name',  // New
                    'email',      // New
                    'is_active'
                )
                .where({ username: username })
                .first();

            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }
            if (!user.is_active) {
                return res.status(403).json({ message: 'User account is inactive.' });
            }

            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) {
                return res.status(401).json({ message: 'Invalid credentials.' });
            }

            const payload = {
                userId: user.id,
                username: user.username,
                role: user.role,
                // You can add more to payload if needed, but keep it minimal
                // firstName: user.first_name, 
                // lastName: user.last_name,
                // email: user.email
            };

            const accessToken = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION || '1h' }
            );

            res.json({
                token: accessToken,
                user: { // Return comprehensive user details
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    employeeId: user.employee_id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email,
                    isActive: user.is_active
                }
            });
        } catch (err) {
            console.error("Login error:", err);
            next(err);
        }
    });

    router.get('/profile', authenticateToken, async (req, res, next) => {
        // req.user is now populated by the updated authenticateToken from authMiddleware.js
        // and should contain first_name, last_name, email directly from the users table.
        if (!req.user) { // Should have been caught by authenticateToken if token was invalid/missing
            return res.status(401).json({ message: "Unauthorized: Profile access denied." });
        }
        
        // The req.user object from authenticateToken should already have the necessary details
        const userProfile = {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            employeeId: req.user.employee_id,
            firstName: req.user.first_name,
            lastName: req.user.last_name,
            email: req.user.email,
            isActive: req.user.is_active
        };
        
        res.json({ user: userProfile });
    });

    return router;
}

module.exports = createAuthRouter;