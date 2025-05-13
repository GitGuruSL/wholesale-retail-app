const knex = require('../db/knex'); // Adjust path if your knex instance is elsewhere
const { ROLES } = require('../utils/roles'); // Assuming you have this utility

// --- Helper Function for Data Preparation (can be moved to a utility file) ---
const prepareProductData = (inputData) => {
    const data = { ...inputData };
    // Add your existing data preparation logic here.
    // For example, converting empty strings to null, parsing numbers, etc.
    // This is a simplified placeholder.
    const fieldsToNullifyIfEmpty = [
        'slug', 'sku', 'sub_category_id', 'special_category_id', 'brand_id',
        'barcode_symbology_id', 'item_barcode', 'description', 'tax_id',
        'discount_type_id', 'discount_value', 'measurement_type', 'measurement_value',
        'weight', 'manufacturer_id', 'warranty_id', 'expiry_notification_days',
        'supplier_id', 'store_id', 'max_sales_qty_per_person'
    ];

    const numericFields = ['cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight'];
    const integerFields = ['expiry_notification_days', 'max_sales_qty_per_person']; // Add other integer fields
    const booleanFields = ['has_expiry', 'is_serialized'];

    for (const key in data) {
        if (typeof data[key] === 'string') {
            data[key] = data[key].trim();
        }
        if (fieldsToNullifyIfEmpty.includes(key) && data[key] === '') {
            data[key] = null;
        }
        if (numericFields.includes(key) && data[key] !== null && data[key] !== '') {
            const parsed = parseFloat(data[key]);
            data[key] = isNaN(parsed) ? null : parsed;
        } else if (numericFields.includes(key) && (data[key] === '' || data[key] === null)) {
            data[key] = null;
        }
        if (integerFields.includes(key) && data[key] !== null && data[key] !== '') {
            const parsed = parseInt(data[key], 10);
            data[key] = isNaN(parsed) ? null : parsed;
        } else if (integerFields.includes(key) && (data[key] === '' || data[key] === null)) {
            data[key] = null;
        }
        if (booleanFields.includes(key)) {
            data[key] = Boolean(data[key]);
        }
    }
    // Ensure foreign keys are integers or null
    const fkFields = ['category_id', 'sub_category_id', 'special_category_id', 'brand_id', 'base_unit_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id'];
    fkFields.forEach(fk => {
        if (data[fk] !== null && data[fk] !== undefined && data[fk] !== '') {
            const parsedInt = parseInt(data[fk], 10);
            data[fk] = isNaN(parsedInt) ? null : parsedInt;
        } else if (data[fk] === '') {
            data[fk] = null;
        }
    });

    return data;
};


// GET /api/products - List products
const getProducts = async (req, res, next) => {
    console.log(`[ProductCtrl] GET / - User: ${req.user ? req.user.username : 'Guest'}, Store ID from query: ${req.query.storeId}`);
    const {
        page = 1,
        limit = 10, // Default to 10 for list view, frontend can override
        sortBy = 'products.created_at', // Default sort
        sortOrder = 'desc',
        searchTerm,
        categoryId,
        subCategoryId,
        brandId,
        storeId, // storeId from query for filtering product list
        productType,
        // inventoryType, // Add if used
        // sellingType, // Add if used
        include // e.g., 'category,subCategory,store,brand,baseUnit'
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Define allowed sort columns to prevent SQL injection
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
        'brand_name': 'brands.name', // Joined field
        'store_name': 'stores.name' // Joined field
    };
    const safeSortBy = allowedSortColumns[sortBy] || allowedSortColumns['created_at'];
    const safeSortOrder = ['asc', 'desc'].includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    try {
        let query = knex('products');

        // Select base product fields
        query = query.select(
            'products.*',
            'categories.name as category_name',
            'sub_categories.name as sub_category_name',
            'brands.name as brand_name',
            'units.name as base_unit_name',
            'stores.name as store_name'
        );

        // Joins
        query = query.leftJoin('categories', 'products.category_id', 'categories.id')
                     .leftJoin('sub_categories', 'products.sub_category_id', 'sub_categories.id')
                     .leftJoin('brands', 'products.brand_id', 'brands.id')
                     .leftJoin('units', 'products.base_unit_id', 'units.id')
                     .leftJoin('stores', 'products.store_id', 'stores.id');

        // Apply filters
        if (searchTerm) {
            query = query.where(function() {
                this.where('products.product_name', 'ilike', `%${searchTerm}%`)
                    .orWhere('products.sku', 'ilike', `%${searchTerm}%`)
                    .orWhere('products.description', 'ilike', `%${searchTerm}%`);
            });
        }
        if (categoryId) query = query.where('products.category_id', parseInt(categoryId, 10));
        if (subCategoryId) query = query.where('products.sub_category_id', parseInt(subCategoryId, 10));
        if (brandId) query = query.where('products.brand_id', parseInt(brandId, 10));
        if (productType) query = query.where('products.product_type', productType);
        
        // Store filtering based on user role and query param
        if (req.user.role_name !== ROLES.GLOBAL_ADMIN) {
            const userAccessibleStores = req.user.associated_store_ids || [];
            if (req.user.store_id && !userAccessibleStores.includes(req.user.store_id)) {
                userAccessibleStores.push(req.user.store_id);
            }
            // If a specific storeId is requested by a non-global admin, ensure they have access to it
            if (storeId && userAccessibleStores.includes(parseInt(storeId, 10))) {
                 query = query.where('products.store_id', parseInt(storeId, 10));
            } else if (storeId && !userAccessibleStores.includes(parseInt(storeId, 10))) {
                // Non-global admin trying to access a store they are not allowed to
                return res.status(403).json({ message: "Forbidden: You do not have access to this store's products." });
            } else {
                // Non-global admin, no specific storeId requested, show products from their accessible stores + global products
                query = query.where(function() {
                    this.whereIn('products.store_id', userAccessibleStores)
                        .orWhereNull('products.store_id');
                });
            }
        } else { // Global Admin
            if (storeId) { // Global admin can filter by any store
                query = query.where('products.store_id', parseInt(storeId, 10));
            }
            // If no storeId, global admin sees all products (global and store-specific)
        }


        // Count total records for pagination BEFORE applying limit and offset
        const countQuery = query.clone().clearSelect().clearOrder().countDistinct('products.id as total').first();
        const totalResult = await countQuery;
        const totalProducts = parseInt(totalResult.total, 10);

        // Apply sorting and pagination
        query = query.orderBy(safeSortBy, safeSortOrder)
                     .groupBy('products.id', 'categories.name', 'sub_categories.name', 'brands.name', 'units.name', 'stores.name') // Ensure GROUP BY for distinct products when joining
                     .limit(limitNum)
                     .offset((pageNum - 1) * limitNum);

        const productsData = await query;

        res.status(200).json({
            success: true,
            products: productsData, // Key name expected by ProductList.jsx
            currentPage: pageNum,
            totalPages: Math.ceil(totalProducts / limitNum),
            totalProducts: totalProducts, // Total items matching query
            limit: limitNum
        });
    } catch (error) {
        console.error('[ProductCtrl] Error fetching products:', error.message, error.stack);
        next(error);
    }
};

// GET /api/products/:id - Fetch single product
const getProductById = async (req, res, next) => {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;
    const { include } = req.query; // e.g. "variations,attributes,product_units"

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
                    'product_units.id', 'product_units.unit_id', 'units.name as unit_name',
                    'product_units.conversion_factor', 'product_units.is_purchase_unit',
                    'product_units.is_sales_unit'
                )
                .where('product_units.product_id', productId)
                .orderBy('units.name');
            responseData.product_units = productUnits;
        }

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
                        acc[ad.attribute_name] = ad.attribute_value;
                        return acc;
                    }, {});
                    variationsData.push({ ...variation, attribute_combination: attributeCombination });
                }
                responseData.variations_data = variationsData;
            }

            if (includesArray.includes('attributes')) {
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
                    attributesConfig.push({ attribute_id: attr.attribute_id, name: attr.attribute_name, values: values.sort() });
                }
                responseData.attributes_config = attributesConfig;
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
    // console.log('[ProductCtrl POST /] Body:', JSON.stringify(req.body, null, 2)); // req.body is FormData
    // console.log('[ProductCtrl POST /] Files:', req.file || req.files); // If using multer for single/multiple files

    try {
        // For FormData, fields are strings. Parse them.
        const rawPayload = req.body;
        const productPayload = {};
        const booleanFields = ['has_expiry', 'is_serialized'];
        const jsonFields = ['attributes_config', 'variations_data', 'product_units_config'];

        for (const key in rawPayload) {
            if (booleanFields.includes(key)) {
                productPayload[key] = rawPayload[key] === 'true' || rawPayload[key] === '1';
            } else if (jsonFields.includes(key)) {
                try {
                    productPayload[key] = JSON.parse(rawPayload[key]);
                } catch (e) {
                    console.error(`[ProductCtrl POST /] Error parsing JSON field ${key}:`, rawPayload[key], e);
                    return res.status(400).json({ message: `Invalid JSON format for ${key}.` });
                }
            }
            else {
                productPayload[key] = rawPayload[key];
            }
        }
        
        const { attributes_config, variations_data, product_units_config, ...mainProductData } = productPayload;

        if (!mainProductData.product_name || !mainProductData.category_id || !mainProductData.base_unit_id || !mainProductData.product_type) {
            return res.status(400).json({ message: 'Missing required product fields (name, category, base unit, product type).' });
        }
        if (!['Standard', 'Variable'].includes(mainProductData.product_type)) {
            return res.status(400).json({ message: "Product type must be 'Standard' or 'Variable'." });
        }

        let preparedData = prepareProductData(mainProductData); // prepareProductData handles type conversions

        // Handle store_id based on user role
        if (req.user.role_name === ROLES.STORE_ADMIN || req.user.role_name === ROLES.STORE_MANAGER) {
            if (req.user.current_store_id) { // Assuming current_store_id is populated on user object
                preparedData.store_id = req.user.current_store_id;
            } else if (!preparedData.store_id) {
                return res.status(400).json({ message: 'Store information missing for product creation by your role.' });
            }
        } else if (req.user.role_name !== ROLES.GLOBAL_ADMIN && !preparedData.store_id) {
            // Non-global admin creating a product without a store_id (if store_id is optional in payload)
            // This logic depends on whether they *can* create global products.
            // If not, uncomment:
            // return res.status(400).json({ message: 'Store ID is required for product creation by your role.' });
        }
        
        // Handle barcode image upload if `req.file` is populated by multer
        if (req.file && req.file.path) { // Assuming multer saves file and req.file.path has the accessible URL/path
            preparedData.barcode_image_path = req.file.path;
        }


        await knex.transaction(async trx => {
            const [newProduct] = await trx('products').insert(preparedData).returning('*');

            if (product_units_config && Array.isArray(product_units_config) && product_units_config.length > 0) {
                const unitsToInsert = product_units_config.map(unitConfig => ({
                    product_id: newProduct.id,
                    unit_id: parseInt(unitConfig.unit_id, 10),
                    base_unit_id: newProduct.base_unit_id,
                    conversion_factor: parseFloat(unitConfig.conversion_factor),
                    is_purchase_unit: Boolean(unitConfig.is_purchase_unit),
                    is_sales_unit: Boolean(unitConfig.is_sales_unit)
                }));
                await trx('product_units').insert(unitsToInsert);
            }

            if (newProduct.product_type === 'Variable' && variations_data && Array.isArray(variations_data) && variations_data.length > 0) {
                for (const variationItem of variations_data) {
                    const { attribute_combination, ...variationPayload } = variationItem;
                    const preparedVariationPayload = prepareProductData(variationPayload); // Prepare prices etc.

                    const [newVariation] = await trx('product_variations').insert({
                        product_id: newProduct.id,
                        sku: preparedVariationPayload.sku,
                        cost_price: preparedVariationPayload.cost_price,
                        retail_price: preparedVariationPayload.retail_price,
                        wholesale_price: preparedVariationPayload.wholesale_price,
                    }).returning('*');

                    if (attribute_combination && typeof attribute_combination === 'object') {
                        for (const attributeName in attribute_combination) {
                            const attributeValueName = attribute_combination[attributeName];
                            const attribute = await trx('attributes').whereRaw('LOWER(name) = LOWER(?)', [attributeName.trim()]).first();
                            if (!attribute) continue;
                            const attributeValue = await trx('attribute_values')
                                .where({ attribute_id: attribute.id })
                                .andWhereRaw('LOWER(value) = LOWER(?)', [attributeValueName.trim()])
                                .first();
                            if (!attributeValue) continue;
                            await trx('product_variation_attribute_values').insert({
                                product_variation_id: newVariation.id,
                                attribute_value_id: attributeValue.id,
                            });
                        }
                    }
                }
            }
            res.status(201).json({ message: 'Product created successfully.', product: newProduct });
        });

    } catch (error) {
        console.error('[ProductCtrl POST /] Error:', error.message, error.stack);
        if (error.code === '23505') return res.status(409).json({ message: 'Conflict: SKU or other unique identifier already exists.', detail: error.detail });
        if (error.code === '23503') return res.status(400).json({ message: 'Invalid data: A specified reference (e.g., category) does not exist.', detail: error.detail });
        next(error);
    }
};

// PUT /api/products/:id - Update a product
const updateProduct = async (req, res, next) => {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    console.log(`[ProductCtrl PUT /${productId}] User: ${req.user?.id}, Role: ${req.user?.role_name}`);

    try {
        const rawPayload = req.body;
        const productPayload = {};
        const booleanFields = ['has_expiry', 'is_serialized'];
        const jsonFields = ['attributes_config', 'variations_data', 'product_units_config']; // Though these are usually handled by separate endpoints for updates

        for (const key in rawPayload) {
            if (booleanFields.includes(key)) {
                productPayload[key] = rawPayload[key] === 'true' || rawPayload[key] === '1';
            } else if (jsonFields.includes(key)) {
                // For PUT, complex objects like variations/units are often handled by their own dedicated endpoints
                // or require more sophisticated merging logic if sent with the main product update.
                // For simplicity, we'll assume they are not part of this main update payload here,
                // or if they are, they replace the existing ones entirely (which needs careful handling).
                // productPayload[key] = JSON.parse(rawPayload[key]);
            } else {
                productPayload[key] = rawPayload[key];
            }
        }
        
        const { attributes_config, variations_data, product_units_config, ...mainProductData } = productPayload;

        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });

        const existingProduct = await knex('products').where({ id: productId }).first();
        if (!existingProduct) return res.status(404).json({ message: `Product with ID ${productId} not found.` });

        // Authorization: Check if user can update this specific product (similar to getProductById)
        if (req.user.role_name !== ROLES.GLOBAL_ADMIN && existingProduct.store_id !== null) {
            const accessibleStores = req.user.associated_store_ids || [];
            if (req.user.store_id && !accessibleStores.includes(req.user.store_id)) {
                accessibleStores.push(req.user.store_id);
            }
            if (!accessibleStores.includes(existingProduct.store_id)) {
                return res.status(403).json({ message: 'Forbidden: You do not have access to update this product.' });
            }
        }

        let preparedData = prepareProductData(mainProductData);
        delete preparedData.id; // Cannot update primary key
        preparedData.updated_at = knex.fn.now();

        if (req.file && req.file.path) {
            preparedData.barcode_image_path = req.file.path;
        } else if (rawPayload.remove_barcode_image === '1') {
            preparedData.barcode_image_path = null; // Logic to remove image
        }


        await knex.transaction(async trx => {
            const [updatedProduct] = await trx('products')
                .where({ id: productId })
                .update(preparedData)
                .returning('*');
            
            // More complex updates for variations and units would typically be handled here
            // or via their own dedicated API endpoints. For example, syncing variations:
            // 1. Delete existing variations/units not present in the payload.
            // 2. Update existing ones.
            // 3. Add new ones.
            // This is complex and error-prone in a single PUT.
            // The ProductForm seems to handle unit configs via separate API calls for existing products.

            res.status(200).json({ message: 'Product updated successfully.', product: updatedProduct });
        });

    } catch (error) {
        console.error(`[ProductCtrl PUT /${id}] Error:`, error.message, error.stack);
        if (error.code === '23505') return res.status(409).json({ message: 'Conflict: SKU or other unique identifier already exists.', detail: error.detail });
        if (error.code === '23503') return res.status(400).json({ message: 'Invalid data: A specified reference does not exist.', detail: error.detail });
        next(error);
    }
};

// DELETE /api/products/:id - Delete a product
const deleteProduct = async (req, res, next) => {
    const { id } = req.params;
    const productId = parseInt(id, 10);
    const { id: userId, role_name: userRole, store_id: userStoreId, associated_store_ids } = req.user;

    if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });

    try {
        const product = await knex('products').where({ id: productId }).first();
        if (!product) {
            return res.status(404).json({ message: `Product with ID ${productId} not found.` });
        }

        let canDeleteThisProduct = false;
        if (userRole === ROLES.GLOBAL_ADMIN) {
            canDeleteThisProduct = true;
        } else if (userRole === ROLES.STORE_ADMIN || userRole === ROLES.STORE_MANAGER) {
            if (product.store_id === null && (userRole === ROLES.STORE_ADMIN)) { // Store admin might be allowed to delete global if configured
                // canDeleteThisProduct = true; // Business rule dependent
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
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this product.' });
        }

        // Check for dependencies before deleting (e.g., in purchase_order_items, sale_items, inventory)
        // This is a simplified check; a more robust check would query all relevant tables.
        const poItemCount = await knex('purchase_order_items').where({ product_id: productId }).count('id as count').first();
        if (poItemCount && poItemCount.count > 0) {
            return res.status(409).json({ message: 'Conflict: Product cannot be deleted as it is part of existing purchase orders.' });
        }
        // Add similar checks for sale_items, inventory_entries, etc.

        await knex.transaction(async trx => {
            // Manually delete related data if ON DELETE CASCADE is not set up or not sufficient
            await trx('product_variation_attribute_values')
                .whereIn('product_variation_id', function() {
                    this.select('id').from('product_variations').where('product_id', productId);
                }).del();
            await trx('product_variations').where({ product_id: productId }).del();
            await trx('product_units').where({ product_id: productId }).del();
            // Add other related data deletions here (e.g., product_attributes_junction if you have one)
            
            const deletedCount = await trx('products').where({ id: productId }).del();
            if (deletedCount > 0) {
                res.status(200).json({ message: `Product ${productId} and its related data deleted successfully.` });
            } else {
                res.status(404).json({ message: `Product ${productId} not found or already deleted.` });
            }
        });

    } catch (err) {
        if (err.code === '23503') { // Fallback FK violation if checks above miss something
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
    // export prepareProductData if you move it to a shared utility
};