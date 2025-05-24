const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');

// Import controller functions
const {
    getPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder
} = require('../controllers/purchaseOrderController'); // Adjust path if your controller is elsewhere

// Factory function for the router
module.exports = function createPurchaseOrdersRouter(knex, protect, authorize) { // <--- 'authorize' is passed in
    // knex is not directly used here anymore as it's used within the controller.
    // protect and authorize are middleware passed to be applied to routes.
    const router = express.Router();

    // Define permissions (ensure these match what's expected by your authorize middleware)
    const PO_READ = 'purchase_order:read';
    const PO_CREATE = 'purchase_order:create';
    const PO_UPDATE = 'purchase_order:update';
    const PO_DELETE = 'purchase_order:delete';

    // --- Route Definitions ---
    // The controller functions (e.g., getPurchaseOrders) will be called by Express
    // with (req, res, next) arguments.

    router.route('/')
        .get(protect, authorize(null, [PO_READ]), getPurchaseOrders) // <--- 'authorize' is used here
        .post(protect, authorize(null, [PO_CREATE]), createPurchaseOrder);

    router.route('/:id')
        .get(protect, authorize(null, [PO_READ]), getPurchaseOrderById)
        .put(protect, authorize(null, [PO_UPDATE]), updatePurchaseOrder)
        .delete(protect, authorize(null, [PO_DELETE]), deletePurchaseOrder);

    return router;
};