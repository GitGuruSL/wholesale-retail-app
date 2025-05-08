const express = require('express');
// We no longer need to import { ROLES } from '../utils/roles' for this endpoint's primary function.
// Knex instance will be passed to createRolesRouter from server.js

const createRolesRouter = (knex) => { // Accept knex instance
    const router = express.Router();

    // Define the GET /api/roles endpoint
    router.get('/', async (req, res) => {
        try {
            // Fetch roles from the database, including id, name, and display_name
            const rolesFromDb = await knex('roles')
                .select('id', 'name', 'display_name') // Select the necessary columns
                .orderBy('display_name'); // Or order by id, or name as you prefer

            if (!rolesFromDb) {
                // This case might not be hit if knex returns [] for no rows
                console.warn('[API /roles] No roles found in the database (rolesFromDb is null/undefined).');
                return res.status(200).json([]);
            }
            if (rolesFromDb.length === 0) {
                console.log('[API /roles] No roles found in the database (empty array).');
            }
            
            // The roles are already in the desired array format:
            // [{ id: 1, name: 'global_admin', display_name: 'Global Admin' }, ...]
            res.status(200).json(rolesFromDb);
        } catch (error) {
            console.error('Error fetching roles from database:', error);
            res.status(500).json({ message: 'Failed to fetch roles from database' });
        }
    });

    return router;
};

module.exports = createRolesRouter;