// backend/routes/suppliers.js
const express = require('express');

/**
 * Creates router for handling supplier-related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createSuppliersRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for dependencies ---
    const isSupplierInUse = async (supplierId) => { /* ... same as before ... */
        const productTableExists = await knex.schema.hasTable('products');
        if (productTableExists && await knex.schema.hasColumn('products', 'supplier_id')) { const productCount = await knex('products').where({ supplier_id: supplierId }).count('id as count').first(); if (productCount && productCount.count > 0) return true; }
        const purchaseTableExists = await knex.schema.hasTable('purchase_orders');
        if (purchaseTableExists && await knex.schema.hasColumn('purchase_orders', 'supplier_id')) { const purchaseCount = await knex('purchase_orders').where({ supplier_id: supplierId }).count('id as count').first(); if (purchaseCount && purchaseCount.count > 0) return true; }
        return false;
     };

    // --- Helper: Prepare Data ---
    const prepareSupplierData = (inputData) => { /* ... same as before ... */
        const data = { ...inputData };
        const fieldsToNullifyIfEmpty = [ 'city', 'contact_person', 'telephone', 'fax', 'email', 'since_date', 'main_category_id', 'tax_invoice_details', 'address', 'contact_info', 'default_discount_percent', 'credit_limit', 'credit_days' ];
        const numericFields = ['default_discount_percent', 'credit_limit'];
        const integerFields = ['credit_days', 'main_category_id'];
        const booleanFields = ['is_default_supplier'];
        const dateFields = ['since_date'];
        for (const key in data) {
            if (typeof data[key] === 'string') { data[key] = data[key].trim(); }
            if (fieldsToNullifyIfEmpty.includes(key) && data[key] === '') { data[key] = null; }
            if (numericFields.includes(key) && data[key] !== null) { const parsed = parseFloat(data[key]); data[key] = isNaN(parsed) ? null : parsed; }
            if (integerFields.includes(key) && data[key] !== null) { const parsed = parseInt(data[key], 10); data[key] = isNaN(parsed) ? null : parsed; }
            if (booleanFields.includes(key)) { data[key] = Boolean(data[key]); }
            if (dateFields.includes(key) && data[key] !== null) { const date = new Date(data[key]); data[key] = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]; }
        }
        delete data.id; delete data.created_at; delete data.code;
        return data;
     };


    // GET /api/suppliers - Fetch all suppliers (FIXED SELECT)
    router.get('/', async (req, res) => {
        try {
            const suppliers = await knex('suppliers')
                                    .leftJoin('categories', 'suppliers.main_category_id', 'categories.id')
                                    .select( // Select all columns explicitly
                                        'suppliers.id',
                                        // 'suppliers.code', // REMOVED code column
                                        'suppliers.name',
                                        'suppliers.address',
                                        'suppliers.city',
                                        'suppliers.contact_person',
                                        'suppliers.telephone',
                                        'suppliers.fax',
                                        'suppliers.email',
                                        'suppliers.since_date',
                                        'suppliers.main_category_id',
                                        'suppliers.tax_invoice_details',
                                        'suppliers.default_discount_percent',
                                        'suppliers.credit_limit',
                                        'suppliers.credit_days',
                                        'suppliers.is_default_supplier',
                                        'categories.name as main_category_name' // Get category name via join
                                    )
                                    .orderBy('suppliers.name');
            res.status(200).json(suppliers);
        } catch (err) {
            console.error("Error fetching suppliers:", err); // Log the actual DB error
            res.status(500).json({ message: 'Database error fetching suppliers.', error: err.message });
        }
    });

    // GET /api/suppliers/:id - Fetch a single supplier by ID (FIXED SELECT)
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid supplier ID.' });
        try {
             const supplier = await knex('suppliers')
                                    .leftJoin('categories', 'suppliers.main_category_id', 'categories.id')
                                    // Select all needed fields, excluding code
                                    .select(
                                        'suppliers.id', 'suppliers.name', 'suppliers.address', 'suppliers.city',
                                        'suppliers.contact_person', 'suppliers.telephone', 'suppliers.fax',
                                        'suppliers.email', 'suppliers.since_date', 'suppliers.main_category_id',
                                        'suppliers.tax_invoice_details', 'suppliers.default_discount_percent',
                                        'suppliers.credit_limit', 'suppliers.credit_days', 'suppliers.is_default_supplier',
                                        'suppliers.created_at', 'suppliers.updated_at', // Include timestamps if needed
                                        'categories.name as main_category_name'
                                    )
                                    .where('suppliers.id', parseInt(id)).first();
            if (!supplier) return res.status(404).json({ message: `Supplier with ID ${id} not found.` });
            res.status(200).json(supplier);
        } catch (err) { /* ... error handling ... */
             console.error(`Error fetching supplier ${id}:`, err);
             res.status(500).json({ message: 'Database error fetching supplier details.', error: err.message });
        }
     });


    // POST /api/suppliers - Create a new supplier (No code generation needed now)
    router.post('/', async (req, res) => {
        if (!req.body.name || req.body.name.trim() === '') {
            return res.status(400).json({ message: 'Supplier name is required.' });
        }
        const preparedData = prepareSupplierData(req.body);
        const newSupplierData = { ...preparedData }; // No code to add

        try { /* ... validation and insert logic ... */
             if (newSupplierData.main_category_id) {
                 const categoryExists = await knex('categories').where({ id: newSupplierData.main_category_id }).first();
                 if (!categoryExists) return res.status(400).json({ message: `Main Category with ID ${newSupplierData.main_category_id} does not exist.` });
             }
            const [insertedSupplier] = await knex('suppliers').insert(newSupplierData).returning('*');
            res.status(201).json(insertedSupplier);
        } catch (err) { /* ... error handling ... */
            if (err.code === '23505') { const field = err.constraint?.includes('email') ? 'Email' : 'Name'; return res.status(409).json({ message: `Conflict: Supplier ${field} already exists.`, error: err.detail }); }
             if (err.code === '23503') { return res.status(400).json({ message: `Invalid Main Category ID provided.`, error: err.detail }); }
            console.error("Error creating supplier:", err); res.status(500).json({ message: 'Database error creating supplier.', error: err.message });
        }
    });

    // PUT /api/suppliers/:id - Update an existing supplier (No code involved)
    router.put('/:id', async (req, res) => { /* ... same as before ... */
        const { id } = req.params;
         if (isNaN(parseInt(id))) return res.status(400).json({ message: 'Invalid supplier ID.' });
        const preparedData = prepareSupplierData(req.body);
        const supplierUpdates = { ...preparedData, updated_at: new Date() };
        delete supplierUpdates.code; // Ensure code is not in updates
        if (Object.keys(supplierUpdates).length <= 1) { /* ... handle no change ... */
             const currentSupplier = await knex('suppliers').where({ id: parseInt(id) }).first();
              if (!currentSupplier) return res.status(404).json({ message: `Supplier with ID ${id} not found.` });
              return res.status(200).json(currentSupplier);
         }
        try { /* ... validation and update logic ... */
             if (supplierUpdates.main_category_id) {
                 const categoryExists = await knex('categories').where({ id: supplierUpdates.main_category_id }).first();
                 if (!categoryExists) return res.status(400).json({ message: `Main Category with ID ${supplierUpdates.main_category_id} does not exist.` });
             }
            const count = await knex('suppliers').where({ id: parseInt(id) }).update(supplierUpdates);
            if (count === 0) { /* ... handle no rows affected ... */
                const exists = await knex('suppliers').where({ id: parseInt(id) }).first();
                if (!exists) return res.status(404).json({ message: `Supplier with ID ${id} not found.` });
                console.warn(`Supplier ${id} existed but update resulted in 0 rows affected.`); res.status(200).json(exists); return;
            }
            const updatedSupplier = await knex('suppliers').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedSupplier);
        } catch (err) { /* ... error handling ... */
            if (err.code === '23505' && supplierUpdates.name) { return res.status(409).json({ message: `Conflict: Supplier name "${supplierUpdates.name}" might already exist.`, error: err.detail }); }
            if (err.code === '23503') { return res.status(400).json({ message: `Invalid Main Category ID provided.`, error: err.detail }); }
            console.error(`Error updating supplier ${id}:`, err); res.status(500).json({ message: 'Database error updating supplier.', error: err.message });
        }
     });

    // DELETE /api/suppliers/:id - Delete a supplier
    router.delete('/:id', async (req, res) => { /* ... same as before ... */
        const { id } = req.params;
        const supplierId = parseInt(id);
         if (isNaN(supplierId)) return res.status(400).json({ message: 'Invalid supplier ID.' });
        try {
            const supplierUsed = await isSupplierInUse(supplierId);
            if (supplierUsed) return res.status(409).json({ message: 'Conflict: Cannot delete supplier referenced by products or purchase orders.' });
            const count = await knex('suppliers').where({ id: supplierId }).del();
            if (count === 0) return res.status(404).json({ message: `Supplier with ID ${id} not found.` });
            res.status(204).send();
        } catch (err) { /* ... error handling ... */
             if (err.code === '23503') { console.warn(`Attempted to delete supplier ${id} with existing references (FK violation).`); return res.status(409).json({ message: 'Conflict: Cannot delete supplier due to existing references.', error: err.detail }); }
            console.error(`Error deleting supplier ${id}:`, err); res.status(500).json({ message: 'Database error deleting supplier.', error: err.message });
        }
     });

    return router;
}
module.exports = createSuppliersRouter;
