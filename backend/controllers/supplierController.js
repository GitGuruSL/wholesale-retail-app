const knex = require('../db/knex'); // Adjust path if your knex instance is elsewhere

// --- Helper: Check for dependencies ---
// This function is similar to the one in your routes, good to have it here or in a shared utility
const isSupplierInUse = async (supplierId) => {
    // Check in products table
    const productTableExists = await knex.schema.hasTable('products');
    if (productTableExists && await knex.schema.hasColumn('products', 'supplier_id')) {
        const productCount = await knex('products').where({ supplier_id: supplierId }).count('id as count').first();
        if (productCount && productCount.count > 0) return true;
    }
    // Check in purchase_orders table
    const purchaseOrderTableExists = await knex.schema.hasTable('purchase_orders');
    if (purchaseOrderTableExists && await knex.schema.hasColumn('purchase_orders', 'supplier_id')) {
        const purchaseCount = await knex('purchase_orders').where({ supplier_id: supplierId }).count('id as count').first();
        if (purchaseCount && purchaseCount.count > 0) return true;
    }
    // Add checks for other relevant tables like 'stock_entries', 'purchase_returns' etc.
    return false;
};


// --- Helper: Prepare Data (simplified version, assuming more complex prep in route or frontend) ---
// Your route file has a more detailed prepareSupplierData.
// This controller will assume data is reasonably prepared by the time it gets here,
// or you can move the full logic from routes/suppliers.js here.
const prepareSupplierDataForDb = (inputData) => {
    const data = { ...inputData };

    // Basic type conversions and nullification for empty strings
    const fieldsToNullifyIfEmpty = ['address', 'city', 'contact_person', 'telephone', 'fax', 'email', 'since_date', 'main_category_id', 'tax_invoice_details'];
    fieldsToNullifyIfEmpty.forEach(field => {
        if (data[field] === '') data[field] = null;
    });

    if (data.main_category_id) data.main_category_id = parseInt(data.main_category_id, 10) || null;
    if (data.default_discount_percent) data.default_discount_percent = parseFloat(data.default_discount_percent) || 0;
    if (data.credit_limit) data.credit_limit = parseFloat(data.credit_limit) || 0;
    if (data.credit_days) data.credit_days = parseInt(data.credit_days, 10) || 0;
    data.is_default_supplier = Boolean(data.is_default_supplier);

    // Remove fields not directly in the table or handled by DB
    delete data.id;
    delete data.created_at;
    delete data.updated_at;
    // delete data.code; // If 'code' is not a user-settable field

    return data;
};


/**
 * @desc    Get all suppliers
 * @route   GET /api/suppliers
 * @access  Private (requires supplier:read)
 */
const getSuppliers = async (req, res, next) => {
    try {
        // Basic query, you can add pagination, filtering, sorting from req.query later
        const suppliers = await knex('suppliers').select('*').orderBy('name', 'asc');
        res.status(200).json({
            success: true,
            count: suppliers.length,
            data: suppliers
        });
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        next(error);
    }
};

/**
 * @desc    Get a single supplier by ID
 * @route   GET /api/suppliers/:id
 * @access  Private (requires supplier:read)
 */
const getSupplierById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const supplier = await knex('suppliers').where({ id }).first();

        if (!supplier) {
            return res.status(404).json({ success: false, message: `Supplier not found with id ${id}` });
        }
        res.status(200).json({ success: true, data: supplier });
    } catch (error) {
        console.error(`Error fetching supplier ${req.params.id}:`, error);
        next(error);
    }
};

/**
 * @desc    Create a new supplier
 * @route   POST /api/suppliers
 * @access  Private (requires supplier:create)
 */
const createSupplier = async (req, res, next) => {
    try {
        const preparedData = prepareSupplierDataForDb(req.body);

        if (!preparedData.name) {
            return res.status(400).json({ success: false, message: 'Supplier name is required.' });
        }

        // Check if email already exists if it's meant to be unique
        if (preparedData.email) {
            const existingSupplier = await knex('suppliers').where({ email: preparedData.email }).first();
            if (existingSupplier) {
                return res.status(400).json({ success: false, message: `Supplier with email ${preparedData.email} already exists.` });
            }
        }

        const [newSupplier] = await knex('suppliers')
            .insert(preparedData)
            .returning('*'); // Return all columns of the new row

        res.status(201).json({ success: true, data: newSupplier });
    } catch (error) {
        console.error('Error creating supplier:', error);
        if (error.code === '23505') { // Unique constraint violation (e.g. for email if unique)
             return res.status(400).json({ success: false, message: 'Supplier with this email or other unique identifier already exists.' });
        }
        next(error);
    }
};

/**
 * @desc    Update an existing supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private (requires supplier:update)
 */
const updateSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;
        const preparedData = prepareSupplierDataForDb(req.body);

        if (!preparedData.name) {
            return res.status(400).json({ success: false, message: 'Supplier name is required.' });
        }

        // Check if email already exists for a *different* supplier
        if (preparedData.email) {
            const existingSupplier = await knex('suppliers')
                .where({ email: preparedData.email })
                .andWhereNot({ id })
                .first();
            if (existingSupplier) {
                return res.status(400).json({ success: false, message: `Another supplier with email ${preparedData.email} already exists.` });
            }
        }
        
        const [updatedSupplier] = await knex('suppliers')
            .where({ id })
            .update({
                ...preparedData,
                updated_at: knex.fn.now() // Explicitly set updated_at
            })
            .returning('*');

        if (!updatedSupplier) {
            return res.status(404).json({ success: false, message: `Supplier not found with id ${id}` });
        }

        res.status(200).json({ success: true, data: updatedSupplier });
    } catch (error) {
        console.error(`Error updating supplier ${req.params.id}:`, error);
         if (error.code === '23505') { 
             return res.status(400).json({ success: false, message: 'Supplier with this email or other unique identifier already exists.' });
        }
        next(error);
    }
};

/**
 * @desc    Delete a supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private (requires supplier:delete)
 */
const deleteSupplier = async (req, res, next) => {
    try {
        const { id } = req.params;

        const supplierExists = await knex('suppliers').where({ id }).first();
        if (!supplierExists) {
            return res.status(404).json({ success: false, message: `Supplier not found with id ${id}` });
        }

        // Check if the supplier is in use
        const inUse = await isSupplierInUse(id);
        if (inUse) {
            return res.status(400).json({ success: false, message: `Supplier (ID: ${id}) cannot be deleted because it is currently in use (e.g., linked to products or purchase orders).` });
        }

        const numDeleted = await knex('suppliers').where({ id }).del();

        if (numDeleted === 0) {
            // Should have been caught by supplierExists check, but as a safeguard
            return res.status(404).json({ success: false, message: `Supplier not found with id ${id}, delete failed.` });
        }

        res.status(200).json({ success: true, message: `Supplier (ID: ${id}) deleted successfully.` });
    } catch (error) {
        console.error(`Error deleting supplier ${req.params.id}:`, error);
        next(error);
    }
};

module.exports = {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
};