const knex = require('../db/knex'); // Adjust path if needed

const TABLE_NAME = 'inventory';

// Now requires storeId
function getInventoryByProductAndStore(productId, storeId) {
    return knex(TABLE_NAME)
        .where({ product_id: productId, store_id: storeId }) // Filter by both
        .first();
}

// Now requires storeId
function updateInventory(productId, storeId, quantity) {
    return knex(TABLE_NAME)
        .where({ product_id: productId, store_id: storeId }) // Filter by both
        .update({ quantity: quantity, updated_at: knex.fn.now() })
        .returning('*'); // Return the updated record
}

// Now requires storeId
async function adjustInventory(productId, storeId, adjustment) {
    const currentInventory = await getInventoryByProductAndStore(productId, storeId);
    if (!currentInventory) {
        // Create a new inventory record if none exists for this product/store combo
         return knex(TABLE_NAME)
            .insert({
                product_id: productId,
                store_id: storeId, // Include storeId
                quantity: Math.max(0, adjustment) // Ensure quantity doesn't go below 0 on initial adjustment
            })
            .returning('*');
    }
    const newQuantity = Math.max(0, currentInventory.quantity + adjustment); // Prevent negative inventory
    return updateInventory(productId, storeId, newQuantity);
}

// Now requires storeId
function createInitialInventory(productId, storeId, quantity = 0, lowStockThreshold = null) {
     return knex(TABLE_NAME)
        .insert({
            product_id: productId,
            store_id: storeId, // Include storeId
            quantity: quantity,
            low_stock_threshold: lowStockThreshold
        })
        .returning('*');
}

// Add functions for listing low stock items (will also need storeId filter)

module.exports = {
    getInventoryByProductAndStore, // Renamed for clarity
    updateInventory,
    adjustInventory,
    createInitialInventory,
};