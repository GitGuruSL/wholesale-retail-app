const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventoryService'); // Adjust path if needed
const { ForbiddenError } = require('../utils/errors'); // Assuming you have custom errors

const GLOBAL_ADMIN_ROLE_NAME = 'global_admin'; // Define a constant

// Helper to determine the store id based on user role.
// Assumes req.user is populated by authentication middleware with:
// - req.user.role_name (e.g., 'global_admin', 'store_admin')
// - req.user.store_id (for non-global_admins, this should be their assigned store_id)
function getStoreId(req) {
  // console.log('[getStoreId] req.user:', JSON.stringify(req.user, null, 2));
  // console.log('[getStoreId] req.query:', JSON.stringify(req.query, null, 2));
  // console.log('[getStoreId] req.body:', JSON.stringify(req.body, null, 2));

  if (!req.user) {
    // console.log('[getStoreId] req.user is not populated. Returning null.');
    return null;
  }

  if (req.user.role_name === GLOBAL_ADMIN_ROLE_NAME) {
    const storeIdFromQuery = req.query.storeId;
    const storeIdFromBody = req.body.storeId;
    // console.log(`[getStoreId] Global Admin: storeIdFromQuery='${storeIdFromQuery}', storeIdFromBody='${storeIdFromBody}'`);
    // For global admin, storeId must be explicitly provided in query/body for relevant operations
    return storeIdFromQuery || storeIdFromBody || null;
  } else if (req.user.store_id) { // For other roles like store_admin, store_manager
    // console.log(`[getStoreId] Non-Global Admin: using req.user.store_id='${req.user.store_id}'`);
    return req.user.store_id;
  }

  // console.log('[getStoreId] No store_id determined (user not global_admin and no req.user.store_id). Returning null.');
  return null;
}

// GET inventory for a specific Item in a store
router.get('/:ItemId', async (req, res, next) => {
  const { ItemId } = req.params;
  const storeId = getStoreId(req);

  // console.log(`[GET /:ItemId] ItemId: ${ItemId}, determined storeId: ${storeId}`);

  if (!storeId) {
    // This message is generic; specific storeId requirements depend on the context (global admin vs. store user)
    return res.status(400).json({ message: 'Store ID could not be determined or is required.' });
  }
  try {
    const inventory = await inventoryService.getInventoryByItemAndStore(ItemId, storeId);
    if (inventory) {
      res.status(200).json(inventory);
    } else {
      // Return a default structure if no inventory record exists
      res.status(200).json({
        Item_id: parseInt(ItemId, 10),
        store_id: parseInt(storeId, 10),
        quantity: 0,
        low_stock_threshold: null // Or a default value from store settings if applicable
      });
    }
  } catch (err) {
    next(err);
  }
});

// GET inventory route handler - for fetching all inventory items for a store
router.get('/', async (req, res, next) => {
  console.log('----------------------------------------------------');
  console.log('[Backend Inventory GET /] Timestamp:', new Date().toISOString());
  console.log('[Backend Inventory GET /] Original req.url:', req.originalUrl);
  console.log('[Backend Inventory GET /] User (req.user):', JSON.stringify(req.user, null, 2));
  console.log('[Backend Inventory GET /] Query Params (req.query):', JSON.stringify(req.query, null, 2));

  if (!req.user) {
    console.error('[Backend Inventory GET /] User not authenticated (req.user is missing).');
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  const userRole = req.user.role_name;
  const userAssignedStoreId = req.user.store_id; // This should be populated from users.current_store_id by auth logic
  const queryStoreId = req.query.storeId;

  console.log(`[Backend Inventory GET /] Parsed values: userRole='${userRole}', userAssignedStoreId='${userAssignedStoreId}', queryStoreId='${queryStoreId}' (type: ${typeof queryStoreId})`);

  let effectiveStoreId;

  if (userRole === GLOBAL_ADMIN_ROLE_NAME) {
    console.log('[Backend Inventory GET /] User is GLOBAL_ADMIN.');
    if (!queryStoreId || String(queryStoreId).trim() === "") {
      console.error(`[Backend Inventory GET /] Global admin: queryStoreId is missing or empty. Value: '${queryStoreId}'.`);
      return res.status(400).json({ message: 'Store ID is required in query parameters for global admin.' });
    }
    effectiveStoreId = String(queryStoreId).trim();
    console.log(`[Backend Inventory GET /] Global admin: using queryStoreId='${effectiveStoreId}'`);
  } else if (userRole) { // For other authenticated users like 'store_admin', 'store_manager'
    console.log(`[Backend Inventory GET /] User is ${userRole}.`);
    if (!userAssignedStoreId) {
      console.error(`[Backend Inventory GET /] ${userRole} has no assigned store_id in req.user. User object:`, JSON.stringify(req.user, null, 2));
      return res.status(400).json({ message: 'User has no assigned store. Contact administrator.' });
    }
    effectiveStoreId = userAssignedStoreId;
    console.log(`[Backend Inventory GET /] ${userRole}: using userAssignedStoreId='${effectiveStoreId}'`);
  } else {
    // This case should ideally be caught by authentication middleware if req.user is populated but role_name is missing
    console.error('[Backend Inventory GET /] User role_name not found in req.user.');
    return res.status(403).json({ message: 'User role unclear.' });
  }

  console.log('[Backend Inventory GET /] Final effectiveStoreId for DB query:', effectiveStoreId);

  try {
    const inventoryItems = await inventoryService.getInventoryByStore(effectiveStoreId);
    // inventoryService.getInventoryByStore should ideally return an empty array if no items, not null/undefined
    res.status(200).json(inventoryItems || []);
  } catch (err) {
    console.error(`[Backend Inventory GET /] Error fetching inventory for store ID ${effectiveStoreId}:`, err);
    next(err); // Pass to your global error handler
  }
});

// PUT adjust inventory for a Item in a store
router.put('/adjust/:ItemId', async (req, res, next) => {
  const { ItemId } = req.params;
  const adjValue = Number(req.body.adjustment);
  const storeId = getStoreId(req);

  // console.log(`[PUT /adjust/:ItemId] ItemId: ${ItemId}, adjValue: ${adjValue}, determined storeId: ${storeId}`);

  if (isNaN(adjValue) || adjValue === 0) {
    return res.status(400).json({ message: 'A non-zero numeric adjustment value is required.' });
  }
  if (!storeId) {
    return res.status(400).json({ message: 'Store ID could not be determined or is required for this operation.' });
  }

  try {
    // Ensure the service returns the updated record or confirms the update
    const updatedInventory = await inventoryService.adjustInventory(ItemId, storeId, adjValue);
    if (updatedInventory && updatedInventory.length > 0) {
      res.status(200).json(updatedInventory[0]);
    } else {
      // This case might mean the inventory item didn't exist or wasn't updated.
      // Consider if a 404 is more appropriate if the item to adjust wasn't found.
      console.warn(`[PUT /adjust/:ItemId] Inventory for Item ${ItemId} in store ${storeId} not found or not updated.`);
      res.status(404).json({ message: `Inventory for Item ID ${ItemId} not found in store ID ${storeId}.` });
    }
  } catch (error) {
    next(error);
  }
});

// POST create an initial inventory record for a Item in a store
router.post('/', async (req, res, next) => {
  const { Item_id, quantity, low_stock_threshold } = req.body;
  // For creating inventory, store_id might come from req.body if global_admin is specifying it,
  // or from req.user.store_id if a store_admin is creating it for their own store.
  // The getStoreId helper handles this logic.
  const storeId = getStoreId(req);

  // console.log(`[POST /] Item_id: ${Item_id}, quantity: ${quantity}, determined storeId: ${storeId}`);

  if (!Item_id || !storeId) {
    return res.status(400).json({ message: 'Item ID and a valid Store ID are required.' });
  }
  if (typeof quantity === 'undefined' || quantity === null || isNaN(Number(quantity))) {
    return res.status(400).json({ message: 'A numeric quantity is required.' });
  }

  try {
    const newInventory = await inventoryService.createInitialInventory(Item_id, storeId, Number(quantity), low_stock_threshold);
    if (newInventory && newInventory.length > 0) {
      res.status(201).json(newInventory[0]);
    } else {
      // Should not happen if service layer is robust
      console.error('[POST /] Inventory creation did not return expected result.');
      res.status(500).json({ message: 'Failed to create inventory record.' });
    }
  } catch (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({ message: 'Inventory record already exists for this Item in this store.' });
    }
    // Handle other potential errors, e.g., foreign key violation if Item_id or storeId is invalid
    if (error.code === '23503') { // PostgreSQL foreign key violation
        return res.status(400).json({ message: 'Invalid Item ID or Store ID provided.' });
    }
    next(error);
  }
});

module.exports = router;