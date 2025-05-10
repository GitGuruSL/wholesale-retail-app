const express = require('express');

/**
 * Creates a router for handling store-related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createStoresRouter(knex) {
    const router = express.Router();

    // Helper: Check if a store is referenced in other tables
    const isStoreInUse = async (storeId) => {
        const tablesToCheck = [
            { table: 'products', column: 'store_id' },
            { table: 'stock', column: 'store_id' },
            { table: 'purchase_orders', column: 'store_id' },
            { table: 'sales_orders', column: 'store_id' },
        ];

        for (const { table, column } of tablesToCheck) {
            const tableExists = await knex.schema.hasTable(table);
            if (tableExists && await knex.schema.hasColumn(table, column)) {
                const count = await knex(table).where({ [column]: storeId }).count('id as count').first();
                if (count && count.count > 0) return true;
            }
        }
        return false;
    };

    // GET /api/stores - Fetch all stores
    router.get('/', async (req, res) => {
        try {
            const stores = await knex('stores')
                .select('id', 'name', 'address', 'contact_info')
                .orderBy('name');
            res.status(200).json(stores);
        } catch (err) {
            console.error("Error fetching stores:", err);
            res.status(500).json({ message: 'Database error fetching stores.', error: err.message });
        }
    });

    // GET /api/stores/:id - Fetch a single store by ID
    router.get('/:store_id', async (req, res) => {
        const { store_id } = req.params;
        try {
            const store = await knex('stores').where({ id: parseInt(store_id, 10) }).first();
            if (!store) {
                return res.status(404).json({ message: 'Store not found' });
            }
            res.status(200).json(store);
        } catch (err) {
            console.error('Error fetching store:', err);
            res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    });

    // POST /api/stores - Create a new store
    router.post('/', async (req, res) => {
        const { name, address, contact_info } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Store name is required.' });
        }

        const newStore = {
            name: name.trim(),
            address: address?.trim() || null,
            contact_info: contact_info?.trim() || null,
        };

        try {
            const [insertedStore] = await knex('stores').insert(newStore).returning('*');
            res.status(201).json(insertedStore);
        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation
                return res.status(409).json({ message: `Store name "${newStore.name}" already exists.`, error: err.detail });
            }
            console.error("Error creating store:", err);
            res.status(500).json({ message: 'Database error creating store.', error: err.message });
        }
    });

    // PUT /api/stores/:id - Update an existing store
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, address, contact_info } = req.body;

        if (isNaN(parseInt(id, 10))) {
            return res.status(400).json({ message: 'Invalid store ID.' });
        }

        const storeUpdates = {};
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                return res.status(400).json({ message: 'Store name must be a non-empty string.' });
            }
            storeUpdates.name = name.trim();
        }
        if (address !== undefined) {
            storeUpdates.address = address?.trim() || null;
        }
        if (contact_info !== undefined) {
            storeUpdates.contact_info = contact_info?.trim() || null;
        }

        if (Object.keys(storeUpdates).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update.' });
        }

        try {
            const count = await knex('stores').where({ id: parseInt(id, 10) }).update(storeUpdates);
            if (count === 0) {
                return res.status(404).json({ message: `Store with ID ${id} not found.` });
            }
            const updatedStore = await knex('stores').where({ id: parseInt(id, 10) }).first();
            res.status(200).json(updatedStore);
        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation
                return res.status(409).json({ message: `Store name "${storeUpdates.name}" already exists.`, error: err.detail });
            }
            console.error(`Error updating store ${id}:`, err);
            res.status(500).json({ message: 'Database error updating store.', error: err.message });
        }
    });

    // DELETE /api/stores/:id - Delete a store
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const storeId = parseInt(id, 10);

        if (isNaN(storeId)) {
            return res.status(400).json({ message: 'Invalid store ID.' });
        }

        try {
            const storeUsed = await isStoreInUse(storeId);
            if (storeUsed) {
                return res.status(409).json({ message: 'Cannot delete store because it is referenced by other records.' });
            }

            const count = await knex('stores').where({ id: storeId }).del();
            if (count === 0) {
                return res.status(404).json({ message: `Store with ID ${id} not found.` });
            }

            res.status(204).send(); // No content
        } catch (err) {
            if (err.code === '23503') { // Foreign key constraint violation
                return res.status(409).json({ message: 'Cannot delete store due to existing references.', error: err.detail });
            }
            console.error(`Error deleting store ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting store.', error: err.message });
        }
    });

    return router;
}

module.exports = createStoresRouter;