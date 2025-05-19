const express = require('express');
const inventoryService = require('../services/inventoryService');

module.exports = () => {
  const router = express.Router();

  // Helper: Determine store ID based on user role
  function getStoreId(req) {
    if (req.user && req.user.role_name === 'global_admin') {
      return req.query.storeId || req.body.storeId || null; // Global admin can specify storeId
    } else if (req.user && req.user.store_id) {
      return req.user.store_id; // Store admin or user gets their assigned store
    }
    return null;
  }

  // GET: List all inventory records for a store
  router.get('/', async (req, res, next) => {
    try {
      const storeId = getStoreId(req);
      if (!storeId) {
        return res.status(400).json({ message: 'Store ID is required.' });
      }
      const inventory = await inventoryService.getInventoryByStore(storeId);
      res.status(200).json(inventory);
    } catch (err) {
      next(err);
    }
  });

  // GET: Retrieve inventory for a specific Item in a store
  router.get('/:ItemId', async (req, res, next) => {
    const { ItemId } = req.params;
    const storeId = getStoreId(req);
    if (!storeId) {
      return res.status(400).json({ message: 'Store ID is required.' });
    }
    try {
      const inventory = await inventoryService.getInventoryByItemAndStore(ItemId, storeId);
      if (inventory) {
        res.status(200).json(inventory);
      } else {
        res.status(200).json({
          Item_id: parseInt(ItemId, 10),
          store_id: parseInt(storeId, 10),
          quantity: 0,
          low_stock_threshold: null,
        });
      }
    } catch (err) {
      next(err);
    }
  });

  // PUT: Adjust inventory for a specific Item
  router.put('/adjust/:ItemId', async (req, res, next) => {
    const { ItemId } = req.params;
    const adjustment = Number(req.body.adjustment);
    const storeId = getStoreId(req);
    if (isNaN(adjustment) || adjustment === 0) {
      return res.status(400).json({ message: 'A non-zero numeric adjustment is required.' });
    }
    if (!storeId) {
      return res.status(400).json({ message: 'Store ID is required.' });
    }
    try {
      const updatedInventory = await inventoryService.adjustInventory(ItemId, storeId, adjustment);
      res.status(200).json(updatedInventory[0]);
    } catch (err) {
      next(err);
    }
  });

  // POST: Create an initial inventory record
  router.post('/', async (req, res, next) => {
    const { Item_id, quantity, low_stock_threshold } = req.body;
    const storeId = getStoreId(req);
    if (!Item_id || !storeId) {
      return res.status(400).json({ message: 'Item ID and Store ID are required.' });
    }
    try {
      const newInventory = await inventoryService.createInitialInventory(Item_id, storeId, quantity, low_stock_threshold);
      res.status(201).json(newInventory[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'Inventory record already exists for this Item in this store.' });
      }
      next(err);
    }
  });

  return router;
};