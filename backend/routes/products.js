const express = require('express');
const { ROLES } = require('../utils/roles'); // Assuming you have a roles utility

// It's crucial that 'authenticateToken' middleware is applied to the '/api/products' path 
// BEFORE this router in server.js, so req.user is populated.

function createProductsRouter(knex) {
    const router = express.Router();

    // --- Helper Function for Data Preparation ---
    const prepareProductData = (inputData) => {
        const data = { ...inputData };
        const fieldsToNullifyIfEmpty = [ 'slug', 'sku', 'sub_category_id', 'special_category_id', 'brand_id', 'barcode_symbology_id', 'item_barcode', 'tax_id', 'discount_type_id', 'discount_value', 'measurement_type', 'measurement_value', 'weight', 'manufacturer_id', 'warranty_id', 'expiry_notification_days', 'supplier_id', 'store_id', 'wholesale_price', 'max_sales_qty_per_person', 'description' ];
        const numericFields = [ 'cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight' ];
        const integerFields = ['category_id', 'sub_category_id', 'special_category_id', 'brand_id', 'base_unit_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id', 'expiry_notification_days', 'max_sales_qty_per_person']; // Added FKs here for parsing
        const booleanFields = ['has_expiry', 'is_serialized'];
        // const dateFields = []; // Not currently used for direct conversion in this function

        for (const key in data) {
            if (typeof data[key] === 'string') {
                data[key] = data[key].trim();
            }
            if (fieldsToNullifyIfEmpty.includes(key) && data[key] === '') {
                data[key] = null;
            }

            if (numericFields.includes(key) && data[key] !== null) {
                const parsed = parseFloat(data[key]);
                data[key] = isNaN(parsed) ? null : parsed;
            }
            // Ensure integerFields (including FKs) are parsed correctly
            if (integerFields.includes(key) && data[key] !== null) {
                const parsedInt = parseInt(data[key], 10);
                data[key] = isNaN(parsedInt) ? null : parsedInt;
            }
            if (booleanFields.includes(key)) {
                // Handles "true", "false", true, false, 1, 0, null, undefined
                if (data[key] === 'true' || data[key] === 1 || data[key] === '1') data[key] = true;
                else if (data[key] === 'false' || data[key] === 0 || data[key] === '0') data[key] = false;
                else data[key] = Boolean(data[key]); // Fallback, though explicit is better
            }
        }
        delete data.id; // Prevent client from setting ID
        delete data.created_at; // Prevent client from setting created_at
        // updated_at will be set by route handlers
        return data;
    };

    // --- API Route Definitions ---

    // GET /api/products - List products with pagination and role-based filtering
    router.get('/', async (req, res, next) => {
        const { page = 1, limit = 10, storeId: queryStoreId, categoryId, brandId, searchTerm, sortBy = 'products.product_name', order = 'asc' } = req.query;
        const userId = req.user.id;
        const userRole = req.user.role_name;
        const userStoreId = req.user.store_id;

        console.log(`[ProductRoutes] GET / - User: ${userId} (${userRole}), UserStore: ${userStoreId}, Query: ${JSON.stringify(req.query)}`);

        const allowedViewRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.STORE_MANAGER, ROLES.SALES_PERSON];
        if (!allowedViewRoles.includes(userRole)) {
            return res.status(403).json({ message: "Forbidden: You do not have permission to view products." });
        }

        try {
            let query = knex('products')
                .leftJoin('categories', 'products.category_id', 'categories.id')
                .leftJoin('brands', 'products.brand_id', 'brands.id')
                .leftJoin('units as base_units', 'products.base_unit_id', 'base_units.id')
                .leftJoin('stores', 'products.store_id', 'stores.id')
                .select(
                    'products.id', 'products.product_name', 'products.product_name as name',
                    'products.sku', 'products.retail_price', 'products.cost_price', 'products.wholesale_price',
                    'categories.name as category_name', 'brands.name as brand_name',
                    'base_units.name as base_unit_name',
                    'products.store_id', 'stores.name as store_name'
                );

            // Store-based filtering
            if (userRole === ROLES.GLOBAL_ADMIN) {
                if (queryStoreId) {
                    if (queryStoreId.toLowerCase() === 'null' || queryStoreId === '0') {
                        query = query.whereNull('products.store_id');
                    } else {
                        query = query.where('products.store_id', parseInt(queryStoreId, 10));
                    }
                }
                // If no queryStoreId, Global Admin sees all (store-specific AND global products).
            } else { // Store-level users
                const accessibleStoreIds = req.user.associated_store_ids || [];
                if (userStoreId && !accessibleStoreIds.includes(userStoreId)) {
                    accessibleStoreIds.push(userStoreId);
                }

                if (queryStoreId) {
                    if (queryStoreId.toLowerCase() === 'null' || queryStoreId === '0') {
                        query = query.whereNull('products.store_id'); // Show only global products
                    } else {
                        const requestedStoreId = parseInt(queryStoreId, 10);
                        if (!accessibleStoreIds.includes(requestedStoreId)) {
                            return res.status(403).json({ message: "Forbidden: You can only view products for your associated stores or global products." });
                        }
                        // Show products for that specific store OR global products
                        query = query.where(builder =>
                            builder.where('products.store_id', requestedStoreId)
                                   .orWhereNull('products.store_id')
                        );
                    }
                } else { // No specific store queried by store user: show their stores' products AND global products
                    if (accessibleStoreIds.length > 0) {
                        query = query.where(builder =>
                            builder.whereIn('products.store_id', accessibleStoreIds)
                                   .orWhereNull('products.store_id')
                        );
                    } else {
                        // No associated stores, show only global products
                        query = query.whereNull('products.store_id');
                    }
                }
            }

            if (categoryId) query = query.where('products.category_id', parseInt(categoryId, 10));
            if (brandId) query = query.where('products.brand_id', parseInt(brandId, 10));
            if (searchTerm) {
                query = query.where(builder =>
                    builder.where('products.product_name', 'ilike', `%${searchTerm}%`)
                           .orWhere('products.sku', 'ilike', `%${searchTerm}%`)
                );
            }
            
            const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
            const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
            
            const productsData = await query.orderBy(sortBy, order).limit(parseInt(limit, 10)).offset(offset);
            const { total } = await countQuery.first();
            const totalCount = parseInt(total, 10);

            res.status(200).json({
                data: productsData,
                pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total: totalCount, totalPages: Math.ceil(totalCount / parseInt(limit, 10)) }
            });
        } catch (err) {
            console.error(`[ProductRoutes] [ERROR] GET /api/products: UserID ${userId}, Role ${userRole}`, err);
            next(err);
        }
    });

    // GET /api/products/:id - Fetch single product
    router.get('/:id', async (req, res, next) => {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        const userId = req.user.id;
        const userRole = req.user.role_name;
        const userStoreId = req.user.store_id;

        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });
        console.log(`[ProductRoutes] GET /${productId} - User: ${userId} (${userRole})`);

        const allowedViewRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.STORE_MANAGER, ROLES.SALES_PERSON];
        if (!allowedViewRoles.includes(userRole)) {
            return res.status(403).json({ message: "Forbidden: You do not have permission to view this product." });
        }

        try {
            const product = await knex('products').where({ id: productId }).first();
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${productId} not found.` });
            }

            if (userRole !== ROLES.GLOBAL_ADMIN) {
                if (product.store_id !== null) { // If product is store-specific
                    const accessibleStoreIds = req.user.associated_store_ids || [];
                    if (userStoreId && !accessibleStoreIds.includes(userStoreId)) {
                         accessibleStoreIds.push(userStoreId);
                    }
                    if (!accessibleStoreIds.includes(product.store_id)) {
                        return res.status(403).json({ message: 'Forbidden: You do not have access to this product.' });
                    }
                }
                // If product.store_id is null (global), store users can access it.
            }

            const productUnits = await knex('product_units')
                .join('units', 'product_units.unit_id', 'units.id')
                .select('product_units.id', 'product_units.unit_id', 'units.name as unit_name', 'product_units.conversion_factor', 'product_units.is_purchase_unit', 'product_units.is_sales_unit')
                .where('product_units.product_id', productId).orderBy('units.name');
            
            res.status(200).json({ ...product, product_units: productUnits });
        } catch (err) {
            console.error(`[ProductRoutes] [ERROR] GET /api/products/${productId}: UserID ${userId}`, err);
            next(err);
        }
    });

    // POST /api/products - Create a new product
    router.post('/', async (req, res, next) => {
        const userId = req.user.id;
        const userRole = req.user.role_name;
        const userStoreId = req.user.store_id;

        console.log(`[ProductRoutes] POST / - User: ${userId} (${userRole}), UserStore: ${userStoreId}, Body: ${JSON.stringify(req.body)}`);

        const allowedCreateRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]; // Define who can create
        if (!allowedCreateRoles.includes(userRole)) {
            return res.status(403).json({ message: "Forbidden: You do not have permission to create products." });
        }

        const baseRequiredFields = ['product_name', 'category_id', 'base_unit_id', 'retail_price', 'cost_price'];
        const missingBaseFields = baseRequiredFields.filter(field => !(field in req.body) || req.body[field] === '' || req.body[field] === null);
        if (missingBaseFields.length > 0) {
            return res.status(400).json({ message: `Missing required fields: ${missingBaseFields.join(', ')}.` });
        }

        let preparedData;
        try { 
            preparedData = prepareProductData(req.body); 
        } catch (prepError) { 
            console.error("[ProductRoutes] Error preparing product data:", prepError); 
            return res.status(400).json({ message: 'Invalid data format submitted.' }); 
        }
        
        let final_product_store_id = null; // Default to global product

        if (userRole === ROLES.STORE_ADMIN) {
            if (!userStoreId) { // Should not happen if role is STORE_ADMIN and system is consistent
                return res.status(403).json({ message: "Forbidden: Store Admins must be assigned to a store." });
            }
            // If STORE_ADMIN provides a store_id in payload, it's used (and should be their own, or it's an issue)
            // If STORE_ADMIN does NOT provide a store_id, it becomes global.
            if (preparedData.store_id !== undefined && preparedData.store_id !== null) {
                if (preparedData.store_id !== userStoreId) {
                    console.warn(`[ProductRoutes] STORE_ADMIN ${userId} provided store_id ${preparedData.store_id} which differs from their assigned store ${userStoreId}. Using assigned store.`);
                }
                final_product_store_id = userStoreId; // Always assign to their own store if they specify any store
            } else {
                final_product_store_id = null; // Global product if store_id is omitted by STORE_ADMIN
                console.log(`[ProductRoutes] STORE_ADMIN ${userId} creating a global product.`);
            }
        } else if (userRole === ROLES.GLOBAL_ADMIN) {
            // If GLOBAL_ADMIN provides a store_id, use it. Otherwise, it's global.
            if (preparedData.store_id !== undefined && preparedData.store_id !== null) {
                final_product_store_id = preparedData.store_id;
            } else {
                final_product_store_id = null; // Global product
            }
        }
        // For other roles with create permission (if any added later), they would create global products by default
        // unless specific logic is added for them.

        preparedData.store_id = final_product_store_id;

        const { cost_price, retail_price, wholesale_price } = preparedData;
        if (cost_price === null || cost_price < 0) return res.status(400).json({ message: 'Cost Price must be a non-negative number.' });
        if (retail_price === null || retail_price < 0) return res.status(400).json({ message: 'Retail Price must be a non-negative number.' });
        if (retail_price < cost_price) return res.status(400).json({ message: 'Retail Price cannot be less than Cost Price.' });
        if (wholesale_price !== null && (wholesale_price < 0 || wholesale_price < cost_price)) return res.status(400).json({ message: 'Wholesale Price cannot be negative or less than Cost Price.' });

        try {
            if (preparedData.base_unit_id === null || !(await knex('units').where({ id: preparedData.base_unit_id }).first())) return res.status(400).json({ message: `Invalid or missing Base Unit ID.` });
            if (preparedData.category_id === null || !(await knex('categories').where({ id: preparedData.category_id }).first())) return res.status(400).json({ message: `Invalid or missing Category ID.` });
            
            if (preparedData.store_id !== null) { // Validate store_id only if it's not null
                if (!(await knex('stores').where({ id: preparedData.store_id }).first())) {
                    return res.status(400).json({ message: `Invalid Store ID: ${preparedData.store_id}. Store does not exist.` });
                }
            }

            const newProductData = { ...preparedData, created_at: new Date(), updated_at: new Date() };
            console.log("[ProductRoutes] Final product data for insertion:", newProductData);

            const [insertedProduct] = await knex('products').insert(newProductData).returning('*');
            res.status(201).json(insertedProduct);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: A product with similar unique details (e.g., SKU) already exists. ${err.detail}` });
            if (err.code === '23503') return res.status(400).json({ message: `Invalid reference ID provided. ${err.detail}` });
            console.error(`[ProductRoutes] [ERROR] POST /api/products: UserID ${userId}`, err);
            next(err);
        }
    });

    // PUT /api/products/:id - Update an existing product
    router.put('/:id', async (req, res, next) => {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        const userId = req.user.id;
        const userRole = req.user.role_name;
        const userStoreId = req.user.store_id;

        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });
        if (Object.keys(req.body).length === 0) return res.status(400).json({ message: 'No update data provided.' });
        console.log(`[ProductRoutes] PUT /${productId} - User: ${userId} (${userRole})`);

        const allowedUpdateRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.STORE_MANAGER];
        if (!allowedUpdateRoles.includes(userRole)) {
            return res.status(403).json({ message: "Forbidden: You do not have permission to update products." });
        }

        try {
            const currentProduct = await knex('products').where({ id: productId }).first();
            if (!currentProduct) {
                return res.status(404).json({ message: `Product with ID ${productId} not found.` });
            }

            let canUpdateThisProduct = false;
            if (userRole === ROLES.GLOBAL_ADMIN) {
                canUpdateThisProduct = true;
            } else { // STORE_ADMIN, STORE_MANAGER
                if (currentProduct.store_id === null) { // Can update global products
                    canUpdateThisProduct = true;
                } else { // Can update products in their associated stores
                    const accessibleStoreIds = req.user.associated_store_ids || [];
                    if (userStoreId && !accessibleStoreIds.includes(userStoreId)) {
                         accessibleStoreIds.push(userStoreId);
                    }
                    if (accessibleStoreIds.includes(currentProduct.store_id)) {
                        canUpdateThisProduct = true;
                    }
                }
            }
            if (!canUpdateThisProduct) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to update this specific product.' });
            }

            const preparedData = prepareProductData(req.body);
            const productUpdates = { ...preparedData, updated_at: new Date() };
            delete productUpdates.created_at;

            // Handle store_id changes
            if (productUpdates.hasOwnProperty('store_id') && productUpdates.store_id !== currentProduct.store_id) {
                const newStoreId = productUpdates.store_id; // Can be an ID or null

                if (userRole === ROLES.GLOBAL_ADMIN) {
                    if (newStoreId !== null && !(await knex('stores').where({ id: newStoreId }).first())) {
                        return res.status(400).json({ message: `Invalid new Store ID: ${newStoreId}. Store does not exist.` });
                    }
                } else { // STORE_ADMIN, STORE_MANAGER
                    const accessibleStoreIds = req.user.associated_store_ids || [];
                    if (userStoreId && !accessibleStoreIds.includes(userStoreId)) {
                         accessibleStoreIds.push(userStoreId);
                    }
                    if (newStoreId !== null && !accessibleStoreIds.includes(newStoreId)) {
                        return res.status(403).json({ message: 'Forbidden: You can only assign products to your associated stores or make them global.' });
                    }
                }
            } else if (!productUpdates.hasOwnProperty('store_id')) {
                // If store_id is not in the update payload, it should not be changed.
                // Ensure it's not accidentally set to null by prepareProductData if it was missing.
                // So, explicitly set it back to currentProduct.store_id if not in payload.
                productUpdates.store_id = currentProduct.store_id;
            }


            const finalCostPrice = productUpdates.cost_price !== undefined ? productUpdates.cost_price : currentProduct.cost_price;
            const finalRetailPrice = productUpdates.retail_price !== undefined ? productUpdates.retail_price : currentProduct.retail_price;
            const finalWholesalePrice = productUpdates.wholesale_price !== undefined ? productUpdates.wholesale_price : currentProduct.wholesale_price;

            if (finalCostPrice === null || finalCostPrice < 0) return res.status(400).json({ message: 'Cost Price must be a non-negative number.' });
            if (finalRetailPrice === null || finalRetailPrice < 0) return res.status(400).json({ message: 'Retail Price must be a non-negative number.' });
            if (finalRetailPrice < finalCostPrice) return res.status(400).json({ message: 'Retail Price cannot be less than Cost Price.' });
            if (finalWholesalePrice !== null && (finalWholesalePrice < 0 || finalWholesalePrice < finalCostPrice)) return res.status(400).json({ message: 'Wholesale Price cannot be negative or less than Cost Price.' });

            if (productUpdates.base_unit_id !== undefined && productUpdates.base_unit_id !== null && !(await knex('units').where({ id: productUpdates.base_unit_id }).first())) return res.status(400).json({ message: `Invalid Base Unit ID: ${productUpdates.base_unit_id}` });
            if (productUpdates.category_id !== undefined && productUpdates.category_id !== null && !(await knex('categories').where({ id: productUpdates.category_id }).first())) return res.status(400).json({ message: `Invalid Category ID: ${productUpdates.category_id}` });
            
            let hasChanges = false;
            for (const key in productUpdates) {
                if (key === 'updated_at') continue;
                if (productUpdates.hasOwnProperty(key)) {
                    const updatedVal = productUpdates[key] === undefined ? null : productUpdates[key];
                    const currentVal = currentProduct[key] === undefined ? null : currentProduct[key];
                    if (updatedVal !== currentVal) {
                        hasChanges = true;
                        break;
                    }
                }
            }

            if (!hasChanges) {
                console.log(`[ProductRoutes] No actual data change detected for product ${productId}.`);
                return res.status(200).json(currentProduct);
            }

            await knex('products').where({ id: productId }).update(productUpdates);
            const updatedProduct = await knex('products').where({ id: productId }).first(); // Fetch again to get the final state
            res.status(200).json(updatedProduct);
        } catch (err) {
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Product with similar unique details already exists. ${err.detail}` });
            if (err.code === '23503') return res.status(400).json({ message: `Invalid reference ID. ${err.detail}` });
            console.error(`[ProductRoutes] [ERROR] PUT /api/products/${productId}: UserID ${userId}`, err);
            next(err);
        }
    });

    // DELETE /api/products/:id - Delete a product
    router.delete('/:id', async (req, res, next) => {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        const userId = req.user.id;
        const userRole = req.user.role_name;
        const userStoreId = req.user.store_id;

        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });
        console.log(`[ProductRoutes] DELETE /${productId} - User: ${userId} (${userRole})`);

        const allowedDeleteRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN];
        if (!allowedDeleteRoles.includes(userRole)) {
            return res.status(403).json({ message: "Forbidden: You do not have permission to delete products." });
        }
        
        try {
            const product = await knex('products').where({ id: productId }).first();
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${productId} not found.` });
            }

            if (userRole === ROLES.STORE_ADMIN) {
                if (product.store_id !== null) { // If product is store-specific
                    const accessibleStoreIds = req.user.associated_store_ids || [];
                    if (userStoreId && !accessibleStoreIds.includes(userStoreId)) {
                         accessibleStoreIds.push(userStoreId);
                    }
                    if (!accessibleStoreIds.includes(product.store_id)) {
                        return res.status(403).json({ message: 'Forbidden: You can only delete products in your associated stores or global products.' });
                    }
                }
                // If product.store_id is null (global), store admin can delete it.
            }
            // Global admin can delete any product.

            const deletedCount = await knex('products').where({ id: productId }).del();
            if (deletedCount > 0) {
                res.status(200).json({ message: `Product ${productId} deleted successfully.` });
            } else {
                res.status(404).json({ message: `Product ${productId} not found or already deleted.` });
            }
        } catch (err) {
            if (err.code === '23503') {
                return res.status(409).json({ message: 'Conflict: This product cannot be deleted as it is referenced by other records (e.g., sales, inventory).', detail: err.detail });
            }
            console.error(`[ProductRoutes] [ERROR] DELETE /api/products/${productId}: UserID ${userId}`, err);
            next(err);
        }
    });

    return router;
}

module.exports = createProductsRouter;