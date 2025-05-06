const express = require('express');
// Note: We will apply authenticateToken in server.js when mounting this router

function createInventoryRouter(knex) {
    const router = express.Router();

    // GET /api/inventory/:productId?storeId=... - Get inventory for a specific product in a specific store
    router.get('/:productId', async (req, res, next) => {
        const { productId } = req.params;
        const { storeId } = req.query; // Get storeId from query parameter

        if (!storeId) {
            return res.status(400).json({ message: 'storeId query parameter is required.' });
        }

        try {
            const inventoryRecord = await knex('inventory')
                .where({
                    product_id: parseInt(productId, 10),
                    store_id: parseInt(storeId, 10)
                })
                .first(); // Get the first matching record

            if (inventoryRecord) {
                res.status(200).json(inventoryRecord);
            } else {
                // If no record exists, return 0 quantity (or handle as needed)
                res.status(404).json({
                    product_id: parseInt(productId, 10),
                    store_id: parseInt(storeId, 10),
                    quantity: 0, // Default to 0 if not found
                    message: 'Inventory record not found for this product in this store.'
                });
            }
        } catch (err) {
            console.error(`[ERROR] GET /api/inventory/${productId}?storeId=${storeId}:`, err);
            next(err);
        }
    });

    // PUT /api/inventory/adjust/:productId - Adjust inventory for a product in a store
    router.put('/adjust/:productId', async (req, res, next) => {
        const { productId } = req.params;
        const { storeId, adjustment } = req.body; // Adjustment can be positive or negative
        const userId = req.user?.userId; // Get user ID if available from auth middleware

        // Validation
        if (!storeId || adjustment === undefined || adjustment === null || isNaN(adjustment)) {
            return res.status(400).json({ message: 'storeId and a numeric adjustment value are required.' });
        }
        if (adjustment === 0) {
             return res.status(400).json({ message: 'Adjustment value cannot be zero.' });
        }

        const adjValue = Number(adjustment);

        try {
            // Use transaction for safety, especially if adding logging later
            await knex.transaction(async (trx) => {
                // Check if inventory record exists
                const currentInventory = await trx('inventory')
                    .where({ product_id: productId, store_id: storeId })
                    .first();

                let newQuantity;

                if (currentInventory) {
                    // Record exists, update it
                    newQuantity = Number(currentInventory.quantity) + adjValue;
                    // Optional: Prevent stock going below zero if needed
                    // if (newQuantity < 0) {
                    //     throw new Error(`Adjustment results in negative stock (${newQuantity}) for product ${productId} in store ${storeId}.`);
                    // }
                    await trx('inventory')
                        .where({ id: currentInventory.id })
                        .update({
                            quantity: newQuantity,
                            updated_at: new Date()
                        });
                     console.log(`[Inventory Adjust] Updated inventory for product ${productId}, store ${storeId}. New quantity: ${newQuantity}`);
                } else {
                    // Record does not exist, create it (only if adjustment is positive?)
                    // Or handle as an error depending on business logic.
                    // Here, we'll create it, assuming initial stock might be added this way.
                    // Optional: Prevent creating a record with negative stock
                    // if (adjValue < 0) {
                    //     throw new Error(`Cannot make a negative adjustment for product ${productId} in store ${storeId} as no inventory record exists.`);
                    // }
                    newQuantity = adjValue;
                    await trx('inventory')
                        .insert({
                            product_id: productId,
                            store_id: storeId,
                            quantity: newQuantity,
                            // created_at, updated_at will default
                        });
                    console.log(`[Inventory Adjust] Created inventory record for product ${productId}, store ${storeId}. Quantity: ${newQuantity}`);
                }

                 // TODO: Add inventory logging here within the transaction
                 // await trx('inventory_logs').insert({ product_id: productId, store_id: storeId, user_id: userId, adjustment: adjValue, new_quantity: newQuantity, reason: req.body.reason || 'Manual Adjustment' });

                 // Return the updated/new record info
                 res.status(200).json({
                     product_id: productId,
                     store_id: storeId,
                     quantity: newQuantity,
                     message: 'Inventory adjusted successfully.'
                 });

            }); // End Transaction

        } catch (error) {
            console.error(`[ERROR] PUT /api/inventory/adjust/${productId}:`, error);
             if (error.message.includes("negative stock") || error.message.includes("Cannot make a negative adjustment")) {
                 res.status(400).json({ message: error.message });
             } else {
                 next(error); // Pass to global error handler
             }
        }
    });

    // --- Add other inventory routes as needed (e.g., overview, transfers) ---

    return router;
}

module.exports = createInventoryRouter;