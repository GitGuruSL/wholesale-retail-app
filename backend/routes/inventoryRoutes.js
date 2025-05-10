const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventoryService'); // Adjust path if needed

// Helper to determine the store id based on user role.
// Global admin (role === 'globaladmin') may supply a storeId (via query or body).
// Otherwise, use the store_id assigned to the user.
function getStoreId(req) {
  if (req.user && req.user.role === 'globaladmin') {
    // global admin can supply a storeId if desired; otherwise, null means “all” (if you extend the logic)
    return req.query.storeId || req.body.storeId || null;
  } else if (req.user && req.user.store_id) {
    return req.user.store_id;
  }
  return null;
}

// GET inventory for a specific product in a store
// For global admin, storeId can be provided; for store admin, use req.user.store_id.
router.get('/:productId', async (req, res, next) => {
  const { productId } = req.params;
  const storeId = getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ message: 'Store ID is required.' });
  }
  try {
    const inventory = await inventoryService.getInventoryByProductAndStore(productId, storeId);
    if (inventory) {
      res.status(200).json(inventory);
    } else {
      // If no record exists, return a default record with quantity 0
      res.status(200).json({
        product_id: parseInt(productId, 10),
        store_id: parseInt(storeId, 10),
        quantity: 0,
        low_stock_threshold: null
      });
    }
  } catch (err) {
    next(err);
  }
});

// PUT adjust inventory for a product in a store
// The adjustment value must be a nonzero number.
router.put('/adjust/:productId', async (req, res, next) => {
  const { productId } = req.params;
  const adjValue = Number(req.body.adjustment);
  const storeId = getStoreId(req);
  if (isNaN(adjValue) || adjValue === 0) {
    return res.status(400).json({ message: 'A non-zero numeric adjustment is required.' });
  }
  if (!storeId) {
    return res.status(400).json({ message: 'Store ID is required.' });
  }
  try {
    const updatedInventory = await inventoryService.adjustInventory(productId, storeId, adjValue);
    // adjustInventory returns an array (using .returning('*'))
    res.status(200).json(updatedInventory[0]);
  } catch (error) {
    next(error);
  }
});

// POST create an initial inventory record for a product in a store
router.post('/', async (req, res, next) => {
  const { product_id, quantity, low_stock_threshold } = req.body;
  const storeId = getStoreId(req);
  if (!product_id || !storeId) {
    return res.status(400).json({ message: 'Product ID and Store ID are required.' });
  }
  try {
    const newInventory = await inventoryService.createInitialInventory(product_id, storeId, quantity, low_stock_threshold);
    res.status(201).json(newInventory[0]);
  } catch (error) {
    // Check for unique constraint violation (PostgreSQL code 23505)
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Inventory record already exists for this product in this store.' });
    }
    next(error);
  }
});

module.exports = router;