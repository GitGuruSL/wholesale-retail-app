const express = require('express');
const itemController = require('../controllers/itemController'); // Correctly imports the controller functions
// const { authenticateToken } = require('../middleware/authMiddleware'); // Your actual auth middleware
// const authorizeAccess = require('../middleware/authorizeRoles'); // Your actual permission middleware

// Using the factory pattern as seen in your server.js for other routes
module.exports = function(knex, authenticateToken, authorizeAccess) {
    const router = express.Router();
    console.log('[items.js] Router setup initiated.'); // For debugging

    // Apply middleware to all item routes or specific ones as needed
    // Example: router.use(authenticateToken);

    // NEW ROUTES FOR PURCHASE ORDER FORM DROPDOWNS - MOVED UP
    router.get(
        '/purchase-product-lines',
        authenticateToken,
        authorizeAccess('purchase_order:create'), // Or 'item:read' or 'purchase_order:read' - ensure this is the intended permission
        itemController.getPurchasableProductLines
    );

    router.get(
        '/purchase-product-lines/:base_item_id/variations',
        authenticateToken,
        authorizeAccess('purchase_order:create'), // Or 'item:read' or 'purchase_order:read' - ensure this is the intended permission
        itemController.getVariationsForProductLine
    );

    // --- Standard Item CRUD Routes ---
    // Ensure itemController.getAllItems is defined in itemController.js
    router.get('/', authenticateToken, authorizeAccess('item:read'), itemController.getAllItems);
    router.post('/', authenticateToken, authorizeAccess('item:create'), itemController.createItem);

    // NEW ROUTE for fetching variations of a specific item
    router.get(
        '/:itemId/variations', // Matches /api/items/52/variations
        authenticateToken,
        authorizeAccess('item:read'), // Or a more specific permission if needed
        itemController.getVariationsForItem // New controller function
    );

    // Parameterized routes AFTER more specific ones
    router.get('/:id', authenticateToken, authorizeAccess('item:read'), itemController.getItemById);
    router.put('/:id', authenticateToken, authorizeAccess('item:update'), itemController.updateItem);
    router.delete('/:id', authenticateToken, authorizeAccess('item:delete'), itemController.deleteItem);

    console.log('[items.js] Router setup complete.'); // For debugging
    return router;
};