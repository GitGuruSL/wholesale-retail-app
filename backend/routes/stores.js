// backend/routes/stores.js
const express = require('express');

/**
 * Creates router for handling store-related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createStoresRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    // Checks if a store is referenced in other critical tables
    const isStoreInUse = async (storeId) => {
        // Check products (if store_id is added directly to products)
        const productTableExists = await knex.schema.hasTable('products');
        if (productTableExists && await knex.schema.hasColumn('products', 'store_id')) {
            const productCount = await knex('products').where({ store_id: storeId }).count('id as count').first();
            if (productCount && productCount.count > 0) return true;
        }

        // Check stock (assuming stock table has store_id)
        const stockTableExists = await knex.schema.hasTable('stock');
        if (stockTableExists && await knex.schema.hasColumn('stock', 'store_id')) {
            const stockCount = await knex('stock').where({ store_id: storeId }).count('id as count').first();
            if (stockCount && stockCount.count > 0) return true;
        }

        // Check purchase orders (assuming purchase_orders table has store_id)
        const purchaseTableExists = await knex.schema.hasTable('purchase_orders');
         if (purchaseTableExists && await knex.schema.hasColumn('purchase_orders', 'store_id')) {
            const purchaseCount = await knex('purchase_orders').where({ store_id: storeId }).count('id as count').first();
            if (purchaseCount && purchaseCount.count > 0) return true;
        }

         // Check sales orders (assuming sales_orders table has store_id)
        const salesTableExists = await knex.schema.hasTable('sales_orders');
         if (salesTableExists && await knex.schema.hasColumn('sales_orders', 'store_id')) {
            const salesCount = await knex('sales_orders').where({ store_id: storeId }).count('id as count').first();
            if (salesCount && salesCount.count > 0) return true;
        }

        // Add checks for other tables like store_users if applicable

        return false;
    };

    // GET /api/stores - Fetch all stores
    router.get('/', async (req, res) => {
        try {
            const stores = await knex('stores')
                                 .select('id', 'name', 'address', 'contact_info') // Select relevant fields
                                 .orderBy('name');
            res.status(200).json(stores);
        } catch (err) {
            console.error("Error fetching stores:", err);
            res.status(500).json({ message: 'Database error fetching stores.', error: err.message });
        }
    });

    // GET /api/stores/:id - Fetch a single store by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid store ID.' });
        }
        try {
            const store = await knex('stores').where({ id: parseInt(id) }).first();
            if (!store) {
                return res.status(404).json({ message: `Store with ID ${id} not found.` });
            }
            res.status(200).json(store);
        } catch (err) {
            console.error(`Error fetching store ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching store details.', error: err.message });
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
            address: typeof address === 'string' ? (address.trim() || null) : null,
            contact_info: typeof contact_info === 'string' ? (contact_info.trim() || null) : null,
            // created_at/updated_at handled by DB defaults
        };

        try {
            const [insertedStore] = await knex('stores').insert(newStore).returning('*');
            res.status(201).json(insertedStore);
        } catch (err) {
            // Handle potential unique constraint violation on 'name' if set
            if (err.code === '23505') {
                return res.status(409).json({ message: `Conflict: Store name "${newStore.name}" already exists.`, error: err.detail });
            }
            console.error("Error creating store:", err);
            res.status(500).json({ message: 'Database error creating store.', error: err.message });
        }
    });

    // PUT /api/stores/:id - Update an existing store
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, address, contact_info } = req.body;

         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid store ID.' });
        }

        const storeUpdates = {
            updated_at: new Date()
        };

        // Add fields to update only if they were provided in the request body
        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                 return res.status(400).json({ message: 'Store name must be a non-empty string.' });
            }
            storeUpdates.name = name.trim();
        }
        if (address !== undefined) {
             storeUpdates.address = typeof address === 'string' ? (address.trim() || null) : null;
        }
         if (contact_info !== undefined) {
             storeUpdates.contact_info = typeof contact_info === 'string' ? (contact_info.trim() || null) : null;
        }


         if (Object.keys(storeUpdates).length <= 1) {
             // Only updated_at was added, meaning no actual data change requested
             const currentStore = await knex('stores').where({ id: parseInt(id) }).first();
              if (!currentStore) return res.status(404).json({ message: `Store with ID ${id} not found.` });
              return res.status(200).json(currentStore); // Return current data
         }


        try {
            const count = await knex('stores').where({ id: parseInt(id) }).update(storeUpdates);

            if (count === 0) {
                const exists = await knex('stores').where({ id: parseInt(id) }).first();
                if (!exists) {
                    return res.status(404).json({ message: `Store with ID ${id} not found.` });
                } else {
                    console.warn(`Store ${id} existed but update resulted in 0 rows affected.`);
                    res.status(200).json(exists); // Return existing data
                    return;
                }
            }

            const updatedStore = await knex('stores').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedStore);

        } catch (err) {
            if (err.code === '23505' && storeUpdates.name) { // Check unique constraint on name update
                return res.status(409).json({ message: `Conflict: Store name "${storeUpdates.name}" already exists.`, error: err.detail });
            }
            console.error(`Error updating store ${id}:`, err);
            res.status(500).json({ message: 'Database error updating store.', error: err.message });
        }
    });

    // DELETE /api/stores/:id - Delete a store
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const storeId = parseInt(id);
         if (isNaN(storeId)) {
             return res.status(400).json({ message: 'Invalid store ID.' });
        }

        try {
            // ** Check for dependencies before deleting **
            const storeUsed = await isStoreInUse(storeId);
            if (storeUsed) {
                 return res.status(409).json({ message: 'Conflict: Cannot delete store because it is referenced by products, stock, or orders.' });
            }

            // Proceed with deletion
            const count = await knex('stores').where({ id: storeId }).del();

            if (count === 0) {
                return res.status(404).json({ message: `Store with ID ${id} not found.` });
            }

            res.status(204).send(); // Success

        } catch (err) {
             // Fallback FK check
             if (err.code === '23503') {
                 console.warn(`Attempted to delete store ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete store due to existing references.', error: err.detail });
             }
            console.error(`Error deleting store ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting store.', error: err.message });
        }
    });

    return router;
}
module.exports = createStoresRouter;
