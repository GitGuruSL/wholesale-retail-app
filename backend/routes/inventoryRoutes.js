const express = require('express');
const router = express.Router();
const inventoryService = require('../services/inventoryService'); // Adjust path

// GET inventory for a specific product IN A SPECIFIC STORE
// Expect storeId as a query parameter: /api/inventory/:productId?storeId=1
router.get('/:productId', async (req, res, next) => { // Added next for error handling
    try {
        const { productId } = req.params;
        const { storeId } = req.query; // Get storeId from query string

        if (!storeId) {
            return res.status(400).json({ message: 'Store ID query parameter is required' });
        }

        const inventory = await inventoryService.getInventoryByProductAndStore(productId, storeId);

        if (inventory) {
            res.json(inventory);
        } else {
            // Return a default 0 quantity if no record exists yet for this product/store
            res.json({
                product_id: parseInt(productId),
                store_id: parseInt(storeId),
                quantity: 0,
                low_stock_threshold: null
            });
        }
    } catch (error) {
        next(error); // Pass errors to the global error handler
    }
});

// PUT adjust inventory for a specific product IN A SPECIFIC STORE
// Expect storeId in the request body: { "adjustment": 5, "storeId": 1 }
router.put('/adjust/:productId', async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { adjustment, storeId } = req.body; // Get storeId from body

        if (typeof adjustment !== 'number') {
            return res.status(400).json({ message: 'Invalid adjustment value' });
        }
        if (!storeId) {
            return res.status(400).json({ message: 'Store ID is required in the request body' });
        }

        const updatedInventory = await inventoryService.adjustInventory(productId, storeId, adjustment);
        res.json(updatedInventory[0]); // adjustInventory returns an array
    } catch (error) {
        next(error);
    }
});

 // POST create initial inventory record (less common now, adjustInventory handles creation)
 // Expect storeId in the request body: { "product_id": 10, "storeId": 1, "quantity": 50 }
 router.post('/', async (req, res, next) => {
    try {
        const { product_id, storeId, quantity, low_stock_threshold } = req.body;
        if (!product_id || !storeId) {
             return res.status(400).json({ message: 'Product ID and Store ID are required' });
        }
        const newInventory = await inventoryService.createInitialInventory(product_id, storeId, quantity, low_stock_threshold);
        res.status(201).json(newInventory[0]);
    } catch (error) {
        // Handle potential unique constraint errors if record already exists
       if (error.code === '23505') { // Example for PostgreSQL unique violation
            return res.status(409).json({ message: 'Inventory record already exists for this product in this store.' });
       }
       next(error);
    }
});


module.exports = router;