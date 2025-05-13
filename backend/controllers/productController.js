const knex = require('../db/knex');
const { ROLES } = require('../utils/roles');
// This line must work for the rest of the code to function
const { prepareProductData, processProductUnits, processAttributesAndVariations } = require('../utils/productDataProcessors');

// GET /api/products - List products
const getProducts = async (req, res, next) => {
    // ... (your existing getProducts logic - seems mostly fine)
    // Ensure all relevant columns for filtering/sorting are handled
    // console.log(`[ProductCtrl] GET / - User: ${req.user ? req.user.username : 'Guest'}, Store ID from query: ${req.query.storeId}`);
    const {
        page = 1,
        limit = 10,
        sortBy = 'products.created_at', // Default sort column
        sortOrder = 'desc',      // Default sort order
        searchTerm,
        categoryId,
        subCategoryId,
        brandId,
        storeId, // For filtering by a specific store
        productType,
        supplier_id, 
        inventory_type, // Added
        selling_type,   // Added
        include 
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Define allowed sort columns, including potential joined columns
    const allowedSortColumns = {
        'id': 'products.id',
        'product_name': 'products.product_name',
        'name': 'products.product_name', // Alias for product_name
        'slug': 'products.slug',
        'sku': 'products.sku',
        'retail_price': 'products.retail_price',
        'cost_price': 'products.cost_price',
        'wholesale_price': 'products.wholesale_price',
        'product_type': 'products.product_type',
        'created_at': 'products.created_at',
        'updated_at': 'products.updated_at',
        'category_name': 'categories.name', // Joined field
        'brand_name': 'brands.name',       // Joined field
        'store_name': 'stores.name',         // Joined field
        'supplier_name': 'suppliers.name'    // Joined field
    };
    const safeSortBy = allowedSortColumns[sortBy] || allowedSortColumns['created_at'];
    const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    try {
        let query = knex('products');
        let countQuery = knex('products'); // Separate query for counting

        // Base selections - always include products.id for distinct counting
        const selectFields = ['products.*'];
        const groupByFields = ['products.id'];

        // Conditional Joins and Selections based on 'include' or filter parameters
        const includesArray = include ? include.split(',') : [];

        if (includesArray.includes('category') || categoryId || sortBy === 'category_name') {
            query.leftJoin('categories', 'products.category_id', 'categories.id');
            countQuery.leftJoin('categories', 'products.category_id', 'categories.id');
            if (!selectFields.includes('categories.name as category_name')) selectFields.push('categories.name as category_name');
            if (!groupByFields.includes('categories.name')) groupByFields.push('categories.name');
        }
        if (includesArray.includes('subCategory') || subCategoryId) {
            query.leftJoin('sub_categories', 'products.sub_category_id', 'sub_categories.id');
            countQuery.leftJoin('sub_categories', 'products.sub_category_id', 'sub_categories.id');
            if (!selectFields.includes('sub_categories.name as sub_category_name')) selectFields.push('sub_categories.name as sub_category_name');
            if (!groupByFields.includes('sub_categories.name')) groupByFields.push('sub_categories.name');
        }
        if (includesArray.includes('brand') || brandId || sortBy === 'brand_name') {
            query.leftJoin('brands', 'products.brand_id', 'brands.id');
            countQuery.leftJoin('brands', 'products.brand_id', 'brands.id');
            if (!selectFields.includes('brands.name as brand_name')) selectFields.push('brands.name as brand_name');
            if (!groupByFields.includes('brands.name')) groupByFields.push('brands.name');
        }
        if (includesArray.includes('baseUnit')) {
            query.leftJoin('units as base_units', 'products.base_unit_id', 'base_units.id');
            // countQuery doesn't need this join unless filtering on base_units.name
            if (!selectFields.includes('base_units.name as base_unit_name')) selectFields.push('base_units.name as base_unit_name');
            if (!groupByFields.includes('base_units.name')) groupByFields.push('base_units.name');
        }
        if (includesArray.includes('store') || storeId || sortBy === 'store_name') {
            query.leftJoin('stores', 'products.store_id', 'stores.id');
            countQuery.leftJoin('stores', 'products.store_id', 'stores.id');
            if (!selectFields.includes('stores.name as store_name')) selectFields.push('stores.name as store_name');
            if (!groupByFields.includes('stores.name')) groupByFields.push('stores.name');
        }
        if (includesArray.includes('supplier') || supplier_id || sortBy === 'supplier_name') {
            query.leftJoin('suppliers', 'products.supplier_id', 'suppliers.id');
            countQuery.leftJoin('suppliers', 'products.supplier_id', 'suppliers.id');
            if (!selectFields.includes('suppliers.name as supplier_name')) selectFields.push('suppliers.name as supplier_name');
            if (!groupByFields.includes('suppliers.name')) groupByFields.push('suppliers.name');
        }
        // Add other joins for tax, manufacturer etc. if needed for display or filtering

        query.select(selectFields).groupBy(groupByFields);


        // Apply filters to both queries
        const applyFilters = (q) => {
            if (searchTerm) {
                q.where(function() {
                    this.where('products.product_name', 'ilike', `%${searchTerm}%`)
                        .orWhere('products.sku', 'ilike', `%${searchTerm}%`)
                        .orWhere('products.description', 'ilike', `%${searchTerm}%`);
                });
            }
            if (categoryId) q.where('products.category_id', parseInt(categoryId, 10));
            if (subCategoryId) q.where('products.sub_category_id', parseInt(subCategoryId, 10));
            if (brandId) q.where('products.brand_id', parseInt(brandId, 10));
            if (productType) q.where('products.product_type', productType);
            if (supplier_id) q.where('products.supplier_id', parseInt(supplier_id, 10));
            if (inventory_type) q.where('products.inventory_type', inventory_type);
            if (selling_type) q.where('products.selling_type', selling_type);

            // Role-based store filtering
            if (req.user.role_name !== ROLES.GLOBAL_ADMIN) {
                const userAccessibleStores = req.user.associated_store_ids || [];
                if (req.user.store_id && !userAccessibleStores.includes(req.user.store_id)) {
                    userAccessibleStores.push(req.user.store_id);
                }

                if (storeId) { // User is filtering by a specific store
                    if (userAccessibleStores.includes(parseInt(storeId, 10))) {
                        q.where('products.store_id', parseInt(storeId, 10));
                    } else {
                        // If user filters for a store they don't have access to, return empty or error
                        q.whereRaw('1 = 0'); // Effectively no results
                    }
                } else { // User is not filtering by a specific store, show accessible
                    q.where(function() {
                        this.whereIn('products.store_id', userAccessibleStores)
                            .orWhereNull('products.store_id'); // Include global products
                    });
                }
            } else { // Global admin
                if (storeId) { // Global admin filtering by specific store
                    q.where('products.store_id', parseInt(storeId, 10));
                }
                // If no storeId, global admin sees all
            }
        };

        applyFilters(query);
        applyFilters(countQuery);
        
        const totalResult = await countQuery.countDistinct('products.id as total').first();
        const totalProducts = parseInt(totalResult.total, 10);

        query.orderBy(safeSortBy, safeSortOrder)
             .limit(limitNum)
             .offset((pageNum - 1) * limitNum);

        const productsData = await query;

        res.status(200).json({
            success: true,
            products: productsData,
            currentPage: pageNum,
            totalPages: Math.ceil(totalProducts / limitNum),
            totalProducts: totalProducts,
            limit: limitNum
        });
    } catch (error) {
        console.error('[ProductCtrl] Error fetching products:', error.message, error.stack);
        next(error);
    }
};

// GET /api/products/:id - Fetch single product
const getProductById = async (req, res, next) => {
    // ... (your existing getProductById logic - seems mostly fine)
    // Ensure it includes all necessary related data based on 'include' query param
    // and respects user permissions for store-specific products.
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;
    const { include } = req.query; // e.g. "variations,attributes,product_units,category,brand,supplier,tax"

    if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });

    try {
        let query = knex('products').where('products.id', productId);
        
        const product = await query.first(); // Fetch the base product first

        if (!product) {
            return res.status(404).json({ message: `Product with ID ${productId} not found.` });
        }

        // Role-based access check
        if (userRole !== ROLES.GLOBAL_ADMIN && product.store_id !== null) {
            const accessibleStores = associated_store_ids || [];
            if (userStoreId && !accessibleStores.includes(userStoreId)) {
                accessibleStores.push(userStoreId); // Add user's direct store if not in associated list
            }
            if (!accessibleStores.includes(product.store_id)) {
                return res.status(403).json({ message: 'Forbidden: You do not have access to this product.' });
            }
        }

        let responseData = { ...product };
        const includesArray = include ? include.split(',') : [];

        // Join related data based on 'include'
        if (includesArray.includes('category')) {
            const category = await knex('categories').where({id: product.category_id}).first();
            responseData.category = category;
        }
        if (includesArray.includes('subCategory') && product.sub_category_id) {
            const subCategory = await knex('sub_categories').where({id: product.sub_category_id}).first();
            responseData.sub_category = subCategory;
        }
        if (includesArray.includes('brand') && product.brand_id) {
            const brand = await knex('brands').where({id: product.brand_id}).first();
            responseData.brand = brand;
        }
        if (includesArray.includes('baseUnit') && product.base_unit_id) {
            const baseUnit = await knex('units').where({id: product.base_unit_id}).first();
            responseData.base_unit = baseUnit;
        }
        if (includesArray.includes('supplier') && product.supplier_id) {
            const supplier = await knex('suppliers').where({id: product.supplier_id}).first();
            responseData.supplier = supplier;
        }
        if (includesArray.includes('manufacturer') && product.manufacturer_id) {
            const manufacturer = await knex('manufacturers').where({id: product.manufacturer_id}).first();
            responseData.manufacturer = manufacturer;
        }
        if (includesArray.includes('tax') && product.tax_id) {
            const tax = await knex('taxes').where({id: product.tax_id}).first();
            responseData.tax = tax;
        }
        if (includesArray.includes('store') && product.store_id) {
            const store = await knex('stores').where({id: product.store_id}).first();
            responseData.store = store;
        }
         if (includesArray.includes('warranty') && product.warranty_id) {
            const warranty = await knex('warranties').where({id: product.warranty_id}).first();
            responseData.warranty = warranty;
        }


        if (includesArray.includes('product_units')) {
            const productUnits = await knex('product_units')
                .join('units', 'product_units.unit_id', 'units.id')
                .select(
                    'product_units.id', 'product_units.unit_id', 'units.name as unit_name', 'units.short_name as unit_short_name',
                    'product_units.conversion_factor', 'product_units.is_purchase_unit',
                    'product_units.is_sales_unit'
                )
                .where('product_units.product_id', productId)
                .orderBy('units.name');
            responseData.product_units_config = productUnits; // Match frontend expected key
        }

        if (product.product_type === 'Variable') {
            if (includesArray.includes('variations') || includesArray.includes('attributes')) {
                 const variations = await knex('product_variations')
                    .where({ product_id: productId })
                    .select('*');

                const variationsData = [];
                for (const variation of variations) {
                    const attributeDetails = await knex('product_variation_attribute_values as pvav')
                        .join('attribute_values as av', 'pvav.attribute_value_id', 'av.id')
                        .join('attributes as a', 'av.attribute_id', 'a.id')
                        .where('pvav.product_variation_id', variation.id)
                        .select('a.id as attribute_id', 'a.name as attribute_name', 'av.id as attribute_value_id', 'av.value as attribute_value');
                    
                    const attributeCombination = {};
                    const attributesForVariation = []; // For attributes_config structure
                     attributeDetails.forEach(ad => {
                        attributeCombination[ad.attribute_name] = ad.attribute_value;
                        // Collect for attributes_config like structure if needed per variation
                        const existingAttr = attributesForVariation.find(a => a.attribute_id === ad.attribute_id);
                        if (existingAttr) {
                            if (!existingAttr.values.includes(ad.attribute_value)) {
                                existingAttr.values.push(ad.attribute_value);
                            }
                        } else {
                            attributesForVariation.push({attribute_id: ad.attribute_id, name: ad.attribute_name, values: [ad.attribute_value]});
                        }
                    });
                    variationsData.push({ ...variation, attribute_combination, attributes: attributesForVariation });
                }
                responseData.variations_data = variationsData;
            }
             if (includesArray.includes('attributes')) { // For the whole product
                const distinctAttributesQuery = await knex('product_variations as pv')
                    .join('product_variation_attribute_values as pvav', 'pv.id', 'pvav.product_variation_id')
                    .join('attribute_values as av', 'pvav.attribute_value_id', 'av.id')
                    .join('attributes as a', 'av.attribute_id', 'a.id')
                    .where('pv.product_id', productId)
                    .distinct('a.id as attribute_id', 'a.name as attribute_name')
                    .select();
                
                const attributesConfigData = [];
                for (const attr of distinctAttributesQuery) {
                    const values = await knex('attribute_values as av')
                        .distinct('av.value')
                        .join('product_variation_attribute_values as pvav', 'av.id', 'pvav.attribute_value_id')
                        .join('product_variations as pv', 'pvav.product_variation_id', 'pv.id')
                        .where('av.attribute_id', attr.attribute_id)
                        .andWhere('pv.product_id', productId)
                        .pluck('value');
                    attributesConfigData.push({ attribute_id: attr.attribute_id, name: attr.attribute_name, values: values.sort() });
                }
                responseData.attributes_config = attributesConfigData;
            }
        }
        
        res.status(200).json(responseData);
    } catch (err) {
        console.error(`[ProductCtrl] Error fetching product ${productId}:`, err.message, err.stack);
        next(err);
    }
};


// POST /api/products - Create a new product
const createProduct = async (req, res, next) => {
    console.log(`[ProductCtrl POST /] User: ${req.user?.id}, Role: ${req.user?.role_name}`);
    // console.log('[ProductCtrl POST /] Request Body:', JSON.stringify(req.body, null, 2)); // Careful with large payloads or sensitive data

    try {
        // req.body will contain text fields from multer; req.file will contain the image
        const rawPayload = { ...req.body };
        
        // Extract complex JSON string fields first
        const attributes_config_json = rawPayload.attributes_config;
        const variations_data_json = rawPayload.variations_data;
        const product_units_config_json = rawPayload.product_units_config;

        delete rawPayload.attributes_config;
        delete rawPayload.variations_data;
        delete rawPayload.product_units_config;

        // Prepare main product data (all other fields)
        let preparedData = prepareProductData(rawPayload); // This should handle type conversions

        // Parse JSON fields after main data preparation
        const attributes_config = attributes_config_json ? JSON.parse(attributes_config_json) : null;
        const variations_data = variations_data_json ? JSON.parse(variations_data_json) : null;
        const product_units_config = product_units_config_json ? JSON.parse(product_units_config_json) : null;


        // --- Validations ---
        if (!preparedData.product_name || !preparedData.category_id || !preparedData.base_unit_id || !preparedData.product_type) {
            return res.status(400).json({ message: 'Missing required product fields (name, category, base unit, product type).' });
        }
        if (!['Standard', 'Variable'].includes(preparedData.product_type)) {
            return res.status(400).json({ message: "Product type must be 'Standard' or 'Variable'." });
        }
        if (preparedData.product_type === 'Variable' && (!variations_data || variations_data.length === 0)) {
            // return res.status(400).json({ message: "Variable products must have at least one variation defined." });
            // Or allow creation without variations initially, depending on workflow
        }
        if (preparedData.product_type === 'Standard' && (variations_data && variations_data.length > 0)) {
            return res.status(400).json({ message: "Standard products cannot have variations data." });
        }


        // --- Store ID assignment based on role ---
        if (req.user.role_name === ROLES.STORE_ADMIN || req.user.role_name === ROLES.STORE_MANAGER) {
            if (req.user.current_store_id) { 
                preparedData.store_id = req.user.current_store_id;
            } else if (!preparedData.store_id) { 
                return res.status(400).json({ message: 'Store information missing for product creation by your role.' });
            }
        } else if (req.user.role_name !== ROLES.GLOBAL_ADMIN && !preparedData.store_id) {
            // For other roles, if store_id is not provided, it implies a global product.
            // Business rule: Can non-global admins create global products? If not, enforce store_id.
            // For now, we allow it, meaning preparedData.store_id would be null.
        }
        
        // --- Handle Barcode Image ---
        if (req.file && req.file.path) { 
            preparedData.barcode_image_path = req.file.path.replace(/\\/g, '/');
        }

        // --- Database Transaction ---
        await knex.transaction(async trx => {
            const [newProduct] = await trx('products').insert(preparedData).returning('*');

            if (product_units_config && Array.isArray(product_units_config) && product_units_config.length > 0) {
                await processProductUnits(trx, newProduct.id, product_units_config, newProduct.base_unit_id);
            }

            if (newProduct.product_type === 'Variable' && variations_data && Array.isArray(variations_data) && variations_data.length > 0) {
                // attributes_config might be used by processAttributesAndVariations to validate/create attributes if needed
                await processAttributesAndVariations(trx, newProduct.id, attributes_config, variations_data);
            }
            res.status(201).json({ message: 'Product created successfully.', product: newProduct });
        });

    } catch (error) {
        console.error('[ProductCtrl POST /] Error:', error.message, error.stack);
        if (error.code === '23505') return res.status(409).json({ message: 'Conflict: SKU or other unique identifier already exists.', detail: error.detail });
        if (error.code === '23503') return res.status(400).json({ message: 'Invalid data: A specified reference (e.g., category) does not exist.', detail: error.detail });
        if (error instanceof SyntaxError && error.message.includes("JSON.parse")) { // Catch JSON parsing errors
            return res.status(400).json({ message: `Invalid JSON format in request: ${error.message}` });
        }
        next(error);
    }
};

// PUT /api/products/:id - Update a product
const updateProduct = async (req, res, next) => {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;

    if (isNaN(productId)) {
        return res.status(400).json({ message: 'Invalid product ID.' });
    }
    
    // console.log(`[ProductCtrl PUT /${id}] User: ${userId}, Role: ${userRole}`);
    // console.log('[ProductCtrl PUT /] Request Body:', JSON.stringify(req.body, null, 2));


    try {
        const existingProduct = await knex('products').where({ id: productId }).first();
        if (!existingProduct) {
            return res.status(404).json({ message: `Product with ID ${productId} not found.` });
        }

        // --- Authorization Check ---
        if (userRole !== ROLES.GLOBAL_ADMIN && existingProduct.store_id !== null) {
            const accessibleStores = associated_store_ids || [];
            if (userStoreId && !accessibleStores.includes(userStoreId)) {
                accessibleStores.push(userStoreId);
            }
            if (!accessibleStores.includes(existingProduct.store_id)) {
                return res.status(403).json({ message: 'Forbidden: You do not have access to update this product.' });
            }
        }
        
        const rawPayload = { ...req.body };

        const shouldRemoveBarcodeImage = rawPayload.remove_barcode_image === '1';
        delete rawPayload.remove_barcode_image; // Remove flag before passing to prepareProductData

        // Extract complex JSON string fields first
        const attributes_config_json = rawPayload.attributes_config;
        const variations_data_json = rawPayload.variations_data;
        const product_units_config_json = rawPayload.product_units_config;

        delete rawPayload.attributes_config;
        delete rawPayload.variations_data;
        delete rawPayload.product_units_config;
        
        // Prepare main product data (all other fields)
        // Pass existingProduct to allow prepareProductData to merge or decide on defaults
        let preparedData = prepareProductData({ ...existingProduct, ...rawPayload }); 
        
        // Parse JSON fields
        const attributes_config = attributes_config_json ? JSON.parse(attributes_config_json) : null;
        const variations_data = variations_data_json ? JSON.parse(variations_data_json) : null;
        const product_units_config = product_units_config_json ? JSON.parse(product_units_config_json) : null;

        // --- Handle Barcode Image ---
        if (req.file && req.file.path) {
            preparedData.barcode_image_path = req.file.path.replace(/\\/g, '/'); 
        } else if (shouldRemoveBarcodeImage) {
            preparedData.barcode_image_path = null;
        }
        // If no new file and no removal flag, barcode_image_path remains as it was in existingProduct/rawPayload

        // --- Validations (similar to create, but consider existingProduct type) ---
        if (preparedData.product_type && existingProduct.product_type !== preparedData.product_type) {
            // Handle product type change - this can be complex.
            // e.g., if changing from Standard to Variable, variations_data would be needed.
            // If changing from Variable to Standard, existing variations might need to be deleted.
            // For simplicity, you might disallow changing product_type directly here and require a different process.
            // For now, let's assume if product_type is in payload, it's the new type.
            if (preparedData.product_type === 'Variable' && (!variations_data || variations_data.length === 0)) {
                // return res.status(400).json({ message: "Changing to Variable product requires variations data." });
            }
        }


        // --- Database Transaction ---
        await knex.transaction(async trx => {
            // Remove 'id', 'created_at' from preparedData for update, updated_at will be set by prepareProductData
            delete preparedData.id;
            delete preparedData.created_at; 

            const [updatedProduct] = await trx('products')
                .where({ id: productId })
                .update(preparedData) 
                .returning('*');

            if (!updatedProduct) {
                throw new Error('Product update failed or product not found after update.');
            }

            // --- Handle related data updates ---
            // Product Units: Decide on strategy (replace all, or manage individually via separate endpoints)
            if (product_units_config && Array.isArray(product_units_config)) {
                // Example: Replace all existing units for simplicity in this main update
                await trx('product_units').where({ product_id: updatedProduct.id }).del();
                if (product_units_config.length > 0) {
                    await processProductUnits(trx, updatedProduct.id, product_units_config, updatedProduct.base_unit_id);
                }
            }

            // Variations and Attributes for Variable Products
            if (updatedProduct.product_type === 'Variable') {
                if (variations_data && Array.isArray(variations_data)) {
                    // processAttributesAndVariations needs to handle updates intelligently
                    // (add new, update existing, remove old ones not in the payload)
                    await processAttributesAndVariations(trx, updatedProduct.id, attributes_config, variations_data);
                }
            } else if (existingProduct.product_type === 'Variable' && updatedProduct.product_type === 'Standard') {
                // If changed from Variable to Standard, delete old variations
                await trx('product_variation_attribute_values')
                    .whereIn('product_variation_id', function() { this.select('id').from('product_variations').where('product_id', updatedProduct.id); })
                    .del();
                await trx('product_variations').where({ product_id: updatedProduct.id }).del();
            }


            res.status(200).json({ message: 'Product updated successfully.', product: updatedProduct });
        });

    } catch (error) {
        console.error(`[ProductCtrl PUT /${id}] Error:`, error.message, error.stack);
        if (error.code === '23505') { 
            return res.status(409).json({ message: 'Conflict: SKU or other unique identifier already exists.', detail: error.detail });
        }
        if (error.code === '23503') { 
            return res.status(400).json({ message: 'Invalid data: A specified reference (e.g., category, brand) does not exist.', detail: error.detail });
        }
        if (error instanceof SyntaxError && error.message.includes("JSON.parse")) {
            return res.status(400).json({ message: `Invalid JSON format in request: ${error.message}` });
        }
        res.status(500).json({ message: error.message || 'Failed to update product.' });
    }
};

// DELETE /api/products/:id - Delete a product
const deleteProduct = async (req, res, next) => {
    // ... (your existing deleteProduct logic - seems mostly fine)
    // Ensure all related data is properly cleaned up (cascade delete or manual)
    // and appropriate checks for dependencies (e.g., in sales orders) are in place.
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;

    if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });

    try {
        const product = await knex('products').where({ id: productId }).first();
        if (!product) {
            return res.status(404).json({ message: `Product with ID ${productId} not found.` });
        }

        // Authorization check
        let canDeleteThisProduct = false;
        if (userRole === ROLES.GLOBAL_ADMIN) {
            canDeleteThisProduct = true;
        } else if (userRole === ROLES.STORE_ADMIN || userRole === ROLES.STORE_MANAGER) {
            // Store admins/managers can delete products from their assigned stores,
            // or global products if business logic allows (e.g. STORE_ADMIN for global products).
            // Current logic: only if product.store_id is in their accessible list.
            const accessibleStores = associated_store_ids || [];
            if (userStoreId && !accessibleStores.includes(userStoreId)) {
                 accessibleStores.push(userStoreId);
            }
            if (product.store_id === null && userRole === ROLES.STORE_ADMIN) { // Store Admin can delete global products
                // canDeleteThisProduct = true; // Uncomment if this is the desired business rule
            } else if (product.store_id && accessibleStores.includes(product.store_id)) {
                canDeleteThisProduct = true;
            }
        }
        if (!canDeleteThisProduct) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this product.' });
        }

        // Check for dependencies before deleting
        const poItemCount = await knex('purchase_order_items').where({ product_id: productId }).count('id as count').first();
        if (poItemCount && parseInt(poItemCount.count, 10) > 0) {
            return res.status(409).json({ message: 'Conflict: Product cannot be deleted as it is part of existing purchase orders.' });
        }
        const saleItemCount = await knex('sale_items').where({ product_id: productId }).count('id as count').first();
         if (saleItemCount && parseInt(saleItemCount.count, 10) > 0) {
            return res.status(409).json({ message: 'Conflict: Product cannot be deleted as it is part of existing sales records.' });
        }
        // Add more checks for inventory, etc., if direct deletion is problematic.
        // Consider a "soft delete" (is_active = false) pattern as an alternative.


        await knex.transaction(async trx => {
            // Delete related data first if not handled by ON DELETE CASCADE
            // Assuming ON DELETE CASCADE is set for product_variations on product_id,
            // and for product_variation_attribute_values on product_variation_id.
            // And for product_units on product_id.
            // If not, delete them manually:
            await trx('product_variation_attribute_values')
                .whereIn('product_variation_id', function() {
                    this.select('id').from('product_variations').where('product_id', productId);
                }).del();
            await trx('product_variations').where({ product_id: productId }).del();
            await trx('product_units').where({ product_id: productId }).del();
            // Delete product images if stored and referenced
            // await trx('product_images').where({ product_id: productId }).del(); 
            
            const deletedCount = await trx('products').where({ id: productId }).del();
            if (deletedCount > 0) {
                // Optionally: delete barcode image file from filesystem if it exists
                // if (product.barcode_image_path) { fs.unlink(...) }
                res.status(200).json({ message: `Product ${productId} and its related data deleted successfully.` });
            } else {
                res.status(404).json({ message: `Product ${productId} not found or already deleted.` });
            }
        });

    } catch (err) {
        if (err.code === '23503') { 
            return res.status(409).json({ 
                message: 'Conflict: This product cannot be deleted as it is referenced by other records.', 
                detail: err.detail 
            });
        }
        console.error(`[ProductCtrl DELETE /${id}] Error by UserID ${userId}:`, err.message, err.stack);
        next(err);
    }
};


module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
};
