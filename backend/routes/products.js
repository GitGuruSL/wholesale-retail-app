// ...existing code...
const express = require('express');
const { ROLES } = require('../utils/roles'); 
// const { authenticateToken } = require('../middleware/authMiddleware'); // Ensure this is correctly imported
// const { checkPermission } = require('../middleware/permissionsMiddleware'); // Ensure this is correctly imported

// Multer setup for file uploads - ensure you have 'multer' installed (npm install multer)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'barcodes');
        fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage: storage });


function createProductsRouter(knex, authenticateToken, checkPermission) {
    const router = require('express').Router();
    console.log('[PRODUCTS.JS] createProductsRouter called. authenticateToken is function:', typeof authenticateToken === 'function', 'checkPermission is function:', typeof checkPermission === 'function');

    // --- Enhanced Helper Function for Data Preparation ---
    const prepareProductData = (inputData, isUpdate = false) => {
        const data = { ...inputData };

        // Convert numeric fields
        const numericFields = [
            'cost_price', 'retail_price', 'wholesale_price', 'weight', 
            'discount_value', 'max_sales_qty_per_person', 'expiry_notification_days'
        ];
        numericFields.forEach(field => {
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                const num = parseFloat(data[field]);
                data[field] = isNaN(num) ? null : num;
            } else if (data[field] === '') {
                data[field] = null;
            } else if (data[field] === undefined && !isUpdate && 
                       (field === 'cost_price' || field === 'retail_price' || field === 'wholesale_price')) {
                data[field] = 0; // Default prices to 0 for new products if not provided
            }
        });

        // Convert integer fields (FKs, counts, etc.)
        const integerFields = [
            'category_id', 'sub_category_id', 'special_category_id', 'brand_id', 
            'base_unit_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 
            'manufacturer_id', 'warranty_id', 'supplier_id', 'store_id'
            // expiry_notification_days & max_sales_qty_per_person are handled by numericFields conversion
        ];
        integerFields.forEach(field => {
            if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
                const intVal = parseInt(data[field], 10);
                data[field] = isNaN(intVal) ? null : intVal;
            } else if (data[field] === '') {
                data[field] = null;
            }
        });

        // Convert boolean fields (FormData sends '1'/'0' or 'true'/'false' as strings)
        const booleanFields = ['has_expiry', 'is_serialized'];
        booleanFields.forEach(field => {
            if (data[field] !== undefined && data[field] !== null) {
                if (typeof data[field] === 'string') {
                    data[field] = data[field].toLowerCase() === 'true' || data[field] === '1';
                } else {
                    data[field] = Boolean(data[field]);
                }
            } else if (!isUpdate) { // Default for new products if not present
                data[field] = false;
            }
        });
        
        // Handle specific defaults for new products if not present
        if (!isUpdate) {
            if (data.product_type === undefined) data.product_type = 'Standard';
            if (data.inventory_type === undefined) data.inventory_type = 'Inventory';
            if (data.selling_type === undefined) data.selling_type = 'Wholesale'; // Or your preferred default
        }

        // Nullify empty strings for optional text fields
        const textFieldsToNullifyIfEmpty = ['slug', 'sku', 'item_barcode', 'description', 'measurement_type', 'measurement_value'];
        textFieldsToNullifyIfEmpty.forEach(key => {
            if (data[key] === '') {
                data[key] = null;
            }
        });
        
        // Remove fields that are explicitly undefined (unless handled by defaults above)
        // and ensure 'id' is not part of insert/update payload directly unless intended
        Object.keys(data).forEach(key => {
            if (data[key] === undefined) {
                delete data[key];
            }
        });
        
        data.updated_at = new Date();
        if (!isUpdate && !data.id) {
            data.created_at = new Date();
        }
        
        // Clean out fields that should not be directly inserted/updated in the main products table
        // if they are handled separately (like complex JSON objects before parsing)
        delete data.attributes_config_json;
        delete data.variations_data_json;
        delete data.product_units_config_json;
        delete data.barcode_image; // This is handled by req.file
        delete data.remove_barcode_image;


        return data;
    };

    // Helper to process product units
    const processProductUnits = async (trx, productId, productUnitsConfigData, baseUnitId) => {
        if (!productUnitsConfigData || !Array.isArray(productUnitsConfigData)) {
            return;
        }
        await trx('product_units').where({ product_id: productId }).del(); // Replace existing
        if (productUnitsConfigData.length === 0) return;

        const unitsToInsert = productUnitsConfigData.map(unitConfig => ({
            product_id: productId,
            unit_id: parseInt(unitConfig.unit_id, 10),
            base_unit_id: parseInt(baseUnitId, 10),
            conversion_factor: parseFloat(unitConfig.conversion_factor),
            is_purchase_unit: Boolean(unitConfig.is_purchase_unit),
            is_sales_unit: Boolean(unitConfig.is_sales_unit),
        })).filter(u => !isNaN(u.unit_id) && !isNaN(u.conversion_factor) && !isNaN(u.base_unit_id));

        if (unitsToInsert.length > 0) {
            await trx('product_units').insert(unitsToInsert);
        }
    };

    // Helper to process attributes and variations
    const processAttributesAndVariations = async (trx, productId, variationsDataFromRequest) => {
        if (!variationsDataFromRequest || !Array.isArray(variationsDataFromRequest)) {
            return;
        }
        // Clear existing variation-related data
        await trx('product_variation_attribute_values')
            .whereIn('product_variation_id', function() { this.select('id').from('product_variations').where('product_id', productId); })
            .del();
        await trx('product_variations').where({ product_id: productId }).del();

        if (variationsDataFromRequest.length === 0) return;

        for (const variationItem of variationsDataFromRequest) {
            const { attribute_combination, ...variationPayload } = variationItem;
            const variationDbData = {
                product_id: productId,
                sku: variationPayload.sku || null,
                cost_price: parseFloat(variationPayload.cost_price) || 0,
                retail_price: parseFloat(variationPayload.retail_price) || 0,
                wholesale_price: parseFloat(variationPayload.wholesale_price) || 0,
                // is_active: variationPayload.is_active !== undefined ? Boolean(variationPayload.is_active) : true,
                // Add other variation-specific fields from your DB schema if needed
            };
            const [newVariation] = await trx('product_variations').insert(variationDbData).returning('id');
            const newVariationId = newVariation.id;

            if (newVariationId && attribute_combination && typeof attribute_combination === 'object') {
                for (const attributeName in attribute_combination) {
                    const attributeValueName = attribute_combination[attributeName];
                    const attribute = await trx('attributes').whereRaw('LOWER(name) = LOWER(?)', [String(attributeName).trim()]).first();
                    if (!attribute) continue;
                    const attributeValue = await trx('attribute_values')
                        .where({ attribute_id: attribute.id })
                        .andWhereRaw('LOWER(value) = LOWER(?)', [String(attributeValueName).trim()])
                        .first();
                    if (!attributeValue) continue;
                    await trx('product_variation_attribute_values').insert({
                        product_variation_id: newVariationId,
                        attribute_value_id: attributeValue.id,
                    });
                }
            }
        }
    };

    // GET /api/products - List products (KEEP AS IS from your provided code)
    router.get('/', authenticateToken, checkPermission('product:read'), async (req, res) => {
        // ... your existing GET / logic ...
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
            include,
            supplier_id // Added from form
        } = req.query;

        // Validate sortBy parameter against a list of allowed columns
        const allowedSortColumns = [
            'id', 'product_name', 'name', 'slug', 'sku', 'retail_price', 'cost_price',
            'wholesale_price', 'product_type', 'created_at', 'updated_at',
            'category_name', 'brand_name', 'store_name', 'supplier_name' // For joined fields
        ];
        // Ensure safeSortBy references actual DB columns, qualify with table name if needed
        let safeSortByDbColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'product_name';
        if (['category_name', 'brand_name', 'store_name', 'supplier_name'].includes(safeSortByDbColumn)) {
            // Map alias to actual joined column for orderBy
            if (safeSortByDbColumn === 'category_name') safeSortByDbColumn = 'categories.name';
            if (safeSortByDbColumn === 'brand_name') safeSortByDbColumn = 'brands.name';
            if (safeSortByDbColumn === 'store_name') safeSortByDbColumn = 'stores.name';
            if (safeSortByDbColumn === 'supplier_name') safeSortByDbColumn = 'suppliers.name';
        } else {
            safeSortByDbColumn = `products.${safeSortByDbColumn}`;
        }

        const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'asc';

        try {
            let query = knex('products');
            const selectFields = ['products.*']; // Start with all product fields

            const includesArray = include ? include.split(',') : [];

            if (includesArray.includes('category') || categoryId || sortBy === 'category_name') {
                query.leftJoin('categories', 'products.category_id', 'categories.id');
                selectFields.push('categories.name as category_name');
            }
            if (includesArray.includes('subCategory') || subCategoryId) {
                query.leftJoin('sub_categories', 'products.sub_category_id', 'sub_categories.id');
                selectFields.push('sub_categories.name as sub_category_name');
            }
            if (includesArray.includes('brand') || brandId || sortBy === 'brand_name') {
                query.leftJoin('brands', 'products.brand_id', 'brands.id');
                selectFields.push('brands.name as brand_name');
            }
            if (includesArray.includes('baseUnit')) {
                query.leftJoin('units as base_units', 'products.base_unit_id', 'base_units.id');
                selectFields.push('base_units.name as base_unit_name'); // Removed base_units.short_name
            }
            if (includesArray.includes('store') || storeId || sortBy === 'store_name') {
                query.leftJoin('stores', 'products.store_id', 'stores.id');
                selectFields.push('stores.name as store_name');
            }
            if (includesArray.includes('supplier') || supplier_id || sortBy === 'supplier_name') {
                query.leftJoin('suppliers', 'products.supplier_id', 'suppliers.id');
                selectFields.push('suppliers.name as supplier_name');
            }
            // Add other joins for tax, manufacturer etc. if needed for display or sorting

            query.select(selectFields);
             // Add distinct if joins cause duplicates, though groupBy products.id is better
            query.groupBy('products.id'); // Group by product ID to avoid duplicates from joins
            if (selectFields.includes('categories.name as category_name')) query.groupBy('categories.name');
            if (selectFields.includes('sub_categories.name as sub_category_name')) query.groupBy('sub_categories.name');
            if (selectFields.includes('brands.name as brand_name')) query.groupBy('brands.name');
            if (selectFields.includes('base_units.name as base_unit_name')) query.groupBy('base_units.name');
            // Removed groupBy for base_units.short_name
            if (selectFields.includes('stores.name as store_name')) query.groupBy('stores.name');
            if (selectFields.includes('suppliers.name as supplier_name')) query.groupBy('suppliers.name');


            // Apply filters
            if (searchTerm) {
                query.where(function() {
                    this.where('products.product_name', 'ilike', `%${searchTerm}%`)
                        .orWhere('products.sku', 'ilike', `%${searchTerm}%`)
                        .orWhere('products.description', 'ilike', `%${searchTerm}%`);
                });
            }
            if (categoryId) query.where('products.category_id', parseInt(categoryId,10));
            if (subCategoryId) query.where('products.sub_category_id', parseInt(subCategoryId,10));
            if (brandId) query.where('products.brand_id', parseInt(brandId,10));
            if (storeId) query.where('products.store_id', parseInt(storeId,10));
            else if (storeId === 'null') query.whereNull('products.store_id');
            if (productType) query.where('products.product_type', productType);
            if (inventoryType) query.where('products.inventory_type', inventoryType);
            if (sellingType) query.where('products.selling_type', sellingType);
            if (supplier_id) query.where('products.supplier_id', parseInt(supplier_id,10));


            // Count total products for pagination (apply filters to count as well)
            // Clone the query for counting before applying order and pagination
            const countQueryBuilder = knex('products'); // New builder for count
            if (categoryId) countQueryBuilder.leftJoin('categories', 'products.category_id', 'categories.id');
            if (subCategoryId) countQueryBuilder.leftJoin('sub_categories', 'products.sub_category_id', 'sub_categories.id');
            if (brandId) countQueryBuilder.leftJoin('brands', 'products.brand_id', 'brands.id');
            if (storeId) countQueryBuilder.leftJoin('stores', 'products.store_id', 'stores.id');
            if (supplier_id) countQueryBuilder.leftJoin('suppliers', 'products.supplier_id', 'suppliers.id');
            // Re-apply filters to countQueryBuilder
            if (searchTerm) { countQueryBuilder.where(function() { this.where('products.product_name', 'ilike', `%${searchTerm}%`).orWhere('products.sku', 'ilike', `%${searchTerm}%`).orWhere('products.description', 'ilike', `%${searchTerm}%`); });}
            if (categoryId) countQueryBuilder.where('products.category_id', parseInt(categoryId,10));
            if (subCategoryId) countQueryBuilder.where('products.sub_category_id', parseInt(subCategoryId,10));
            if (brandId) countQueryBuilder.where('products.brand_id', parseInt(brandId,10));
            if (storeId) countQueryBuilder.where('products.store_id', parseInt(storeId,10)); else if (storeId === 'null') countQueryBuilder.whereNull('products.store_id');
            if (productType) countQueryBuilder.where('products.product_type', productType);
            if (inventoryType) countQueryBuilder.where('products.inventory_type', inventoryType);
            if (sellingType) countQueryBuilder.where('products.selling_type', sellingType);
            if (supplier_id) countQueryBuilder.where('products.supplier_id', parseInt(supplier_id,10));

            const totalResult = await countQueryBuilder.countDistinct('products.id as total').first();
            const totalProducts = parseInt(totalResult.total, 10);
            const totalPages = Math.ceil(totalProducts / limit);

            // Apply pagination and sorting to the main query
            const offset = (page - 1) * limit;
            query.orderBy(safeSortByDbColumn, safeSortOrder) // Use the DB column name for sorting
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

    // GET /api/products/:id - Fetch single product (KEEP AS IS from your provided code)
    router.get('/:id', authenticateToken, checkPermission('product:read'), async (req, res, next) => {
        // ... your existing GET /:id logic ...
        // (Ensure it fetches all necessary related data like product_units, variations, attributes_config)
        const { id } = req.params;
        const productId = parseInt(id, 10);
        const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;
        const { include } = req.query; // e.g. "variations,attributes,product_units,category,brand,supplier,tax"

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

            let responseData = { ...product };
            const includesArray = include ? include.split(',') : [];

            if (includesArray.includes('product_units')) {
                const productUnits = await knex('product_units')
                    .join('units', 'product_units.unit_id', 'units.id')
                    .select(
                        'product_units.id', 'product_units.unit_id', 'units.name as unit_name', // Removed units.short_name
                        'product_units.conversion_factor', 'product_units.is_purchase_unit',
                        'product_units.is_sales_unit'
                    )
                    .where('product_units.product_id', productId)
                    .orderBy('units.name');
                responseData.product_units_config = productUnits; // Match frontend expected key
            }
            
            // Fetch other relations if requested
            if (includesArray.includes('category') && product.category_id) {
                responseData.category = await knex('categories').where({id: product.category_id}).first();
            }
            // ... (add similar fetches for subCategory, brand, supplier, tax, etc. as needed) ...


            if (product.product_type === 'Variable') {
                if (includesArray.includes('variations')) {
                    const variations = await knex('product_variations')
                        .where({ product_id: productId })
                        .select('*'); 
                    const variationsData = [];
                    for (const variation of variations) {
                        const attributeDetails = await knex('product_variation_attribute_values as pvav')
                            .join('attribute_values as av', 'pvav.attribute_value_id', 'av.id')
                            .join('attributes as a', 'av.attribute_id', 'a.id')
                            .where('pvav.product_variation_id', variation.id)
                            .select('a.name as attribute_name', 'av.value as attribute_value');
                        const attributeCombination = attributeDetails.reduce((acc, ad) => {
                            acc[ad.attribute_name] = ad.attribute_value; return acc;
                        }, {});
                        variationsData.push({ ...variation, attribute_combination });
                    }
                    responseData.variations_data = variationsData;
                }

                if (includesArray.includes('attributes')) {
                    const distinctAttributes = await knex('product_variations as pv')
                        .join('product_variation_attribute_values as pvav', 'pv.id', 'pvav.product_variation_id')
                        .join('attribute_values as av', 'pvav.attribute_value_id', 'av.id')
                        .join('attributes as a', 'av.attribute_id', 'a.id')
                        .where('pv.product_id', productId)
                        .distinct('a.id as attribute_id', 'a.name as attribute_name').select();
                    const attributesConfig = [];
                    for (const attr of distinctAttributes) {
                        const values = await knex('attribute_values as av')
                            .distinct('av.value')
                            .join('product_variation_attribute_values as pvav', 'av.id', 'pvav.attribute_value_id')
                            .join('product_variations as pv', 'pvav.product_variation_id', 'pv.id')
                            .where('av.attribute_id', attr.attribute_id).andWhere('pv.product_id', productId)
                            .pluck('value');
                        attributesConfig.push({ attribute_id: attr.attribute_id, name: attr.attribute_name, values: values.sort() });
                    }
                    responseData.attributes_config = attributesConfig;
                }
            }
            
            res.status(200).json(responseData);
        } catch (err) {
            console.error(`Error fetching product ${productId}:`, err.message);
            console.error(err.stack);
            next(err);
        }
    });

    // POST /api/products - Create a new product
    router.post('/', authenticateToken, checkPermission('product:create'), upload.single('barcode_image'), async (req, res, next) => {
        console.log(`[PRODUCTS.JS - POST /] User: ${req.user?.id}, Role: ${req.user?.role_name}`);
        // console.log('[PRODUCTS.JS - POST /] Raw Body:', JSON.stringify(req.body, null, 2));
        // console.log('[PRODUCTS.JS - POST /] File:', req.file);
        
        try {
            const rawPayload = { ...req.body };
            
            // Parse JSON string fields from FormData
            const attributes_config_json = rawPayload.attributes_config;
            const variations_data_json = rawPayload.variations_data;
            const product_units_config_json = rawPayload.product_units_config;

            // These are now part of rawPayload and will be deleted by prepareProductData if they were named with _json suffix
            // Or, delete them explicitly if they are named exactly as the target field and are strings
            delete rawPayload.attributes_config; // remove string version
            delete rawPayload.variations_data;   // remove string version
            delete rawPayload.product_units_config; // remove string version

            let mainProductData = prepareProductData(rawPayload, false);

            // Parse actual JSON data
            const attributes_config = attributes_config_json ? JSON.parse(attributes_config_json) : null;
            const variations_data = variations_data_json ? JSON.parse(variations_data_json) : null;
            const product_units_config = product_units_config_json ? JSON.parse(product_units_config_json) : null;

            // Validations
            if (!mainProductData.product_name || !mainProductData.category_id || !mainProductData.base_unit_id || !mainProductData.product_type) {
                return res.status(400).json({ message: 'Missing required fields (name, category, base unit, product type).' });
            }
            if (mainProductData.product_type === 'Variable' && (!variations_data || variations_data.length === 0)) {
                // Allow creating variable product without variations initially, or enforce:
                // return res.status(400).json({ message: "Variable products must have variations data." });
            }
            if (mainProductData.product_type === 'Standard' && (variations_data && variations_data.length > 0)) {
                 return res.status(400).json({ message: "Standard products cannot have variations data." });
            }


            // Store ID assignment
            if (req.user.role_name === ROLES.STORE_ADMIN || req.user.role_name === ROLES.STORE_MANAGER) {
                if (req.user.current_store_id) {
                    mainProductData.store_id = req.user.current_store_id;
                } else if (!mainProductData.store_id) { // If not in payload either
                    return res.status(400).json({ message: 'Store information missing for product creation by your role.' });
                }
            } else if (req.user.role_name !== ROLES.GLOBAL_ADMIN && !mainProductData.store_id) {
                // If not global admin and no store_id, it becomes a global product (store_id = null)
                // Add specific business rule here if non-global admins cannot create global products
            }

            if (req.file && req.file.path) {
                mainProductData.barcode_image_path = req.file.path.replace(/\\/g, '/').replace(/^.*public\//, ''); // Relative path from public
            }

            await knex.transaction(async trx => {
                const [newProduct] = await trx('products').insert(mainProductData).returning('*');
                const newProductId = newProduct.id;

                if (product_units_config && newProduct.base_unit_id) {
                    await processProductUnits(trx, newProductId, product_units_config, newProduct.base_unit_id);
                }

                if (newProduct.product_type === 'Variable' && variations_data) {
                    await processAttributesAndVariations(trx, newProductId, variations_data);
                }
                
                // Refetch to include any joined data or defaults from DB for the response
                const productForResponse = await trx('products').where({id: newProductId}).first();

                res.status(201).json({ 
                    message: 'Product created successfully', 
                    product: productForResponse 
                });
            });

        } catch (error) {
            console.error('[PRODUCTS.JS - POST /] Error creating product:', error.message, error.stack);
            if (error instanceof SyntaxError && error.message.includes("JSON.parse")) {
                 return res.status(400).json({ message: `Invalid JSON format in request: ${error.message}` });
            }
            if (error.code === '23505') { 
                return res.status(409).json({ message: 'Conflict: SKU or other unique identifier already exists.', detail: error.detail });
            }
            if (error.code === '23503') { 
                 return res.status(400).json({ message: 'Invalid data: A specified reference (e.g., category, brand, unit) does not exist.', detail: error.detail });
            }
            next(error); 
        }
    });

    // PUT /api/products/:id - Update an existing product
    router.put('/:id', authenticateToken, checkPermission('product:update'), upload.single('barcode_image'), async (req, res, next) => {
        const { id } = req.params;
        const productId = parseInt(id, 10);
        // console.log(`[PRODUCTS.JS - PUT /${id}] User: ${req.user?.id}, Role: ${req.user?.role_name}`);
        // console.log('[PRODUCTS.JS - PUT /] Raw Body:', JSON.stringify(req.body, null, 2));
        // console.log('[PRODUCTS.JS - PUT /] File:', req.file);

        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });

        try {
            const existingProduct = await knex('products').where({ id: productId }).first();
            if (!existingProduct) {
                return res.status(404).json({ message: `Product with ID ${productId} not found.` });
            }

            // Authorization check (simplified, adapt to your needs)
            if (req.user.role_name !== ROLES.GLOBAL_ADMIN && existingProduct.store_id && existingProduct.store_id !== req.user.current_store_id) {
                 // Add more sophisticated check for associated_store_ids if a user can manage multiple stores
                const accessibleStores = req.user.associated_store_ids || [];
                if (req.user.current_store_id && !accessibleStores.includes(req.user.current_store_id)) {
                    accessibleStores.push(req.user.current_store_id);
                }
                if (!accessibleStores.includes(existingProduct.store_id)) {
                    return res.status(403).json({ message: 'Forbidden: You do not have access to update this product.' });
                }
            }
            
            const rawPayload = { ...req.body };
            const shouldRemoveBarcodeImage = rawPayload.remove_barcode_image === '1';

            const attributes_config_json = rawPayload.attributes_config;
            const variations_data_json = rawPayload.variations_data;
            const product_units_config_json = rawPayload.product_units_config;
            
            delete rawPayload.attributes_config;
            delete rawPayload.variations_data;
            delete rawPayload.product_units_config;

            // Merge with existing product data before preparing
            let mainProductData = prepareProductData({ ...existingProduct, ...rawPayload }, true);
            
            const attributes_config = attributes_config_json ? JSON.parse(attributes_config_json) : null;
            const variations_data = variations_data_json ? JSON.parse(variations_data_json) : null;
            const product_units_config = product_units_config_json ? JSON.parse(product_units_config_json) : null;

            if (req.file && req.file.path) {
                mainProductData.barcode_image_path = req.file.path.replace(/\\/g, '/').replace(/^.*public\//, ''); // Relative path
                // Optionally delete old image if it exists and is different
            } else if (shouldRemoveBarcodeImage) {
                // Optionally delete old image file from disk
                // if (existingProduct.barcode_image_path) { try { fs.unlinkSync(path.join(__dirname, '..', 'public', existingProduct.barcode_image_path)); } catch(e){ console.warn("Failed to delete old barcode image", e);}}
                mainProductData.barcode_image_path = null;
            }
            // If no new file and no removal flag, barcode_image_path remains as it was (from spread of existingProduct)

            // Product type change handling
            if (mainProductData.product_type && existingProduct.product_type !== mainProductData.product_type) {
                if (mainProductData.product_type === 'Variable' && (!variations_data || variations_data.length === 0)) {
                    // Potentially disallow or require variations
                }
            }
            
            // Remove fields that should not be updated or are managed by DB
            delete mainProductData.id; 
            delete mainProductData.created_at;


            await knex.transaction(async trx => {
                const [updatedProduct] = await trx('products')
                    .where({ id: productId })
                    .update(mainProductData)
                    .returning('*');

                if (!updatedProduct) {
                    throw new Error('Product update failed or product not found after update.');
                }

                if (product_units_config && updatedProduct.base_unit_id) {
                    await processProductUnits(trx, productId, product_units_config, updatedProduct.base_unit_id);
                }

                if (updatedProduct.product_type === 'Variable') {
                    if (variations_data) { // Only process if variations_data is provided
                        await processAttributesAndVariations(trx, productId, variations_data);
                    }
                } else if (existingProduct.product_type === 'Variable' && updatedProduct.product_type === 'Standard') {
                    // If changed from Variable to Standard, delete old variations
                    await trx('product_variation_attribute_values')
                        .whereIn('product_variation_id', function() { this.select('id').from('product_variations').where('product_id', productId); })
                        .del();
                    await trx('product_variations').where({ product_id: productId }).del();
                }
                
                const productForResponse = await trx('products').where({id: productId}).first(); // Refetch for consistency

                res.status(200).json({ 
                    message: 'Product updated successfully', 
                    product: productForResponse 
                });
            });

        } catch (error) {
            console.error(`[PRODUCTS.JS - PUT /${id}] Error updating product:`, error.message, error.stack);
            if (error instanceof SyntaxError && error.message.includes("JSON.parse")) {
                 return res.status(400).json({ message: `Invalid JSON format in request: ${error.message}` });
            }
            if (error.code === '23505') { 
                return res.status(409).json({ message: 'Conflict: SKU or other unique identifier already exists.', detail: error.detail });
            }
            if (error.code === '23503') { 
                 return res.status(400).json({ message: 'Invalid data: A specified reference (e.g., category, brand, unit) does not exist.', detail: error.detail });
            }
            next(error);
        }
    });
    
    // DELETE /api/products/:id - Delete a product
    router.delete('/:id', authenticateToken, checkPermission('product:delete'), async (req, res, next) => {
        // ... (your existing DELETE logic, ensure it also cleans up barcode image file if it exists) ...
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
            // Add STORE_MANAGER if they have delete permissions for their store's products
            else if (userRole === ROLES.STORE_MANAGER && product.store_id === userStoreId) {
                 canDeleteThisProduct = true;
            }


            if (!canDeleteThisProduct) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this specific product.' });
            }
            
            // Check for dependencies before deleting (e.g., in sales orders, purchase orders)
            const saleItemCount = await knex('sale_items').where({ product_id: productId }).count('id as count').first();
            if (saleItemCount && parseInt(saleItemCount.count, 10) > 0) {
                return res.status(409).json({ message: 'Conflict: Product cannot be deleted as it is part of existing sales records. Consider deactivating it instead.' });
            }
            const poItemCount = await knex('purchase_order_items').where({ product_id: productId }).count('id as count').first();
            if (poItemCount && parseInt(poItemCount.count, 10) > 0) {
                return res.status(409).json({ message: 'Conflict: Product cannot be deleted as it is part of existing purchase orders. Consider deactivating it instead.' });
            }


            await knex.transaction(async trx => {
                // Manually delete related data if ON DELETE CASCADE is not fully reliable or set
                await trx('product_variation_attribute_values')
                    .whereIn('product_variation_id', function() { this.select('id').from('product_variations').where('product_id', productId); })
                    .del();
                await trx('product_variations').where({ product_id: productId }).del();
                await trx('product_units').where({ product_id: productId }).del();
                // await trx('product_images').where({ product_id: productId }).del(); // If you have a separate product_images table

                const deletedCount = await trx('products').where({ id: productId }).del();

                if (deletedCount > 0) {
                    // Delete barcode image file from filesystem
                    if (product.barcode_image_path) {
                        const imagePath = path.join(__dirname, '..', 'public', product.barcode_image_path);
                        try {
                            if (fs.existsSync(imagePath)) {
                                fs.unlinkSync(imagePath);
                                console.log(`[PRODUCTS.JS - DELETE /${id}] Deleted barcode image: ${imagePath}`);
                            }
                        } catch (e) {
                            console.warn(`[PRODUCTS.JS - DELETE /${id}] Failed to delete barcode image ${imagePath}:`, e);
                        }
                    }
                    res.status(200).json({ message: `Product ${productId} and its related data deleted successfully.` });
                } else {
                    res.status(404).json({ message: `Product ${productId} not found or already deleted.` });
                }
            });
        } catch (err) {
            if (err.code === '23503') { 
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

    console.log('[PRODUCTS.JS] Product router instance configured.');
    return router;
}

module.exports = createProductsRouter;
// ...existing code...