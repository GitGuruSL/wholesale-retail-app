const express = require('express');
const { ROLES } = require('../utils/roles'); // Assuming you have a roles utility
// Ensure authenticateToken and checkPermission middleware are correctly imported or available
// For example:
// const { authenticateToken } = require('../middleware/authMiddleware');
// const { checkPermission } = require('../middleware/permissionsMiddleware');


function createProductsRouter(knex, authenticateToken, checkPermission) {
    const router = express.Router();

    // --- Helper Function for Data Preparation ---
    const prepareProductData = (inputData) => {
        const data = { ...inputData };

        // Exclude fields specific to variable product handling that are not direct product columns
        const nonProductColumnFields = ['attributes_config', 'variations_data', 'product_units_config'];
        nonProductColumnFields.forEach(field => delete data[field]);

        const fieldsToNullifyIfEmpty = [
            'slug', 'sku', 'sub_category_id', 'special_category_id', 'brand_id',
            'barcode_symbology_id', 'item_barcode', 'tax_id', 'discount_type_id',
            'discount_value', 'measurement_type', 'measurement_value', 'weight',
            'manufacturer_id', 'warranty_id', 'expiry_notification_days',
            'supplier_id', 'store_id', 'wholesale_price', 'max_sales_qty_per_person', 'description'
        ];
        const numericFields = ['cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight'];
        const integerFields = [
            'category_id', 'sub_category_id', 'special_category_id', 'brand_id',
            'base_unit_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id',
            'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id',
            'expiry_notification_days', 'max_sales_qty_per_person'
        ];
        const booleanFields = ['has_expiry', 'is_serialized'];

        for (const key in data) {
            if (typeof data[key] === 'string') {
                data[key] = data[key].trim();
            }
            if (fieldsToNullifyIfEmpty.includes(key) && data[key] === '') {
                data[key] = null;
            }

            if (numericFields.includes(key) && data[key] !== null && data[key] !== undefined) {
                const parsed = parseFloat(data[key]);
                data[key] = isNaN(parsed) ? null : parsed;
            }
            if (integerFields.includes(key) && data[key] !== null && data[key] !== undefined) {
                const parsedInt = parseInt(data[key], 10);
                data[key] = isNaN(parsedInt) ? null : parsedInt;
            }
            if (booleanFields.includes(key)) {
                if (data[key] === 'true' || data[key] === 1 || data[key] === '1' || data[key] === true) {
                    data[key] = true;
                } else if (data[key] === 'false' || data[key] === 0 || data[key] === '0' || data[key] === false) {
                    data[key] = false;
                } else {
                    data[key] = null; // Or false, depending on desired default for invalid boolean values
                }
            }
        }

        // Critical field check
        if (!data.product_type || (data.product_type !== 'Standard' && data.product_type !== 'Variable')) {
            throw new Error("Invalid or missing product_type. Must be 'Standard' or 'Variable'.");
        }


        delete data.id; // Prevent client from setting ID on create
        delete data.created_at;
        delete data.updated_at; // Will be set by route handlers

        return data;
    };

    // --- API Route Definitions ---

    // GET /api/products - List products
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

    // GET /api/products/:id - Fetch single product
    router.get('/:id', authenticateToken, checkPermission('product:read_details'), async (req, res, next) => {
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
        const { id: userId, role_name: userRole, store_id: userStoreId } = req.user;
        const { attributes_config, variations_data, product_units_config, ...productPayload } = req.body;

        const baseRequiredFields = ['product_name', 'category_id', 'base_unit_id', 'product_type'];
        if (productPayload.product_type === 'Standard') {
            baseRequiredFields.push('retail_price', 'cost_price');
        }
        const missingBaseFields = baseRequiredFields.filter(field => productPayload[field] == null || productPayload[field] === '');
        if (missingBaseFields.length > 0) {
            return res.status(400).json({ message: `Missing required fields for product: ${missingBaseFields.join(', ')}.` });
        }

        let preparedData;
        try { 
            preparedData = prepareProductData(productPayload); 
        } catch (prepError) { 
            console.error("Error preparing product data for POST:", prepError.message); 
            return res.status(400).json({ message: prepError.message || 'Invalid data format submitted for product.' }); 
        }
        
        // Determine store_id based on user role
        if (userRole === ROLES.STORE_ADMIN || userRole === ROLES.STORE_MANAGER) {
            if (!userStoreId) {
                return res.status(403).json({ message: "Forbidden: Your account is not assigned to a specific store." });
            }
            // If store_id is provided in payload by store admin/manager, it must match their assigned store.
            // If not provided, it defaults to their assigned store.
            if (preparedData.store_id != null && preparedData.store_id !== userStoreId) {
                 console.warn(`User ${userId} (Store Admin/Manager) attempted to create product for store ${preparedData.store_id} but is assigned to ${userStoreId}. Overriding to user's store.`);
            }
            preparedData.store_id = userStoreId;
        } else if (userRole === ROLES.GLOBAL_ADMIN) {
            // Global admin can assign to any store or make it global (null store_id)
            // If store_id is not provided or is explicitly null, it's global.
            if (preparedData.store_id === undefined) { // if not in payload at all
                preparedData.store_id = null;
            }
        } else {
             // Other roles (if any granted create permission) default to global or need specific logic
            preparedData.store_id = null;
        }


        // Price validations for Standard products
        if (preparedData.product_type === 'Standard') {
            const { cost_price, retail_price, wholesale_price } = preparedData;
            if (cost_price == null || cost_price < 0) return res.status(400).json({ message: 'Cost Price must be a non-negative number.' });
            if (retail_price == null || retail_price < 0) return res.status(400).json({ message: 'Retail Price must be a non-negative number.' });
            if (retail_price < cost_price) return res.status(400).json({ message: 'Retail Price cannot be less than Cost Price.' });
            if (wholesale_price != null && (wholesale_price < 0 || wholesale_price < cost_price)) {
                return res.status(400).json({ message: 'Wholesale Price cannot be negative or less than Cost Price.' });
            }
        }

        try {
            // Validate Foreign Keys
            if (preparedData.base_unit_id == null || !(await knex('units').where({ id: preparedData.base_unit_id }).first())) {
                return res.status(400).json({ message: `Invalid or missing Base Unit ID.` });
            }
            if (preparedData.category_id == null || !(await knex('categories').where({ id: preparedData.category_id }).first())) {
                return res.status(400).json({ message: `Invalid or missing Category ID.` });
            }
            if (preparedData.store_id !== null && !(await knex('stores').where({ id: preparedData.store_id }).first())) {
                return res.status(400).json({ message: `Invalid Store ID: ${preparedData.store_id}. Store does not exist.` });
            }

            const newProductData = { ...preparedData, created_at: new Date(), updated_at: new Date() };
            let insertedProduct;

            await knex.transaction(async trx => {
                [insertedProduct] = await trx('products').insert(newProductData).returning('*');
                const newProductId = insertedProduct.id;

                // Handle Product Unit Configurations
                if (product_units_config && Array.isArray(product_units_config) && product_units_config.length > 0) {
                    for (const unitConfig of product_units_config) {
                        if (!unitConfig.unit_id || unitConfig.conversion_factor == null || unitConfig.conversion_factor <= 0) {
                            throw new Error('Invalid product unit configuration: unit_id and positive conversion_factor are required.');
                        }
                        await trx('product_units').insert({
                            product_id: newProductId,
                            unit_id: unitConfig.unit_id,
                            conversion_factor: unitConfig.conversion_factor,
                            is_purchase_unit: !!unitConfig.is_purchase_unit,
                            is_sales_unit: !!unitConfig.is_sales_unit,
                        });
                    }
                }


                // Handle Variable Product specifics (Attributes and Variations)
                if (insertedProduct.product_type === 'Variable') {
                    if (!attributes_config || !Array.isArray(attributes_config) || attributes_config.length === 0 ||
                        !variations_data || !Array.isArray(variations_data) || variations_data.length === 0) {
                        throw new Error('For Variable products, attributes configuration and variations data are required.');
                    }

                    const attributeNameIdMap = {}; // Maps 'Color' -> attribute_id
                    const attributeValueKeyIdMap = {}; // Maps 'Color-Red' -> attribute_value_id

                    // Process attributes_config to ensure attributes and their values exist
                    for (const attrConfig of attributes_config) {
                        if (!attrConfig.name || !Array.isArray(attrConfig.values) || attrConfig.values.length === 0) {
                            throw new Error(`Invalid attribute configuration for '${attrConfig.name}'. Name and non-empty values array required.`);
                        }
                        let [attributeRec] = await trx('attributes').where({ name: attrConfig.name }).select('id');
                        if (!attributeRec) {
                            [attributeRec] = await trx('attributes').insert({ name: attrConfig.name }).returning('id');
                        }
                        attributeNameIdMap[attrConfig.name] = attributeRec.id;

                        for (const val of attrConfig.values) {
                            if (val == null || String(val).trim() === '') continue; // Skip empty values
                            let [attrValueRec] = await trx('attribute_values')
                                .where({ attribute_id: attributeRec.id, value: String(val) })
                                .select('id');
                            if (!attrValueRec) {
                                [attrValueRec] = await trx('attribute_values')
                                    .insert({ attribute_id: attributeRec.id, value: String(val) })
                                    .returning('id');
                            }
                            attributeValueKeyIdMap[`${attrConfig.name}-${String(val)}`] = attrValueRec.id;
                        }
                    }
                    
                    // Process variations_data to create variations and link them to attribute values
                    for (const variation of variations_data) {
                        const { attribute_combination, ...variationDetails } = variation;
                        if (!variationDetails.sku || variationDetails.retail_price == null || variationDetails.cost_price == null) {
                             throw new Error(`Each variation must have SKU, Retail Price, and Cost Price. Problem with: ${JSON.stringify(attribute_combination)}`);
                        }
                        // Add price validation for each variation
                        if (variationDetails.cost_price < 0 || variationDetails.retail_price < 0 || variationDetails.retail_price < variationDetails.cost_price) {
                            throw new Error(`Invalid prices for variation ${variationDetails.sku}. Retail price must be >= cost price, and both non-negative.`);
                        }
                        if (variationDetails.wholesale_price != null && (variationDetails.wholesale_price < 0 || variationDetails.wholesale_price < variationDetails.cost_price)) {
                            throw new Error(`Invalid wholesale price for variation ${variationDetails.sku}.`);
                        }


                        const [insertedVariationRec] = await trx('product_variations')
                            .insert({
                                product_id: newProductId,
                                sku: variationDetails.sku,
                                cost_price: variationDetails.cost_price,
                                retail_price: variationDetails.retail_price,
                                wholesale_price: variationDetails.wholesale_price || null,
                                // stock_quantity: variationDetails.stock_quantity || 0, // If managing stock per variation
                                // image_path: variationDetails.image_path || null,       // If managing image per variation
                                is_active: variationDetails.is_active !== undefined ? !!variationDetails.is_active : true,
                                created_at: new Date(),
                                updated_at: new Date(),
                            })
                            .returning('id');
                        const newVariationId = insertedVariationRec.id;

                        if (!attribute_combination || typeof attribute_combination !== 'object' || Object.keys(attribute_combination).length === 0) {
                            throw new Error(`Variation with SKU ${variationDetails.sku} is missing attribute_combination.`);
                        }

                        for (const [attrName, attrValue] of Object.entries(attribute_combination)) {
                            const attributeValueId = attributeValueKeyIdMap[`${attrName}-${String(attrValue)}`];
                            if (!attributeValueId) {
                                throw new Error(`Could not find/create attribute value for ${attrName}: ${attrValue}. Ensure it's defined in attributes_config.`);
                            }
                            await trx('product_variation_attribute_values').insert({
                                product_variation_id: newVariationId,
                                attribute_value_id: attributeValueId,
                            });
                        }
                    }
                }
            }); // End transaction

            // Refetch the product with all its related data for the response
            const finalProduct = await knex('products').where({ id: insertedProduct.id }).first();
            const finalProductUnits = await knex('product_units')
                .join('units', 'product_units.unit_id', 'units.id')
                .select('product_units.*', 'units.name as unit_name')
                .where({ product_id: finalProduct.id });
            finalProduct.product_units = finalProductUnits;

            if (finalProduct.product_type === 'Variable') {
                const variations = await knex('product_variations')
                    .where({ product_id: finalProduct.id })
                    .select('*');
                const fetchedVariationsData = [];
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
                    fetchedVariationsData.push({ ...variation, attribute_combination: attributeCombination });
                }
                finalProduct.variations_data = fetchedVariationsData;
            }

            res.status(201).json(finalProduct);

        } catch (err) {
            // Handle specific database errors or errors thrown from transaction
            if (err.message.startsWith('For Variable products') || err.message.startsWith('Each variation must have') || err.message.startsWith('Could not find/create attribute value') || err.message.startsWith('Invalid attribute configuration') || err.message.startsWith('Invalid product unit configuration')) {
                return res.status(400).json({ message: err.message });
            }
            if (err.code === '23505') { // Unique constraint violation
                 return res.status(409).json({ message: `Conflict: A product with similar unique details (e.g., SKU) already exists.`, detail: err.detail });
            }
            if (err.code === '23503') { // Foreign key violation
                return res.status(400).json({ message: `Invalid reference ID provided (e.g., category, brand, unit does not exist).`, detail: err.detail });
            }
            console.error(`Error creating product by UserID ${userId}:`, err.message);
            console.error(err.stack);
            next(err);
        }
    });

    // PUT /api/products/:id - Update an existing product
    router.put('/:id', authenticateToken, checkPermission('product:update'), async (req, res, next) => {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;
        const { attributes_config, variations_data, product_units_config, ...productPayload } = req.body;

        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });
        if (Object.keys(req.body).length === 0) return res.status(400).json({ message: 'No update data provided.' });

        try {
            const currentProduct = await knex('products').where({ id: productId }).first();
            if (!currentProduct) {
                return res.status(404).json({ message: `Product with ID ${productId} not found.` });
            }

            // Authorization: Check if user can update this specific product
            let canUpdateThisProduct = false;
            if (userRole === ROLES.GLOBAL_ADMIN) {
                canUpdateThisProduct = true;
            } else if (userRole === ROLES.STORE_ADMIN || userRole === ROLES.STORE_MANAGER) {
                if (currentProduct.store_id === null) { // Store admin/manager can update global products
                    canUpdateThisProduct = true;
                } else { // Can update products in their associated stores
                    const accessibleStores = associated_store_ids || [];
                    if (userStoreId && !accessibleStores.includes(userStoreId)) {
                         accessibleStores.push(userStoreId);
                    }
                    if (accessibleStores.includes(currentProduct.store_id)) {
                        canUpdateThisProduct = true;
                    }
                }
            }
            if (!canUpdateThisProduct) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to update this specific product.' });
            }

            let preparedData;
            try {
                preparedData = prepareProductData(productPayload);
            } catch (prepError) {
                console.error("Error preparing product data for PUT:", prepError.message);
                return res.status(400).json({ message: prepError.message || 'Invalid data format submitted for product update.' });
            }
            
            const productUpdates = { ...preparedData, updated_at: new Date() };

            // Handle store_id changes carefully based on role
            if (productUpdates.hasOwnProperty('store_id')) {
                const newStoreId = productUpdates.store_id; // Can be an ID or null
                if (userRole === ROLES.GLOBAL_ADMIN) {
                    if (newStoreId !== null && !(await knex('stores').where({ id: newStoreId }).first())) {
                        return res.status(400).json({ message: `Invalid new Store ID: ${newStoreId}. Store does not exist.` });
                    }
                } else { // STORE_ADMIN, STORE_MANAGER
                    const accessibleStores = associated_store_ids || [];
                     if (userStoreId && !accessibleStores.includes(userStoreId)) {
                         accessibleStores.push(userStoreId);
                    }
                    // Store admin/manager can make it global (null) or assign to one of their stores
                    if (newStoreId !== null && !accessibleStores.includes(newStoreId)) {
                        return res.status(403).json({ message: 'Forbidden: You can only assign products to your associated stores or make them global.' });
                    }
                }
            } else {
                // If store_id is not in the update payload, it should not be changed.
                delete productUpdates.store_id; // Prevent accidental change if not provided
            }

            // Price validations if relevant fields are updated
            const finalProductType = productUpdates.product_type || currentProduct.product_type;
            if (finalProductType === 'Standard') {
                const finalCostPrice = productUpdates.cost_price !== undefined ? productUpdates.cost_price : currentProduct.cost_price;
                const finalRetailPrice = productUpdates.retail_price !== undefined ? productUpdates.retail_price : currentProduct.retail_price;
                const finalWholesalePrice = productUpdates.wholesale_price !== undefined ? productUpdates.wholesale_price : currentProduct.wholesale_price;

                if (finalCostPrice == null || finalCostPrice < 0) return res.status(400).json({ message: 'Cost Price must be a non-negative number.' });
                if (finalRetailPrice == null || finalRetailPrice < 0) return res.status(400).json({ message: 'Retail Price must be a non-negative number.' });
                if (finalRetailPrice < finalCostPrice) return res.status(400).json({ message: 'Retail Price cannot be less than Cost Price.' });
                if (finalWholesalePrice != null && (finalWholesalePrice < 0 || finalWholesalePrice < finalCostPrice)) {
                    return res.status(400).json({ message: 'Wholesale Price cannot be negative or less than Cost Price.' });
                }
            }
            
            // Validate FKs if they are being updated
            if (productUpdates.base_unit_id != null && !(await knex('units').where({ id: productUpdates.base_unit_id }).first())) return res.status(400).json({ message: `Invalid Base Unit ID: ${productUpdates.base_unit_id}` });
            if (productUpdates.category_id != null && !(await knex('categories').where({ id: productUpdates.category_id }).first())) return res.status(400).json({ message: `Invalid Category ID: ${productUpdates.category_id}` });
            
            let updatedProductResponse;

            await knex.transaction(async trx => {
                await trx('products').where({ id: productId }).update(productUpdates);

                // Handle Product Unit Configurations update (simple: delete all and recreate)
                if (product_units_config && Array.isArray(product_units_config)) {
                    await trx('product_units').where({ product_id: productId }).del(); // Delete existing
                    for (const unitConfig of product_units_config) { // Recreate
                        if (!unitConfig.unit_id || unitConfig.conversion_factor == null || unitConfig.conversion_factor <= 0) {
                            throw new Error('Invalid product unit configuration: unit_id and positive conversion_factor are required.');
                        }
                        await trx('product_units').insert({
                            product_id: productId,
                            unit_id: unitConfig.unit_id,
                            conversion_factor: unitConfig.conversion_factor,
                            is_purchase_unit: !!unitConfig.is_purchase_unit,
                            is_sales_unit: !!unitConfig.is_sales_unit,
                        });
                    }
                }


                // --- Variable Product Update Logic ---
                // If product type changes or if it's variable and new configs are sent,
                // this simplified logic clears old variations and recreates them.
                const newProductType = productUpdates.product_type || currentProduct.product_type;

                if ( (currentProduct.product_type === 'Variable' && newProductType === 'Standard') ||
                     (newProductType === 'Variable' && (attributes_config || variations_data)) ) {
                    
                    const oldVariationIds = await trx('product_variations').where({ product_id: productId }).pluck('id');
                    if (oldVariationIds.length > 0) {
                        await trx('product_variation_attribute_values').whereIn('product_variation_id', oldVariationIds).del();
                        await trx('product_variations').where({ product_id: productId }).del();
                    }
                }

                if (newProductType === 'Variable' && attributes_config && variations_data) {
                    // Recreate attributes and variations (logic similar to POST)
                    const attributeNameIdMap = {}; 
                    const attributeValueKeyIdMap = {}; 

                    for (const attrConfig of attributes_config) {
                         if (!attrConfig.name || !Array.isArray(attrConfig.values) || attrConfig.values.length === 0) {
                            throw new Error(`Invalid attribute configuration for '${attrConfig.name}'. Name and non-empty values array required.`);
                        }
                        let [attributeRec] = await trx('attributes').where({ name: attrConfig.name }).select('id');
                        if (!attributeRec) {
                            [attributeRec] = await trx('attributes').insert({ name: attrConfig.name }).returning('id');
                        }
                        attributeNameIdMap[attrConfig.name] = attributeRec.id;

                        for (const val of attrConfig.values) {
                            if (val == null || String(val).trim() === '') continue;
                            let [attrValueRec] = await trx('attribute_values')
                                .where({ attribute_id: attributeRec.id, value: String(val) })
                                .select('id');
                            if (!attrValueRec) {
                                [attrValueRec] = await trx('attribute_values')
                                    .insert({ attribute_id: attributeRec.id, value: String(val) })
                                    .returning('id');
                            }
                            attributeValueKeyIdMap[`${attrConfig.name}-${String(val)}`] = attrValueRec.id;
                        }
                    }
                    
                    for (const variation of variations_data) {
                        const { attribute_combination, ...variationDetails } = variation;
                         if (!variationDetails.sku || variationDetails.retail_price == null || variationDetails.cost_price == null) {
                             throw new Error(`Each variation must have SKU, Retail Price, and Cost Price. Problem with: ${JSON.stringify(attribute_combination)}`);
                        }
                        if (variationDetails.cost_price < 0 || variationDetails.retail_price < 0 || variationDetails.retail_price < variationDetails.cost_price) {
                            throw new Error(`Invalid prices for variation ${variationDetails.sku}. Retail price must be >= cost price, and both non-negative.`);
                        }
                        if (variationDetails.wholesale_price != null && (variationDetails.wholesale_price < 0 || variationDetails.wholesale_price < variationDetails.cost_price)) {
                            throw new Error(`Invalid wholesale price for variation ${variationDetails.sku}.`);
                        }

                        const [insertedVariationRec] = await trx('product_variations')
                            .insert({
                                product_id: productId,
                                sku: variationDetails.sku,
                                cost_price: variationDetails.cost_price,
                                retail_price: variationDetails.retail_price,
                                wholesale_price: variationDetails.wholesale_price || null,
                                is_active: variationDetails.is_active !== undefined ? !!variationDetails.is_active : true,
                                created_at: new Date(), // Or keep original if updating existing
                                updated_at: new Date(),
                            })
                            .returning('id');
                        const newVariationId = insertedVariationRec.id;

                        if (!attribute_combination || typeof attribute_combination !== 'object' || Object.keys(attribute_combination).length === 0) {
                            throw new Error(`Variation with SKU ${variationDetails.sku} is missing attribute_combination.`);
                        }

                        for (const [attrName, attrValue] of Object.entries(attribute_combination)) {
                            const attributeValueId = attributeValueKeyIdMap[`${attrName}-${String(attrValue)}`];
                            if (!attributeValueId) {
                                throw new Error(`Could not find/create attribute value for ${attrName}: ${attrValue}. Ensure it's defined in attributes_config.`);
                            }
                            await trx('product_variation_attribute_values').insert({
                                product_variation_id: newVariationId,
                                attribute_value_id: attributeValueId,
                            });
                        }
                    }
                }
                updatedProductResponse = await trx('products').where({ id: productId }).first();
            }); // End transaction

            // Refetch related data for the response
            const finalProductUnits = await knex('product_units')
                .join('units', 'product_units.unit_id', 'units.id')
                .select('product_units.*', 'units.name as unit_name')
                .where({ product_id: updatedProductResponse.id });
            updatedProductResponse.product_units = finalProductUnits;

            if (updatedProductResponse.product_type === 'Variable') {
                 const variations = await knex('product_variations')
                    .where({ product_id: updatedProductResponse.id })
                    .select('*');
                const fetchedVariationsData = [];
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
                    fetchedVariationsData.push({ ...variation, attribute_combination: attributeCombination });
                }
                updatedProductResponse.variations_data = fetchedVariationsData;
            }

            res.status(200).json(updatedProductResponse);

        } catch (err) {
            if (err.message.startsWith('For Variable products') || err.message.startsWith('Each variation must have') || err.message.startsWith('Could not find/create attribute value') || err.message.startsWith('Invalid attribute configuration') || err.message.startsWith('Invalid product unit configuration')) {
                return res.status(400).json({ message: err.message });
            }
            if (err.code === '23505') return res.status(409).json({ message: `Conflict: Product with similar unique details already exists.`, detail: err.detail });
            if (err.code === '23503') return res.status(400).json({ message: `Invalid reference ID.`, detail: err.detail });
            console.error(`Error updating product ${productId} by UserID ${userId}:`, err.message);
            console.error(err.stack);
            next(err);
        }
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

    return router;
}

module.exports = createProductsRouter;