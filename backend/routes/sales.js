// filepath: backend/routes/sales.js
const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');

function createSalesRouter(knex) {
    const router = express.Router();

    // Apply authentication middleware to all sales routes
    router.use(authenticateToken);

    // POST /api/sales - Record a new sale
    router.post('/', async (req, res, next) => {
        const { storeId, items, paymentMethod, customerName, notes, discountAmount = 0, taxAmount = 0 } = req.body;
        const userId = req.user.userId; // Get user ID from authenticated token payload

        // --- Basic Validation ---
        if (!storeId || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'storeId and a non-empty items array are required.' });
        }
        if (!items.every(item => item.ItemId && item.quantity > 0 && item.unitPrice >= 0)) {
            return res.status(400).json({ message: 'Each item must have ItemId, quantity > 0, and unitPrice >= 0.' });
        }

        // --- Transaction ---
        let saleId;
        try {
            await knex.transaction(async (trx) => {
                console.log(`[Sales POST] Starting transaction for user ${userId}, store ${storeId}`);

                // 1. Calculate totals and prepare item data
                let calculatedSubTotal = 0;
                const saleItemsData = items.map(item => {
                    const discountPerUnit = item.discountPerUnit || 0;
                    const taxPerUnit = item.taxPerUnit || 0;
                    const lineTotal = (item.unitPrice - discountPerUnit + taxPerUnit) * item.quantity;
                    calculatedSubTotal += lineTotal;
                    return {
                        Item_id: item.ItemId,
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                        discount_per_unit: discountPerUnit,
                        tax_per_unit: taxPerUnit,
                        line_total: lineTotal,
                    };
                });

                const finalAmount = calculatedSubTotal - (discountAmount || 0) + (taxAmount || 0);
                if (finalAmount < 0) {
                    throw new Error("Final amount cannot be negative."); // Rollback transaction
                }

                // 2. Insert into 'sales' table
                const [newSale] = await trx('sales')
                    .insert({
                        user_id: userId,
                        store_id: storeId,
                        customer_name: customerName,
                        sub_total: calculatedSubTotal,
                        discount_amount: discountAmount || 0,
                        tax_amount: taxAmount || 0,
                        final_amount: finalAmount,
                        payment_method: paymentMethod,
                        notes: notes,
                        // sale_date, created_at, updated_at have defaults
                    })
                    .returning('id');
                saleId = newSale.id;
                console.log(`[Sales POST] Inserted sale record ${saleId}`);

                // 3. Insert into 'sale_items' table
                const itemsToInsert = saleItemsData.map(item => ({ ...item, sale_id: saleId }));
                await trx('sale_items').insert(itemsToInsert);
                console.log(`[Sales POST] Inserted ${itemsToInsert.length} sale items for sale ${saleId}`);

                // 4. Update inventory for each item
                console.log(`[Sales POST] Updating inventory for sale ${saleId}...`);
                for (const item of itemsToInsert) {
                    const ItemId = item.Item_id;
                    const quantitySold = item.quantity;

                    // Decrement inventory quantity
                    const updatedRows = await trx('inventory')
                        .where({ Item_id: ItemId, store_id: storeId })
                        .decrement('quantity', quantitySold);

                    if (updatedRows === 0) {
                        // If no row was updated, it means the Item might not exist in inventory for that store
                        // OR the quantity went below zero if constraints are set up.
                        // For simplicity here, we assume an inventory record should exist.
                        // A more robust solution checks existence first or handles upsert.
                        console.warn(`[Sales POST] Inventory record not found or not updated for Item ${ItemId} in store ${storeId}. Potential issue.`);
                        // Decide if this should cause a rollback:
                        // throw new Error(`Inventory update failed for Item ${ItemId}. Record not found or insufficient stock if constraints exist.`);
                    } else {
                         console.log(`[Sales POST] Decremented inventory for Item ${ItemId} by ${quantitySold} in store ${storeId}`);
                    }
                    // Optional: Check if quantity went below zero if DB doesn't enforce it
                    // const currentInv = await trx('inventory').where({ Item_id: ItemId, store_id: storeId }).first('quantity');
                    // if (currentInv && currentInv.quantity < 0) {
                    //     throw new Error(`Insufficient stock for Item ${ItemId} in store ${storeId}.`);
                    // }
                }
                console.log(`[Sales POST] Inventory update complete for sale ${saleId}`);
            }); // End Transaction

            // If transaction succeeded
            console.log(`[Sales POST] Transaction committed successfully for sale ${saleId}`);
            res.status(201).json({ message: 'Sale recorded successfully.', saleId: saleId });

        } catch (error) {
            console.error(`[ERROR] POST /api/sales - Transaction failed:`, error);
            // Check for specific errors if needed (e.g., insufficient stock)
            if (error.message.includes("Insufficient stock") || error.message.includes("Final amount cannot be negative")) {
                 res.status(400).json({ message: error.message });
            } else {
                 next(error); // Pass to global error handler
            }
        }
    });

    // GET /api/sales - List sales (add filtering/pagination later)
    router.get('/', async (req, res, next) => {
        // TODO: Add filtering by date range, user, store etc.
        // TODO: Add pagination (limit, offset)
        try {
            const sales = await knex('sales')
                .leftJoin('users', 'sales.user_id', 'users.id')
                .leftJoin('stores', 'sales.store_id', 'stores.id')
                .select(
                    'sales.id', 'sales.sale_date', 'sales.final_amount', 'sales.payment_method',
                    'users.name as user_name', 'stores.name as store_name', 'sales.customer_name'
                    )
                .orderBy('sales.sale_date', 'desc')
                .limit(50); // Example limit

            res.status(200).json(sales);
        } catch (err) {
            console.error("[ERROR] GET /api/sales:", err);
            next(err);
        }
    });

    // GET /api/sales/:saleId - Get details of a specific sale
    router.get('/:saleId', async (req, res, next) => {
        const { saleId } = req.params;
        try {
            const sale = await knex('sales')
                .leftJoin('users', 'sales.user_id', 'users.id')
                .leftJoin('stores', 'sales.store_id', 'stores.id')
                .select(
                    'sales.*', // Select all from sales table
                    'users.name as user_name', 'users.email as user_email',
                    'stores.name as store_name', 'stores.location as store_location'
                    )
                .where('sales.id', saleId)
                .first(); // Expect only one

            if (!sale) {
                return res.status(404).json({ message: 'Sale not found.' });
            }

            const items = await knex('sale_items')
                .join('Items', 'sale_items.Item_id', 'Items.id')
                .where('sale_items.sale_id', saleId)
                .select('sale_items.*', 'Items.Item_name as Item_name', 'Items.sku'); // Select all from items + Item name/sku

            res.status(200).json({ ...sale, items });
        } catch (err) {
            console.error(`[ERROR] GET /api/sales/${saleId}:`, err);
            next(err);
        }
    });

    // GET /api/users/:userId/sales - Get sales by user (can be accessed via /api/sales?userId=...)
    // We can add a specific route or handle via query params in GET /api/sales

    // GET /api/stores/:storeId/sales - Get sales by store (can be accessed via /api/sales?storeId=...)
    // We can add a specific route or handle via query params in GET /api/sales

    return router;
}

module.exports = createSalesRouter;