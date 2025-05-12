const express = require('express');
const { ROLES } = require('../utils/roles'); // Assuming you have a roles utility
// Ensure authenticateToken and checkPermission middleware are correctly imported or available
// For example:
// const { authenticateToken } = require('../middleware/authMiddleware');
// const { checkPermission } = require('../middleware/permissionsMiddleware');


function createProductsRouter(knex, authenticateToken, checkPermission) { // checkPermission is now the permission checker
    const router = require('express').Router();
    console.log('[PRODUCTS.JS] createProductsRouter called. authenticateToken is function:', typeof authenticateToken === 'function', 'checkPermission is function:', typeof checkPermission === 'function'); // ADD THIS LOG

    // --- Helper Function for Data Preparation ---
    const prepareProductData = (inputData) => {
        // ... your existing prepareProductData logic ...
        // For now, ensure it doesn't throw an unexpected error if called.
        // You might even temporarily simplify it or comment out its usage if it's complex.
        const data = { ...inputData };
        // ...
        return data;
    };

    // GET /api/products - List products (KEEP AS IS)
    router.get('/', authenticateToken, checkPermission('product:read'), async (req, res) => {
        const {
            page = 1,
            limit = 10,
            sortBy = 'product_name', // Default sort column
            sortOrder = 'asc',      // Default sort order
            searchTerm,
            categoryId,
            subCategoryId,
            brandId,
            storeId,
            productType,
            inventoryType,
            sellingType,
            include
        } = req.query;

        // Validate sortBy parameter against a list of allowed columns
        const allowedSortColumns = [
            'id', 'product_name', 'name', 'slug', 'sku', 'retail_price', 'cost_price',
            'wholesale_price', 'product_type', 'created_at', 'updated_at'
            // Add aliased columns from joins if you intend to sort by them, e.g., 'category_name'
            // Note: Sorting by joined columns can sometimes be less performant.
        ];
        const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'product_name';
        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'asc';

        try {
            let query = knex('products');
            const selectFields = [
                'products.id', 'products.product_name', 'products.product_name as name',
                'products.slug', 'products.sku', 'products.retail_price',
                'products.cost_price', 'products.wholesale_price', 'products.product_type',
                'products.created_at', 'products.updated_at' // Assuming these exist
                // 'products.is_active', // This column does not exist based on error
            ];

            const includesArray = include ? include.split(',') : [];

            if (includesArray.includes('category') || categoryId) {
                query.leftJoin('categories', 'products.category_id', 'categories.id');
                selectFields.push('categories.name as category_name');
            }
            if (includesArray.includes('subCategory') || subCategoryId) {
                query.leftJoin('sub_categories', 'products.sub_category_id', 'sub_categories.id');
                selectFields.push('sub_categories.name as sub_category_name');
            }
            if (includesArray.includes('brand') || brandId) {
                query.leftJoin('brands', 'products.brand_id', 'brands.id');
                selectFields.push('brands.name as brand_name');
            }
            if (includesArray.includes('baseUnit')) {
                query.leftJoin('units as base_units', 'products.base_unit_id', 'base_units.id');
                selectFields.push('base_units.name as base_unit_name');
            }
            if (includesArray.includes('store') || storeId) {
                query.leftJoin('stores', 'products.store_id', 'stores.id');
                selectFields.push('products.store_id as product_store_id'); // Alias to avoid conflict if store has 'id'
                selectFields.push('stores.name as store_name');
            }

            query.select(selectFields);

            // Apply filters
            if (searchTerm) {
                query.where(function() {
                    this.where('products.product_name', 'like', `%${searchTerm}%`)
                        .orWhere('products.sku', 'like', `%${searchTerm}%`)
                        .orWhere('products.description', 'like', `%${searchTerm}%`);
                });
            }
            if (categoryId) query.where('products.category_id', categoryId);
            if (subCategoryId) query.where('products.sub_category_id', subCategoryId);
            if (brandId) query.where('products.brand_id', brandId);
            if (storeId) query.where('products.store_id', storeId);
            else if (storeId === 'null') query.whereNull('products.store_id'); // For explicitly fetching global products
            if (productType) query.where('products.product_type', productType);
            if (inventoryType) query.where('products.inventory_type', inventoryType);
            if (sellingType) query.where('products.selling_type', sellingType);


            // Count total products for pagination
            const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
            const totalResult = await countQuery.first();
            const totalProducts = parseInt(totalResult.total, 10);
            const totalPages = Math.ceil(totalProducts / limit);

            // Apply pagination and sorting
            const offset = (page - 1) * limit;
            query.orderBy(`products.${safeSortBy}`, safeSortOrder)
                 .limit(limit)
                 .offset(offset);

            const products = await query;

            res.json({
                products,
                currentPage: parseInt(page, 10),
                totalPages,
                totalProducts,
                limit: parseInt(limit, 10)
            });

        } catch (error) {
            console.error('Error fetching products:', error.message);
            console.error(error.stack);
            res.status(500).json({ message: 'Error fetching products', error: error.message });
        }
    });

    // GET /api/products/:id - Fetch single product (KEEP AS IS)
    router.get('/:id', authenticateToken, checkPermission('product:read'), async (req, res, next) => {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;
        const { include } = req.query;

        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });

        try {
            const product = await knex('products').where({ id: productId }).first();
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${productId} not found.` });
            }

            // Role-based access for specific product
            if (userRole !== ROLES.GLOBAL_ADMIN && product.store_id !== null) {
                const accessibleStores = associated_store_ids || [];
                if (userStoreId && !accessibleStores.includes(userStoreId)) {
                    accessibleStores.push(userStoreId);
                }
                if (!accessibleStores.includes(product.store_id)) {
                    return res.status(403).json({ message: 'Forbidden: You do not have access to this product.' });
                }
            }

            const productUnits = await knex('product_units')
                .join('units', 'product_units.unit_id', 'units.id')
                .select(
                    'product_units.id', 'product_units.unit_id', 'units.name as unit_name',
                    'product_units.conversion_factor', 'product_units.is_purchase_unit',
                    'product_units.is_sales_unit'
                )
                .where('product_units.product_id', productId)
                .orderBy('units.name');

            let responseData = { ...product, product_units: productUnits };

            if (product.product_type === 'Variable' && include) {
                const includesArray = include.split(',');
                if (includesArray.includes('variations')) {
                    const variations = await knex('product_variations')
                        .where({ product_id: productId })
                        .select('*'); // Add more specific fields if needed

                    const variationsData = [];
                    for (const variation of variations) {
                        const attributeDetails = await knex('product_variation_attribute_values as pvav')
                            .join('attribute_values as av', 'pvav.attribute_value_id', 'av.id')
                            .join('attributes as a', 'av.attribute_id', 'a.id')
                            .where('pvav.product_variation_id', variation.id)
                            .select('a.name as attribute_name', 'av.value as attribute_value');
                        
                        const attributeCombination = attributeDetails.reduce((acc, ad) => {
                            acc[ad.attribute_name] = ad.attribute_value;
                            return acc;
                        }, {});
                        variationsData.push({ ...variation, attribute_combination: attributeCombination });
                    }
                    responseData.variations_data = variationsData;
                }

                if (includesArray.includes('attributes')) {
                    // Fetch attributes_config based on the product's variations
                    const distinctAttributes = await knex('product_variations as pv')
                        .join('product_variation_attribute_values as pvav', 'pv.id', 'pvav.product_variation_id')
                        .join('attribute_values as av', 'pvav.attribute_value_id', 'av.id')
                        .join('attributes as a', 'av.attribute_id', 'a.id')
                        .where('pv.product_id', productId)
                        .distinct('a.id as attribute_id', 'a.name as attribute_name')
                        .select();
                    
                    const attributesConfig = [];
                    for (const attr of distinctAttributes) {
                        const values = await knex('attribute_values as av')
                            .distinct('av.value')
                            .join('product_variation_attribute_values as pvav', 'av.id', 'pvav.attribute_value_id')
                            .join('product_variations as pv', 'pvav.product_variation_id', 'pv.id')
                            .where('av.attribute_id', attr.attribute_id)
                            .andWhere('pv.product_id', productId)
                            .pluck('value');
                        attributesConfig.push({ id: attr.attribute_id, name: attr.attribute_name, values: values.sort() });
                    }
                    responseData.attributes_config = attributesConfig;
                }
            }
            
            res.status(200).json(responseData);
        } catch (err) {
            console.error(`Error fetching product ${productId}:`, err.message);
            console.error(err.stack);
            next(err); // Pass to global error handler
        }
    });

    // POST /api/products - Create a new product
    router.post('/', authenticateToken, checkPermission('product:create'), async (req, res, next) => {
        console.log(`[PRODUCTS.JS - POST /] Received request to create product. User: ${req.user?.id}, Role: ${req.user?.role_name}`);
        console.log('[PRODUCTS.JS - POST /] Request Body:', JSON.stringify(req.body, null, 2));
        
        try {
            const { attributes_config, variations_data, product_units_config, ...productPayload } = req.body;

            // Basic Validations (ensure these are robust)
            if (!productPayload.product_name || !productPayload.category_id || !productPayload.base_unit_id || !productPayload.product_type) {
                console.error('[PRODUCTS.JS - POST /] Validation failed: Missing core fields.');
                return res.status(400).json({ message: 'Missing required product fields (name, category, base unit, product type).' });
            }
            if (!['Standard', 'Variable'].includes(productPayload.product_type)) {
                console.error('[PRODUCTS.JS - POST /] Validation failed: Invalid product_type.');
                return res.status(400).json({ message: "Product type is required and must be 'Standard' or 'Variable'." });
            }

            let preparedData;
            try {
                preparedData = prepareProductData(productPayload); // Assuming prepareProductData is defined and works
            } catch (prepError) {
                console.error('[PRODUCTS.JS - POST /] Error preparing product data:', prepError.message);
                return res.status(400).json({ message: prepError.message || 'Invalid data format submitted for product.' });
            }
            
            // Add store_id based on user role if applicable
            if (req.user.role_name === 'STORE_ADMIN' || req.user.role_name === 'STORE_MANAGER') {
                if (req.user.current_store_id) {
                    preparedData.store_id = req.user.current_store_id;
                } else {
                    // This case should ideally be prevented by ensuring STORE_ADMIN/MANAGER always have a current_store_id
                    console.warn(`[PRODUCTS.JS - POST /] User ${req.user.id} (${req.user.role_name}) is creating a product but has no current_store_id.`);
                    // Depending on business logic, you might assign a default or throw an error.
                    // For now, let's assume if it's not GLOBAL_ADMIN, and store_id isn't set, it's an issue.
                    if (!preparedData.store_id) { // If store_id wasn't in payload and user isn't global
                         return res.status(400).json({ message: 'Store information missing for product creation.' });
                    }
                }
            } else if (req.user.role_name !== 'GLOBAL_ADMIN' && !preparedData.store_id) {
                // If not a global admin and no store_id is provided in payload (e.g. by a higher role)
                // This logic depends on whether non-global admins can create global products
                // For now, let's assume they can't without explicit store_id
                 console.warn(`[PRODUCTS.JS - POST /] Non-GLOBAL_ADMIN User ${req.user.id} trying to create product without store_id.`);
                 // return res.status(400).json({ message: 'Store ID is required for product creation by your role.' });
            }


            // Database Insertion
            await knex.transaction(async trx => {
                const [newProduct] = await trx('products').insert(preparedData).returning('*');

                if (product_units_config && product_units_config.length > 0) {
                    const unitsToInsert = product_units_config.map(unitConfig => ({
                        product_id: newProduct.id,
                        unit_id: unitConfig.unit_id,
                        base_unit_id: newProduct.base_unit_id, // Use the main product's base unit
                        conversion_factor: unitConfig.conversion_factor,
                        is_purchase_unit: unitConfig.is_purchase_unit,
                        is_sales_unit: unitConfig.is_sales_unit,
                        created_at: trx.fn.now(), // Add timestamps
                        updated_at: trx.fn.now()  // Add timestamps
                    }));
                    await trx('product_units').insert(unitsToInsert);
                }

                // Handle variations if product_type is 'Variable'
                if (newProduct.product_type === 'Variable' && variations_data && variations_data.length > 0) {
                    console.log('[PRODUCTS.JS - POST /] Processing variations_data:', JSON.stringify(variations_data, null, 2));
                    for (const variationItem of variations_data) {
                        const { attribute_combination, ...variationPayload } = variationItem;
                        
                        // Insert into product_variations
                        const [newVariation] = await trx('product_variations').insert({
                            product_id: newProduct.id,
                            sku: variationPayload.sku,
                            cost_price: variationPayload.cost_price,
                            retail_price: variationPayload.retail_price,
                            wholesale_price: variationPayload.wholesale_price,
                            // is_active: true, // Default is true in DB schema
                            created_at: trx.fn.now(),
                            updated_at: trx.fn.now()
                        }).returning('*');
                        console.log(`[PRODUCTS.JS - POST /] Created product_variation with ID: ${newVariation.id}`);

                        if (attribute_combination && typeof attribute_combination === 'object') {
                            for (const attributeName in attribute_combination) {
                                const attributeValueName = attribute_combination[attributeName];

                                // Find attribute_id by name
                                const attribute = await trx('attributes').whereRaw('LOWER(name) = LOWER(?)', [attributeName.trim()]).first();
                                if (!attribute) {
                                    console.warn(`[PRODUCTS.JS - POST /] Attribute named "${attributeName}" not found. Skipping for variation ${newVariation.id}.`);
                                    continue;
                                }

                                // Find attribute_value_id by value and attribute_id
                                const attributeValue = await trx('attribute_values')
                                    .where({ attribute_id: attribute.id })
                                    .andWhereRaw('LOWER(value) = LOWER(?)', [attributeValueName.trim()])
                                    .first();
                                
                                if (!attributeValue) {
                                    console.warn(`[PRODUCTS.JS - POST /] Attribute value "${attributeValueName}" for attribute "${attributeName}" (ID: ${attribute.id}) not found. Skipping for variation ${newVariation.id}.`);
                                    continue;
                                }

                                // Insert into product_variation_attribute_values
                                await trx('product_variation_attribute_values').insert({
                                    product_variation_id: newVariation.id,
                                    attribute_value_id: attributeValue.id,
                                    created_at: trx.fn.now(),
                                    updated_at: trx.fn.now()
                                });
                                console.log(`[PRODUCTS.JS - POST /] Linked variation ${newVariation.id} to attribute value ${attributeValue.id} (${attributeName}: ${attributeValueName})`);
                            }
                        }
                    }
                }
                // The second block for product_units_config was a duplicate and can be removed if the first one is complete.

                // Refetch the product with potential joins if needed for the response, or use newProduct directly
                // For simplicity, we'll use newProduct. If you need joined data (like category_name), refetch.
                const productForResponse = newProduct; 

                res.status(201).json({ 
                    message: 'Product created successfully', 
                    product: productForResponse 
                });
            });

        } catch (error) {
            console.error('[PRODUCTS.JS - POST /] Error creating product:', error.message, error.stack);
            if (error.code === '23505') { // Unique constraint violation (e.g. SKU)
                return res.status(409).json({ message: 'Conflict: A product with this SKU or other unique identifier already exists.', detail: error.detail });
            }
            if (error.code === '23503') { // Foreign key violation
                 return res.status(400).json({ message: 'Invalid data: A specified reference (e.g., category, brand, unit) does not exist.', detail: error.detail });
            }
            // Pass to global error handler if not specifically handled
            next(error); 
        }
    });

    // PUT /api/products/:id - Update an existing product (SIMPLIFIED FOR TESTING)
    router.put('/:id', (req, res) => { // Temporarily remove authenticateToken, checkPermission
        const { id } = req.params;
        console.log(`[PRODUCTS.JS - PUT /${id} - SIMPLIFIED HANDLER] Reached simplified PUT handler.`);
        console.log(`[PRODUCTS.JS - PUT /${id} - SIMPLIFIED HANDLER] Request Body:`, JSON.stringify(req.body, null, 2));
        res.status(200).json({ 
            message: `Simplified PUT handler for product ${id} reached successfully. Product "updated".`, 
            product: { id: parseInt(id), ...req.body }
        });
    });
    
    // DELETE /api/products/:id - Delete a product
    router.delete('/:id', authenticateToken, checkPermission('product:delete'), async (req, res, next) => {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;

        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });

        try {
            const product = await knex('products').where({ id: productId }).first();
            if (!product) {
                return res.status(404).json({ message: `Product with ID ${productId} not found.` });
            }

            // Authorization: Check if user can delete this specific product
            let canDeleteThisProduct = false;
            if (userRole === ROLES.GLOBAL_ADMIN) {
                canDeleteThisProduct = true;
            } else if (userRole === ROLES.STORE_ADMIN) {
                 if (product.store_id === null) { // Store admin can delete global products
                    canDeleteThisProduct = true;
                } else {
                    const accessibleStores = associated_store_ids || [];
                    if (userStoreId && !accessibleStores.includes(userStoreId)) {
                         accessibleStores.push(userStoreId);
                    }
                    if (accessibleStores.includes(product.store_id)) {
                        canDeleteThisProduct = true;
                    }
                }
            }
            if (!canDeleteThisProduct) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this specific product.' });
            }

            // Database should have ON DELETE CASCADE for product_variations, product_variation_attribute_values, product_units
            // to handle deletion of related records automatically.
            const deletedCount = await knex('products').where({ id: productId }).del();

            if (deletedCount > 0) {
                res.status(200).json({ message: `Product ${productId} and its related data deleted successfully.` });
            } else {
                // Should have been caught by the "not found" check earlier
                res.status(404).json({ message: `Product ${productId} not found or already deleted.` });
            }
        } catch (err) {
            if (err.code === '23503') { // Foreign key violation (e.g., product in an order)
                return res.status(409).json({ 
                    message: 'Conflict: This product cannot be deleted as it is referenced by other records (e.g., sales, inventory movements). Consider deactivating the product instead.', 
                    detail: err.detail 
                });
            }
            console.error(`Error deleting product ${productId} by UserID ${userId}:`, err.message);
            console.error(err.stack);
            next(err);
        }
    });

    console.log('[PRODUCTS.JS] Product router instance configured with simplified POST/PUT.'); // ADD THIS LOG
    return router;
}

module.exports = createProductsRouter;