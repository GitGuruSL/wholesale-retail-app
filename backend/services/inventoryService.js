const knex = require('../db/knex');
const TABLE_NAME = 'inventory';

// Get inventory record for a specific Item and store.
function getInventoryByItemAndStore(ItemId, storeId) {
  return knex(TABLE_NAME)
    .where({ Item_id: ItemId, store_id: storeId })
    .first();
}

// Get all inventory records for a store.
function getInventoryByStore(storeId) {
    return knex(TABLE_NAME)
      .where({ store_id: storeId });
  }

// Update inventory record with a new quantity.
function updateInventory(ItemId, storeId, quantity) {
  return knex(TABLE_NAME)
    .where({ Item_id: ItemId, store_id: storeId })
    .update({ quantity: quantity, updated_at: knex.fn.now() })
    .returning('*');
}

// Adjust inventory by an adjustment value (positive or negative).
async function adjustInventory(ItemId, storeId, adjustment) {
  const currentInventory = await getInventoryByItemAndStore(ItemId, storeId);
  if (!currentInventory) {
    // Create a new inventory record if one doesn't exist.
    return knex(TABLE_NAME)
      .insert({
        Item_id: ItemId,
        store_id: storeId,
        quantity: Math.max(0, adjustment)
      })
      .returning('*');
  }
  const newQuantity = Math.max(0, currentInventory.quantity + adjustment);
  return updateInventory(ItemId, storeId, newQuantity);
}

// Create an initial inventory record for a Item in a store.
function createInitialInventory(ItemId, storeId, quantity = 0, lowStockThreshold = null) {
  return knex(TABLE_NAME)
    .insert({
      Item_id: ItemId,
      store_id: storeId,
      quantity: quantity,
      low_stock_threshold: lowStockThreshold
    })
    .returning('*');
}

module.exports = {
  getInventoryByItemAndStore,
  getInventoryByStore,
  updateInventory,
  adjustInventory,
  createInitialInventory,
};