// filepath: d:\Development\wholesale-retail-app\backend\routes\suppliers.js
// backend/routes/suppliers.js
const express = require('express');
const {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
} = require('../controllers/supplierController'); // Correct path

/**
 * Creates router for handling supplier-related API requests.
 * @param {import("knex").Knex} knex - Knex instance. (Knex is used within controller now)
 * @param {Function} protect - Middleware to protect routes.
 * @param {Function} authorize - Middleware to authorize routes.
 * @returns {express.Router} Express router instance.
 */
function createSuppliersRouter(knex, protect, authorize) { // knex param might be less used here if all DB logic is in controller
    const router = express.Router();

    // Helper: Prepare Data (This can be moved to the controller or a shared utility if preferred)
    // For now, assuming it's used here before passing to controller, or controller handles its own prep.
    const prepareSupplierData = (inputData) => {
        const data = { ...inputData };
        const fieldsToNullifyIfEmpty = [ 'city', 'contact_person', 'telephone', 'fax', 'email', 'since_date', 'main_category_id', 'tax_invoice_details', 'address', /*'contact_info',*/ 'default_discount_percent', 'credit_limit', 'credit_days' ];
        const numericFields = ['default_discount_percent', 'credit_limit'];
        const integerFields = ['credit_days', 'main_category_id'];
        const booleanFields = ['is_default_supplier'];
        const dateFields = ['since_date'];
        for (const key in data) {
            if (typeof data[key] === 'string') { data[key] = data[key].trim(); }
            if (fieldsToNullifyIfEmpty.includes(key) && (data[key] === '' || data[key] === undefined) ) { data[key] = null; } // Handle undefined too
            if (numericFields.includes(key) && data[key] !== null && data[key] !== undefined) { const parsed = parseFloat(data[key]); data[key] = isNaN(parsed) ? null : parsed; }
            if (integerFields.includes(key) && data[key] !== null && data[key] !== undefined) { const parsed = parseInt(data[key], 10); data[key] = isNaN(parsed) ? null : parsed; }
            if (booleanFields.includes(key)) { data[key] = Boolean(data[key]); } // Boolean(undefined) is false, Boolean(null) is false - this is fine
            if (dateFields.includes(key) && data[key] !== null && data[key] !== undefined && data[key] !== '') { 
                const date = new Date(data[key]); 
                data[key] = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]; 
            } else if (dateFields.includes(key) && (data[key] === null || data[key] === undefined || data[key] === '')) {
                data[key] = null;
            }
        }
        // delete data.id; // Controller handles this
        // delete data.created_at;
        // delete data.code;
        return data;
     };

    // GET all suppliers
    router.route('/')
        .get(protect, authorize(null, ['supplier:read']), getSuppliers);

    // POST create a new supplier
    router.route('/')
        .post(protect, authorize(null, ['supplier:create']), (req, res, next) => {
            // Optionally use prepareSupplierData here if you want route-level prep
            // req.body = prepareSupplierData(req.body);
            // Then call the controller
            createSupplier(req, res, next);
        });

    // GET a single supplier by ID
    router.route('/:id')
        .get(protect, authorize(null, ['supplier:read']), getSupplierById);

    // PUT update a supplier by ID
    router.route('/:id')
        .put(protect, authorize(null, ['supplier:update']), (req, res, next) => {
            // Optionally use prepareSupplierData here
            // req.body = prepareSupplierData(req.body);
            updateSupplier(req, res, next);
        });

    // DELETE a supplier by ID
    router.route('/:id')
        .delete(protect, authorize(null, ['supplier:delete']), deleteSupplier);

    return router;
}

module.exports = createSuppliersRouter;