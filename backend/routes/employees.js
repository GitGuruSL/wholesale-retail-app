// filepath: d:\Development\wholesale-retail-app\backend\routes\employees.js
const express = require('express');
const ROLES = require('../utils/roles'); // Adjust path if needed
const authorizeRoles = require('../middleware/authorizeRoles'); // Adjust path if needed

function createEmployeesRouter(knex) {
    const router = express.Router();

    // --- GET /api/employees --- List employees
    // Optionally filters for employees without a user account
    // Requires GLOBAL_ADMIN role (or adjust as needed)
    router.get('/', authorizeRoles(ROLES.GLOBAL_ADMIN), async (req, res, next) => {
        const { availableForUser } = req.query; // Check for query parameter

        try {
            let query = knex('employees')
                .select(
                    'id',
                    'employee_code',
                    'first_name',
                    'last_name',
                    'email', // Include email or other fields needed for display
                    'status'
                )
                .where('status', 'active'); // Typically only list active employees

            if (availableForUser === 'true') {
                // Find employees whose 'id' is NOT present in the 'users.employee_id' column
                query = query.whereNotExists(function() {
                    this.select(1)
                        .from('users')
                        .whereRaw('users.employee_id = employees.id');
                });
            }

            const employees = await query.orderBy('first_name').orderBy('last_name');
            res.json(employees);

        } catch (err) {
            console.error("Error fetching employees:", err);
            next(err);
        }
    });

    // --- Add other employee CRUD endpoints later if needed (POST, GET /:id, PUT /:id, DELETE /:id) ---
    // For now, we only need the list for user creation.

    return router;
}

module.exports = createEmployeesRouter;