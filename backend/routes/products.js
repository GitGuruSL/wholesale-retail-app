const express = require('express');

// The function now accepts authorizeRole and ROLES
function createProductsRouter(knex, authorizeRole, ROLES) {
    const router = express.Router();

    // --- Helper Function for Data Preparation (Your existing function) ---
    const prepareProductData = (inputData) => {
        const data = { ...inputData };
        // ... (your existing prepareProductData logic remains unchanged) ...
        const fieldsToNullifyIfEmpty = [ 'slug', 'sku', 'sub_category_id', 'special_category_id', 'brand_id', 'barcode_symbology_id', 'item_barcode', 'tax_id', 'discount_type_id', 'discount_value', 'measurement_type', 'measurement_value', 'weight', 'manufacturer_id', 'warranty_id', 'expiry_notification_days', 'supplier_id', 'store_id', 'wholesale_price', 'max_sales_qty_per_person', 'description' ];
        const numericFields = [ 'cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight' ];
        const integerFields = ['expiry_notification_days', 'max_sales_qty_per_person'];
        const booleanFields = ['has_expiry', 'is_serialized'];
        const dateFields = []; // Add date fields if you have any that need specific parsing
        const foreignKeyFields = [ 'category_id', 'sub_category_id', 'special_category_id', 'brand_id', 'base_unit_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id' ];

        for (const key in data) {
            if (typeof data[key] === 'string') data[key] = data[key].trim();
            if ((fieldsToNullifyIfEmpty.includes(key) || foreignKeyFields.includes(key)) && data[key] === '') data[key] = null;
            if (numericFields.includes(key) && data[key] !== null && data[key] !== '') { const parsed = parseFloat(data[key]); data[key] = isNaN(parsed) ? null : parsed; }
            if (integerFields.includes(key) && data[key] !== null && data[key] !== '') { const parsed = parseInt(data[key], 10); data[key] = isNaN(parsed) ? null : parsed; }
            if (booleanFields.includes(key)) data[key] = Boolean(data[key]); // Handles true, "true", 1, false, "false", 0, null, undefined
            if (dateFields.includes(key) && data[key] !== null && data[key] !== '') { const date = new Date(data[key]); data[key] = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]; }
            if (foreignKeyFields.includes(key) && data[key] !== null && data[key] !== '') { const parsedInt = parseInt(data[key], 10); data[key] = isNaN(parsedInt) ? null : parsedInt; }
        }
        delete data.id; // Prevent client from setting ID
        delete data.created_at; // Prevent client from setting created_at
        // updated_at will be set by the route handlers
        return data;
    };


    // --- API Route Definitions ---

    // GET /api/products - Fetch list with joins
    // Example: Allow multiple roles to view products
    router.get('/', authorizeRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.STORE_MANAGER, ROLES.SALES_PERSON]), async (req, res, next) => {
        console.log(`[${new Date().toISOString()}] GET /api/products - Handler started by User ID: ${req.user.id}, Role: ${req.user.role}`);
        try {
            console.log(`[${new Date().toISOString()}] GET /api/products - Attempting Knex query with joins...`);
            const products = await knex('products')
                .leftJoin('categories', 'products.category_id', 'categories.id')
                .leftJoin('brands', 'products.brand_id', 'brands.id')
                .leftJoin('units', 'products.base_unit_id', 'units.id')
                .select(
                    'products.id',
                    'products.product_name as name',
                    'products.sku',
                    'brands.name as brand_name',
                    'products.retail_price as sale_price',
                    'products.cost_price',
                    'products.wholesale_price',
                    'categories.name as category_name',
                    'units.name as base_unit_name'
                )
                .orderBy('products.product_name').limit(100); // Consider pagination
            console.log(`[${new Date().toISOString()}] GET /api/products - Knex query successful. Fetched ${products.length} products.`);
            res.status(200).json(products);
            console.log(`[${new Date().toISOString()}] GET /api/products - Response sent.`);
        } catch (err) {
            console.error(`[${new Date().toISOString()}] [ERROR] GET /api/products:`, err);
            next(err);
        }
    });

    // GET /api/products/:id - Fetch single product
    // Example: Allow multiple roles to view a single product
    router.get('/:id', authorizeRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.STORE_MANAGER, ROLES.SALES_PERSON]), async (req, res, next) => {
        const { id } = req.params; const productId = parseInt(id);
        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });
        console.log(`[DEBUG] GET /api/products/${productId} handler started by User ID: ${req.user.id}, Role: ${req.user.role}`);
        try {
            // ... (your existing GET by ID logic remains unchanged) ...
            console.log(`[DEBUG] Fetching product details for ID: ${productId}`);
            const product = await knex('products').where({ id: productId }).first();
            if (!product) { console.log(`[DEBUG] Product ${productId} not found.`); return res.status(404).json({ message: `Product with ID ${id} not found.` }); }
            console.log(`[DEBUG] Product details fetched: Found`);

            console.log(`[DEBUG] Fetching product units for product ID: ${productId}`);
            const productUnits = await knex('product_units').join('units', 'product_units.unit_id', 'units.id')
                .select('product_units.id', 'product_units.unit_id', 'units.name as unit_name', 'product_units.conversion_factor', 'product_units.is_purchase_unit', 'product_units.is_sales_unit')
                .where('product_units.product_id', productId).orderBy('units.name');
            console.log(`[DEBUG] Fetched ${productUnits.length} product units.`);

            const responseData = { ...product, product_units: productUnits };
            console.log(`[DEBUG] Sending response for product ID: ${productId}`);
            res.status(200).json(responseData);
        } catch (err) {
            console.error(`[ERROR] Error fetching product ${id}:`, err);
            next(err);
        }
    });

    // POST /api/products - Create
    // Example: Only GLOBAL_ADMIN and STORE_ADMIN can create products
    router.post('/', authorizeRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]), async (req, res, next) => {
        console.log(`[DEBUG] POST /api/products handler started by User ID: ${req.user.id}, Role: ${req.user.role}`);
        // ... (your existing POST logic, validation, and prepareProductData call remain unchanged) ...
        const requiredFields = ['product_name', 'category_id', 'base_unit_id', 'retail_price', 'cost_price'];
        const missingFields = requiredFields.filter(field =>!(field in req.body) || req.body[field] === '' || req.body[field] === null || req.body[field] === undefined);
        if (missingFields.length > 0) return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}.` });

        let preparedData;
        try { preparedData = prepareProductData(req.body); }
        catch(prepError) { console.error("Error preparing product data:", prepError); return res.status(400).json({ message: 'Invalid data format submitted.' }); }
        
        // Add store_id from authenticated user if applicable and not already set by a global admin
        if (req.user.store_id && (preparedData.store_id === null || preparedData.store_id === undefined)) {
            if (req.user.role === ROLES.STORE_ADMIN || req.user.role === ROLES.STORE_MANAGER) {
                 preparedData.store_id = req.user.store_id;
                 console.log(`[DEBUG] Auto-assigning store_id ${req.user.store_id} based on user role ${req.user.role}`);
            }
        }
        // If user is global_admin, they MUST provide store_id if it's a required field for products
        if (req.user.role === ROLES.GLOBAL_ADMIN && (preparedData.store_id === null || preparedData.store_id === undefined)) {
            // Assuming store_id is mandatory for products. Adjust if not.
            // return res.status(400).json({ message: 'Global Admin must specify a store_id for the product.' });
            // Or, if products can exist without a store (e.g. master product list), this check might not be needed or different.
        }


        const newProductData = { ...preparedData, created_at: new Date(), updated_at: new Date() };


        // Price Validation
        const costPrice = newProductData.cost_price; const retailPrice = newProductData.retail_price; const wholesalePrice = newProductData.wholesale_price;
        if (costPrice === null || costPrice < 0) return res.status(400).json({ message: 'Cost Price must be a non-negative number.' });
        if (retailPrice === null || retailPrice < 0) return res.status(400).json({ message: 'Retail Price must be a non-negative number.' });
        if (retailPrice < costPrice) return res.status(400).json({ message: 'Retail Price cannot be less than Cost Price.' });
        if (wholesalePrice !== null) { if (wholesalePrice < 0) return res.status(400).json({ message: 'Wholesale Price cannot be negative.' }); if (wholesalePrice < costPrice) return res.status(400).json({ message: 'Wholesale Price cannot be less than Cost Price.' }); }

        try {
            if (newProductData.base_unit_id === null || isNaN(newProductData.base_unit_id)) return res.status(400).json({ message: 'Invalid or missing Base Unit ID.' });
            const baseUnitExists = await knex('units').where({ id: newProductData.base_unit_id }).first();
            if (!baseUnitExists) return res.status(400).json({ message: `Invalid reference ID provided (Base Unit ID: ${newProductData.base_unit_id} not found).` });

            if (newProductData.category_id === null || isNaN(newProductData.category_id)) return res.status(400).json({ message: 'Invalid or missing Category ID.' });
            const categoryExists = await knex('categories').where({ id: newProductData.category_id }).first();
            if (!categoryExists) return res.status(400).json({ message: `Invalid reference ID provided (Category ID: ${newProductData.category_id} not found).` });
            
            // Validate store_id if it's set
            if (newProductData.store_id !== null && newProductData.store_id !== undefined) {
                const storeExists = await knex('stores').where({ id: newProductData.store_id }).first();
                if (!storeExists) return res.status(400).json({ message: `Invalid reference ID provided (Store ID: ${newProductData.store_id} not found).` });
            }


            console.log("Attempting to insert product data:", JSON.stringify(newProductData, null, 2));
            const [insertedProduct] = await knex('products').insert(newProductData).returning('*');
            console.log("[DEBUG] Product inserted successfully:", insertedProduct.id);
            res.status(201).json(insertedProduct);
        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation (e.g. SKU)
                return res.status(409).json({ message: `Conflict: A product with similar unique details (e.g., SKU) already exists. ${err.detail}` });
            }
            if (err.code === '23503') { // Foreign key violation
                return res.status(400).json({ message: `Invalid reference ID provided. ${err.detail}` });
            }
            console.error(`[ERROR] POST /api/products:`, err);
            next(err);
        }
    });

    // PUT /api/products/:id - Update
    // Example: GLOBAL_ADMIN, STORE_ADMIN, STORE_MANAGER can update products
    router.put('/:id', authorizeRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.STORE_MANAGER]), async (req, res, next) => {
        const { id } = req.params; const productId = parseInt(id);
        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });
        if (Object.keys(req.body).length === 0) return res.status(400).json({ message: 'No update data provided.' });
        console.log(`[DEBUG] PUT /api/products/${productId} handler started by User ID: ${req.user.id}, Role: ${req.user.role}`);

        try {
            // ... (your existing PUT logic, validation, and prepareProductData call remain unchanged) ...
            let currentProduct = await knex('products').where({ id: productId }).first();
            if (!currentProduct) { console.log(`[DEBUG] Product ${productId} not found.`); return res.status(404).json({ message: `Product with ID ${id} not found.` }); }
            
            // Authorization: Store admin/manager can only update products in their own store
            if ((req.user.role === ROLES.STORE_ADMIN || req.user.role === ROLES.STORE_MANAGER) && currentProduct.store_id !== req.user.store_id) {
                console.warn(`[AUTHZ] User ${req.user.id} (Store ID: ${req.user.store_id}) attempted to update product ${productId} in store ${currentProduct.store_id}.`);
                return res.status(403).json({ message: 'Forbidden: You can only update products in your assigned store.' });
            }

            const preparedData = prepareProductData(req.body);
            const productUpdates = { ...preparedData, updated_at: new Date() };
            delete productUpdates.created_at; // Should not be updatable
            delete productUpdates.id; // ID is not updatable

            // Price Validation
            const finalCostPrice = productUpdates.cost_price !== undefined ? productUpdates.cost_price : currentProduct.cost_price;
            const finalRetailPrice = productUpdates.retail_price !== undefined ? productUpdates.retail_price : currentProduct.retail_price;
            const finalWholesalePrice = productUpdates.wholesale_price !== undefined ? productUpdates.wholesale_price : currentProduct.wholesale_price;
            if (finalCostPrice === null || finalCostPrice < 0) return res.status(400).json({ message: 'Cost Price must be a non-negative number.' });
            if (finalRetailPrice === null || finalRetailPrice < 0) return res.status(400).json({ message: 'Retail Price must be a non-negative number.' });
            if (finalRetailPrice < finalCostPrice) return res.status(400).json({ message: 'Retail Price cannot be less than Cost Price.' });
            if (finalWholesalePrice !== null) { if (finalWholesalePrice < 0) return res.status(400).json({ message: 'Wholesale Price cannot be negative.' }); if (finalWholesalePrice < finalCostPrice) return res.status(400).json({ message: 'Wholesale Price cannot be less than Cost Price.' }); }

            // Reference ID Validation
            if (productUpdates.base_unit_id !== undefined && productUpdates.base_unit_id !== null) { const baseUnitExists = await knex('units').where({ id: productUpdates.base_unit_id }).first(); if (!baseUnitExists) return res.status(400).json({ message: `Invalid Base Unit ID: ${productUpdates.base_unit_id}` }); } else if (productUpdates.base_unit_id === null && currentProduct.base_unit_id !== null) return res.status(400).json({ message: 'Base Unit ID cannot be removed once set.' });
            if (productUpdates.category_id !== undefined && productUpdates.category_id !== null) { const categoryExists = await knex('categories').where({ id: productUpdates.category_id }).first(); if (!categoryExists) return res.status(400).json({ message: `Invalid Category ID: ${productUpdates.category_id}` }); } else if (productUpdates.category_id === null && currentProduct.category_id !== null) return res.status(400).json({ message: 'Category ID cannot be removed once set.' });
            
            // Validate store_id if it's being changed
            if (productUpdates.store_id !== undefined && productUpdates.store_id !== null && productUpdates.store_id !== currentProduct.store_id) {
                if (req.user.role !== ROLES.GLOBAL_ADMIN) {
                    return res.status(403).json({ message: 'Forbidden: Only Global Admin can change the store assignment of a product.' });
                }
                const storeExists = await knex('stores').where({ id: productUpdates.store_id }).first();
                if (!storeExists) return res.status(400).json({ message: `Invalid reference ID provided (Store ID: ${productUpdates.store_id} not found).` });
            } else if (productUpdates.store_id === null && currentProduct.store_id !== null) {
                 if (req.user.role !== ROLES.GLOBAL_ADMIN) {
                    return res.status(403).json({ message: 'Forbidden: Only Global Admin can remove the store assignment of a product.' });
                }
            }


            // Prevent updates with no actual changes (comparing to currentProduct)
            let hasChanges = false;
            for (const key in productUpdates) {
                if (key !== 'updated_at' && productUpdates[key] !== currentProduct[key]) {
                    // Handle cases where null and undefined might be treated differently or dates
                    if (!(productUpdates[key] === null && currentProduct[key] === undefined) &&
                        !(productUpdates[key] === undefined && currentProduct[key] === null)) {
                        hasChanges = true;
                        break;
                    }
                }
            }
            if (!hasChanges) { console.log(`[DEBUG] No actual data change detected for product ${productId}.`); return res.status(200).json(currentProduct); }


            const count = await knex('products').where({ id: productId }).update(productUpdates);
            const updatedProduct = await knex('products').where({ id: productId }).first();
            res.status(200).json(updatedProduct);
        } catch (err) {
            if (err.code === '23505') { // Unique constraint violation
                return res.status(409).json({ message: `Conflict: A product with similar unique details (e.g., SKU) already exists. ${err.detail}` });
            }
            if (err.code === '23503') { // Foreign key violation
                return res.status(400).json({ message: `Invalid reference ID provided. ${err.detail}` });
            }
            console.error(`[ERROR] PUT /api/products/${id}:`, err);
            next(err);
        }
    });

    // DELETE /api/products/:id - Delete
    // Example: Only GLOBAL_ADMIN and STORE_ADMIN can delete products
    router.delete('/:id', authorizeRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]), async (req, res, next) => {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        if (isNaN(productId)) {
            return res.status(400).json({ message: 'Invalid product ID.' });
        }
        console.log(`[DEBUG] DELETE /api/products/${productId} handler started by User ID: ${req.user.id}, Role: ${req.user.role}`);
        try {
            const product = await knex('products').where({ id: productId }).first();
            if (!product) {
                console.log(`[DEBUG] Product ${productId} not found for deletion.`);
                return res.status(404).json({ message: `Product with ID ${id} not found.` });
            }

            // Authorization: Store admin can only delete products in their own store
            if (req.user.role === ROLES.STORE_ADMIN && product.store_id !== req.user.store_id) {
                console.warn(`[AUTHZ] User ${req.user.id} (Store ID: ${req.user.store_id}) attempted to delete product ${productId} in store ${product.store_id}.`);
                return res.status(403).json({ message: 'Forbidden: You can only delete products in your assigned store.' });
            }

            // Add checks for dependencies (e.g., if product is in sales orders, inventory items) before deletion
            // For example:
            // const isInSale = await knex('sale_items').where({ product_id: productId }).first();
            // if (isInSale) {
            //    return res.status(409).json({ message: 'Conflict: Product cannot be deleted as it is part of existing sales records.' });
            // }

            const deletedCount = await knex('products').where({ id: productId }).del();
            if (deletedCount > 0) {
                console.log(`[DEBUG] Product ${productId} deleted successfully.`);
                return res.status(200).json({ message: `Product ${productId} deleted successfully.` }); // Or res.status(204).send();
            } else {
                // This case should ideally be caught by the check above, but as a fallback:
                console.log(`[DEBUG] No rows deleted for product ${productId}, though it was found.`);
                return res.status(404).json({ message: `Product with ID ${id} found but could not be deleted.` });
            }
        } catch (err) {
            // Handle specific DB errors like foreign key constraints if product deletion is restricted
            if (err.code === '23503') { // PostgreSQL foreign key violation
                 return res.status(409).json({ message: 'Conflict: This product cannot be deleted because it is referenced by other records (e.g., sales, inventory).', detail: err.detail });
            }
            console.error(`[ERROR] DELETE /api/products/${productId} failed:`, err);
            next(err); // Pass to global error handler
        }
    });

    return router;
}

module.exports = createProductsRouter;