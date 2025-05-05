// backend/routes/products.js
const express = require('express');

function createProductsRouter(knex) {
    const router = express.Router();

    // --- Helper Function for Data Preparation ---
    const prepareProductData = (inputData) => {
        const data = { ...inputData };
        const fieldsToNullifyIfEmpty = [ 'slug', 'sku', 'sub_category_id', 'special_category_id', 'brand_id', 'barcode_symbology_id', 'item_barcode', 'tax_id', 'discount_type_id', 'discount_value', 'measurement_type', 'measurement_value', 'weight', 'manufacturer_id', 'warranty_id', 'expiry_notification_days', 'supplier_id', 'store_id', 'wholesale_price', 'max_sales_qty_per_person', 'description' ];
        const numericFields = [ 'cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight' ];
        const integerFields = ['expiry_notification_days', 'max_sales_qty_per_person'];
        const booleanFields = ['has_expiry', 'is_serialized'];
        const dateFields = [];
        const foreignKeyFields = [ 'category_id', 'sub_category_id', 'special_category_id', 'brand_id', 'base_unit_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id' ];

        for (const key in data) {
            if (typeof data[key] === 'string') data[key] = data[key].trim();
            if ((fieldsToNullifyIfEmpty.includes(key) || foreignKeyFields.includes(key)) && data[key] === '') data[key] = null;
            if (numericFields.includes(key) && data[key] !== null) { const parsed = parseFloat(data[key]); data[key] = isNaN(parsed) ? null : parsed; }
            if (integerFields.includes(key) && data[key] !== null) { const parsed = parseInt(data[key], 10); data[key] = isNaN(parsed) ? null : parsed; }
            if (booleanFields.includes(key)) data[key] = Boolean(data[key]);
            if (dateFields.includes(key) && data[key] !== null) { const date = new Date(data[key]); data[key] = isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]; }
            if (foreignKeyFields.includes(key) && data[key] !== null) { const parsedInt = parseInt(data[key], 10); data[key] = isNaN(parsedInt) ? null : parsedInt; }
        }
        delete data.id; delete data.created_at;
        return data;
    };


    // --- API Route Definitions ---

    // GET /api/products - Fetch list with joins
    router.get('/', async (req, res, next) => {
        console.log(`[${new Date().toISOString()}] GET /api/products - Handler started.`);
        try {
            console.log(`[${new Date().toISOString()}] GET /api/products - Attempting Knex query with joins...`);
            const products = await knex('products')
                .leftJoin('categories', 'products.category_id', 'categories.id')
                .leftJoin('units', 'products.base_unit_id', 'units.id')
                .select(
                    'products.id', 'products.product_name', 'products.sku',
                    'products.retail_price', 'products.cost_price', 'products.wholesale_price',
                    'categories.name as category_name', 'units.name as base_unit_name'
                )
                .orderBy('products.product_name').limit(100);
            console.log(`[${new Date().toISOString()}] GET /api/products - Knex query successful. Fetched ${products.length} products.`);
            console.log(`[${new Date().toISOString()}] GET /api/products - Sending response...`);
            res.status(200).json(products);
            console.log(`[${new Date().toISOString()}] GET /api/products - Response sent.`);
        } catch (err) { console.error(`[${new Date().toISOString()}] [ERROR] GET /api/products:`, err); next(err); }
    });

    // GET /api/products/:id - Fetch single product
    router.get('/:id', async (req, res, next) => {
        const { id } = req.params; const productId = parseInt(id);
        if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });
        console.log(`[DEBUG] GET /api/products/${productId} handler started...`);
        try {
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
        } catch (err) { console.error(`[ERROR] Error fetching product ${id}:`, err); next(err); }
    });

    // POST /api/products - Create
    router.post('/', async (req, res, next) => {
        console.log("[DEBUG] POST /api/products handler started...");
        const requiredFields = ['product_name', 'category_id', 'base_unit_id', 'retail_price', 'cost_price'];
        const missingFields = requiredFields.filter(field =>!(field in req.body) || req.body[field] === '' || req.body[field] === null || req.body[field] === undefined);
        if (missingFields.length > 0) return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}.` });

        let preparedData;
        try { preparedData = prepareProductData(req.body); }
        catch(prepError) { console.error("Error preparing product data:", prepError); return res.status(400).json({ message: 'Invalid data format submitted.' }); }
        const newProductData = { ...preparedData, updated_at: new Date() };

        // Price Validation
        const costPrice = newProductData.cost_price; const retailPrice = newProductData.retail_price; const wholesalePrice = newProductData.wholesale_price;
        if (costPrice === null || costPrice < 0) return res.status(400).json({ message: 'Cost Price must be a non-negative number.' });
        if (retailPrice === null || retailPrice < 0) return res.status(400).json({ message: 'Retail Price must be a non-negative number.' });
        if (retailPrice < costPrice) return res.status(400).json({ message: 'Retail Price cannot be less than Cost Price.' });
        if (wholesalePrice !== null) { if (wholesalePrice < 0) return res.status(400).json({ message: 'Wholesale Price cannot be negative.' }); if (wholesalePrice < costPrice) return res.status(400).json({ message: 'Wholesale Price cannot be less than Cost Price.' }); }

        // Reference ID Validation & Insert
        try {
            if (newProductData.base_unit_id === null || isNaN(newProductData.base_unit_id)) return res.status(400).json({ message: 'Invalid or missing Base Unit ID.' });
            const baseUnitExists = await knex('units').where({ id: newProductData.base_unit_id }).first();
            if (!baseUnitExists) return res.status(400).json({ message: `Invalid reference ID provided (Base Unit ID: ${newProductData.base_unit_id} not found).` });

            if (newProductData.category_id === null || isNaN(newProductData.category_id)) return res.status(400).json({ message: 'Invalid or missing Category ID.' });
            const categoryExists = await knex('categories').where({ id: newProductData.category_id }).first();
            if (!categoryExists) return res.status(400).json({ message: `Invalid reference ID provided (Category ID: ${newProductData.category_id} not found).` });

            // Add checks for other optional FKs if needed...

            console.log("Attempting to insert product data:", JSON.stringify(newProductData, null, 2));
            const [insertedProduct] = await knex('products').insert(newProductData).returning('*');
            console.log("[DEBUG] Product inserted successfully:", insertedProduct.id);
            res.status(201).json(insertedProduct);

        } catch (err) { /* ... error handling ... */ }
    });

    // PUT /api/products/:id - Update
    router.put('/:id', async (req, res, next) => {
         const { id } = req.params; const productId = parseInt(id);
         if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID.' });
         if (Object.keys(req.body).length === 0) return res.status(400).json({ message: 'No update data provided.' });
         console.log(`[DEBUG] PUT /api/products/${productId} handler started...`);

         let currentProduct;
         try {
             console.log(`[DEBUG] Fetching current product data for ID: ${productId}`);
             currentProduct = await knex('products').where({ id: productId }).first();
             if (!currentProduct) { console.log(`[DEBUG] Product ${productId} not found.`); return res.status(404).json({ message: `Product with ID ${id} not found.` }); }
             console.log(`[DEBUG] Current product data fetched.`);

             console.log("[DEBUG] Preparing update data...");
             const preparedData = prepareProductData(req.body);
             const productUpdates = { ...preparedData, updated_at: new Date() };
             delete productUpdates.created_at;
             console.log("[DEBUG] Prepared update object:", productUpdates);

             // Price Validation
             console.log("[DEBUG] Starting price validation...");
             const finalCostPrice = productUpdates.cost_price !== undefined ? productUpdates.cost_price : currentProduct.cost_price; const finalRetailPrice = productUpdates.retail_price !== undefined ? productUpdates.retail_price : currentProduct.retail_price; const finalWholesalePrice = productUpdates.wholesale_price !== undefined ? productUpdates.wholesale_price : currentProduct.wholesale_price;
             if (finalCostPrice === null || finalCostPrice < 0) return res.status(400).json({ message: 'Cost Price must be a non-negative number.' }); if (finalRetailPrice === null || finalRetailPrice < 0) return res.status(400).json({ message: 'Retail Price must be a non-negative number.' }); if (finalRetailPrice < finalCostPrice) return res.status(400).json({ message: 'Retail Price cannot be less than Cost Price.' }); if (finalWholesalePrice !== null) { if (finalWholesalePrice < 0) return res.status(400).json({ message: 'Wholesale Price cannot be negative.' }); if (finalWholesalePrice < finalCostPrice) return res.status(400).json({ message: 'Wholesale Price cannot be less than Cost Price.' }); }
             console.log("[DEBUG] Price validation passed.");

             // Reference ID Validation
             console.log("[DEBUG] Starting reference ID validation...");
             if (productUpdates.base_unit_id !== undefined && productUpdates.base_unit_id !== null) { const baseUnitExists = await knex('units').where({ id: productUpdates.base_unit_id }).first(); if (!baseUnitExists) return res.status(400).json({ message: `Invalid Base Unit ID: ${productUpdates.base_unit_id}` }); } else if (productUpdates.base_unit_id === null) return res.status(400).json({ message: 'Base Unit ID cannot be removed.' });
             if (productUpdates.category_id !== undefined && productUpdates.category_id !== null) { const categoryExists = await knex('categories').where({ id: productUpdates.category_id }).first(); if (!categoryExists) return res.status(400).json({ message: `Invalid Category ID: ${productUpdates.category_id}` }); } else if (productUpdates.category_id === null) return res.status(400).json({ message: 'Category ID cannot be removed.' });
             // Add checks for other optional FKs if needed...
             console.log("[DEBUG] Reference ID validation passed.");

             // Prevent updates with no actual changes
             if (Object.keys(productUpdates).length <= 1 && 'updated_at' in productUpdates) { console.log(`[DEBUG] No actual data change detected for product ${productId}.`); return res.status(200).json(currentProduct); }

             // Perform Update
             console.log(`[DEBUG] Attempting database update for product ${productId}...`);
             const count = await knex('products').where({ id: productId }).update(productUpdates);
             console.log(`[DEBUG] Database update affected ${count} rows.`);

             // Fetch and return updated data
             console.log(`[DEBUG] Fetching updated product data for ID: ${productId}`);
             const updatedProduct = await knex('products').where({ id: productId }).first();
             console.log(`[DEBUG] Sending updated product response for ID: ${productId}`);
             res.status(200).json(updatedProduct);

         } catch (err) { /* ... error handling ... */ }
    });

    // DELETE /api/products/:id - Delete
    router.delete('/:id', async (req, res, next) => { /* ... includes validation and logs ... */ });

    return router;
}

module.exports = createProductsRouter;
