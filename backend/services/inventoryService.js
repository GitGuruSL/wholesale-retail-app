const knex = require('../db/knex');
const TABLE_NAME = 'inventory';

// Get inventory record for a specific product and store.
function getInventoryByProductAndStore(productId, storeId) {
  return knex(TABLE_NAME)
    .where({ product_id: productId, store_id: storeId })
    .first();
}

// Get all inventory records for a store.
function getInventoryByStore(storeId) {
    return knex(TABLE_NAME)
      .where({ store_id: storeId });
  }

// Update inventory record with a new quantity.
function updateInventory(productId, storeId, quantity) {
  return knex(TABLE_NAME)
    .where({ product_id: productId, store_id: storeId })
    .update({ quantity: quantity, updated_at: knex.fn.now() })
    .returning('*');
}

// Adjust inventory by an adjustment value (positive or negative).
async function adjustInventory(productId, storeId, adjustment) {
  const currentInventory = await getInventoryByProductAndStore(productId, storeId);
  if (!currentInventory) {
    // Create a new inventory record if one doesn't exist.
    return knex(TABLE_NAME)
      .insert({
        product_id: productId,
        store_id: storeId,
        quantity: Math.max(0, adjustment)
      })
      .returning('*');
  }
  const newQuantity = Math.max(0, currentInventory.quantity + adjustment);
  return updateInventory(productId, storeId, newQuantity);
}

// Create an initial inventory record for a product in a store.
function createInitialInventory(productId, storeId, quantity = 0, lowStockThreshold = null) {
  return knex(TABLE_NAME)
    .insert({
      product_id: productId,
      store_id: storeId,
      quantity: quantity,
      low_stock_threshold: lowStockThreshold
    })
    .returning('*');
}

module.exports = {
  getInventoryByProductAndStore,
  getInventoryByStore,
  updateInventory,
  adjustInventory,
  createInitialInventory,
};