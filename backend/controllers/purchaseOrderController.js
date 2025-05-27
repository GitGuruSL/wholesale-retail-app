const knex = require('../db/knex'); // Your Knex instance

const GLOBAL_ADMIN_ROLE_NAME = 'global_admin'; // Consistent role name

/**
 * @desc    Get all purchase orders
 * @route   GET /api/purchase-orders
 * @access  Private (requires purchase_order:read permission)
 */
exports.getPurchaseOrders = async (req, res) => {
    try {
        const { status, supplier_id, sort_by, order = 'desc', page = 1, limit = 10 } = req.query;
        let queryStoreId = req.query.store_id;

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User not authenticated.' });
        }

        let effectiveStoreId;
        if (req.user.role_name === GLOBAL_ADMIN_ROLE_NAME) {
            if (!queryStoreId) {
                // For global admin, if no store_id is provided, we might return an empty set or error
                // Or, if you want to allow fetching for ALL stores (potentially large data), remove this check.
                // For now, let's assume frontend sends it or we return empty if not.
                // return res.status(400).json({ success: false, message: 'Store ID is required for global admin.' });
                effectiveStoreId = null; // Or handle as "all stores" if desired
            } else {
                effectiveStoreId = queryStoreId;
            }
        } else { // Non-global admin
            if (!req.user.store_id) {
                return res.status(403).json({ success: false, message: 'User has no assigned store.' });
            }
            effectiveStoreId = req.user.store_id;
            // If queryStoreId is provided by non-admin, ensure it matches their assigned store
            if (queryStoreId && String(queryStoreId) !== String(effectiveStoreId)) {
                return res.status(403).json({ success: false, message: 'Access denied to purchase orders for the specified store.' });
            }
        }
        
        let query = knex('purchase_orders')
            .leftJoin('suppliers', 'purchase_orders.supplier_id', 'suppliers.id')
            .leftJoin('stores', 'purchase_orders.store_id', 'stores.id') // Join stores
            .select(
                'purchase_orders.id',
                'purchase_orders.order_date',
                'purchase_orders.expected_delivery_date',
                'purchase_orders.status',
                'purchase_orders.total_amount',
                'purchase_orders.created_at',
                'purchase_orders.updated_at',
                'suppliers.name as supplier_name',
                'stores.name as store_name' // Select store name
            );

        if (effectiveStoreId) {
            query = query.where('purchase_orders.store_id', effectiveStoreId);
        } else if (req.user.role_name === GLOBAL_ADMIN_ROLE_NAME && !queryStoreId) {
            // If global admin and no store_id, and you decided not to error,
            // you might fetch all or return empty. Returning empty for safety if not explicitly "all".
             return res.status(200).json({
                success: true,
                count: 0,
                total: 0,
                totalPages: 0,
                currentPage: parseInt(page, 10),
                data: []
            });
        }


        if (status) query = query.where('purchase_orders.status', status);
        if (supplier_id) query = query.where('purchase_orders.supplier_id', supplier_id);

        const allowedSortColumns = ['order_date', 'expected_delivery_date', 'status', 'total_amount', 'created_at', 'supplier_name', 'store_name'];
        let sortColumn = 'purchase_orders.created_at'; // Default
        if (sort_by && allowedSortColumns.includes(sort_by)) {
            if (sort_by === 'supplier_name') sortColumn = 'suppliers.name';
            else if (sort_by === 'store_name') sortColumn = 'stores.name';
            else sortColumn = `purchase_orders.${sort_by}`;
        }
        query = query.orderBy(sortColumn, order === 'asc' ? 'asc' : 'desc');
        
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
        const dataQuery = query.clone().limit(parseInt(limit, 10)).offset(offset);
        const purchaseOrders = await dataQuery;

        let countBaseQuery = knex('purchase_orders');
        if (effectiveStoreId) countBaseQuery = countBaseQuery.where('purchase_orders.store_id', effectiveStoreId);
        if (status) countBaseQuery = countBaseQuery.where('purchase_orders.status', status);
        if (supplier_id) countBaseQuery = countBaseQuery.where('purchase_orders.supplier_id', supplier_id);
        
        const totalCountResult = await countBaseQuery.count('id as total').first();
        const total = totalCountResult ? parseInt(totalCountResult.total, 10) : 0;

        res.status(200).json({
            success: true,
            count: purchaseOrders.length,
            total,
            totalPages: Math.ceil(total / parseInt(limit, 10)),
            currentPage: parseInt(page, 10),
            data: purchaseOrders
        });

    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching purchase orders' });
    }
};

/**
 * @desc    Get a single purchase order by ID
 * @route   GET /api/purchase-orders/:id
 * @access  Private (requires purchase_order:read permission)
 */
exports.getPurchaseOrderById = async (req, res) => {
    const { id } = req.params;
    try {
        const purchaseOrderId = parseInt(id, 10);

        if (isNaN(purchaseOrderId)) {
            return res.status(400).json({ success: false, message: 'Invalid Purchase Order ID format.' });
        }

        const po = await knex('purchase_orders')
            .where({ id: purchaseOrderId })
            .first();

        if (!po) {
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        const items = await knex('purchase_order_items as poi')
            .leftJoin('item_variations as iv', 'poi.item_variant_id', 'iv.id')
            .leftJoin('items as i', 'iv.item_id', 'i.id')
            .select(
                'poi.*', // Selects all columns from purchase_order_items
                'iv.variant_name', // Still useful to have the raw variant name
                'iv.sku as item_variant_sku',
                'i.item_name as base_item_name', // Still useful to have the raw base name
                'i.id as base_item_id',
                'iv.id as item_variation_id', // This is iv.id, the ID of the item_variation
                // New pre-combined display name field:
                knex.raw(
                  `CASE \
                    WHEN iv.variant_name IS NOT NULL AND iv.variant_name <> '' AND LOWER(iv.variant_name) <> 'default' AND iv.variant_name <> i.item_name \
                    THEN CONCAT(i.item_name, ' - ', iv.variant_name) \
                    ELSE i.item_name \
                  END as item_display_name`
                )
            )
            .where('poi.purchase_order_id', po.id);

        res.status(200).json({
            success: true,
            data: {
                ...po,
                items
            }
        });
    } catch (error) {
        console.error(`Error fetching purchase order ${id}:`, error);
        res.status(500).json({ success: false, message: 'Error fetching purchase order', error: error.message });
    }
};

/**
 * @desc    Create a new purchase order
 * @route   POST /api/purchase-orders
 * @access  Private (requires purchase_order:create permission)
 */
exports.createPurchaseOrder = async (req, res) => {
    // Expect item_variant_id in items array
    const { supplier_id, order_date, expected_delivery_date, status = 'Pending', notes, items } = req.body;
    let { store_id } = req.body;

    if (!req.user) return res.status(401).json({ success: false, message: 'User not authenticated.' });

    // Determine effective store_id based on role
    if (req.user.role_name !== GLOBAL_ADMIN_ROLE_NAME) {
        if (!req.user.store_id) {
            return res.status(403).json({ success: false, message: 'User has no assigned store to create a purchase order for.' });
        }
        // For non-global admin, force their assigned store_id or validate if provided
        if (store_id && String(store_id) !== String(req.user.store_id)) {
             return res.status(403).json({ success: false, message: 'Cannot create purchase order for a different store.' });
        }
        store_id = req.user.store_id; // Use user's assigned store
    } else { // Global Admin
        if (!store_id) {
            return res.status(400).json({ success: false, message: 'Store ID is required for creating a purchase order.' });
        }
    }

    if (!supplier_id || !order_date || !store_id || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Store ID, supplier, order date, and at least one item are required.' });
    }

    for (const item of items) {
        const itemVariantIdNum = parseInt(item.item_variant_id, 10);

        if (isNaN(itemVariantIdNum) || itemVariantIdNum <= 0) {
            return res.status(400).json({ success: false, message: `Each item must have a valid positive item_variant_id. Received: '${item.item_variant_id}'.` });
        }
        if (item.quantity == null || parseFloat(item.quantity) <= 0) {
            return res.status(400).json({ success: false, message: 'Item quantity must be a positive number.' });
        }
        if (item.unit_price == null || parseFloat(item.unit_price) < 0) {
            return res.status(400).json({ success: false, message: 'Item unit price must be a non-negative number.' });
        }
    }

    let trx;
    try {
        trx = await knex.transaction();
        let calculatedTotalAmount = 0;

        const poItemsToInsert = items.map(item => {
            const quantity = parseFloat(item.quantity);
            const unit_price = parseFloat(item.unit_price);
            const subtotal = quantity * unit_price;
            calculatedTotalAmount += subtotal;
            return {
                // Use item_variant_id for the database column
                item_variant_id: parseInt(item.item_variant_id, 10), // This is correct
                quantity,
                unit_price,
                subtotal,
                tax_rate: parseFloat(item.tax_rate) || 0.00,
                discount_amount: parseFloat(item.discount_amount) || 0.00,
            };
        });

        const [newPurchaseOrder] = await trx('purchase_orders')
            .insert({
                supplier_id: parseInt(supplier_id, 10),
                store_id: parseInt(store_id, 10),
                order_date,
                expected_delivery_date: expected_delivery_date || null,
                status,
                notes,
                total_amount: calculatedTotalAmount, // Initial total
            })
            .returning('*');

        const purchaseOrderId = newPurchaseOrder.id;

        const finalPoItems = poItemsToInsert.map(poItem => ({
            ...poItem,
            purchase_order_id: purchaseOrderId,
        }));

        if (finalPoItems.length > 0) {
            // THIS IS THE KEY PART - it will now match the (new) DB column name
            await trx('purchase_order_items').insert(finalPoItems);
        }
        
        // Ensure total_amount is correctly updated if calculated after items insert
        // (though in this flow, it's calculated before PO insert)
        // If you recalculate based on inserted items, update here:
        // await trx('purchase_orders').where({ id: purchaseOrderId }).update({ total_amount: calculatedTotalAmount });


        await trx.commit();

        const createdPO = await knex('purchase_orders')
            .leftJoin('suppliers', 'purchase_orders.supplier_id', 'suppliers.id')
            .leftJoin('stores', 'purchase_orders.store_id', 'stores.id')
            .select('purchase_orders.*', 'suppliers.name as supplier_name', 'stores.name as store_name')
            .where('purchase_orders.id', purchaseOrderId)
            .first();

        // Fetch created items with variant details
        const createdItems = await knex('purchase_order_items as poi')
            .leftJoin('item_variations as iv', 'poi.item_variant_id', 'iv.id') // <--- CORRECTED LINE
            .leftJoin('items as i', 'iv.item_id', 'i.id') // Join to base items table
            .select(
                'poi.*', // All columns from purchase_order_items
                'iv.variant_name',
                'iv.sku as item_variant_sku',
                'i.item_name as base_item_name'
            )
            .where('poi.purchase_order_id', purchaseOrderId);

        res.status(201).json({ success: true, data: { ...createdPO, items: createdItems } });
    } catch (error) {
        if (trx) await trx.rollback();
        console.error('Error creating purchase order:', error);
        if (error.routine && (error.routine.includes('_foreign_key_check') || error.message.includes('violates foreign key constraint'))) {
            return res.status(400).json({ success: false, message: 'Invalid supplier, store, or item variant ID provided.' });
        }
        res.status(500).json({ success: false, message: 'Server error while creating purchase order' });
    }
};


/**
 * @desc    Update a purchase order
 * @route   PUT /api/purchase-orders/:id
 * @access  Private (requires purchase_order:update permission)
 */
exports.updatePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    const { supplier_id, order_date, expected_delivery_date, status, notes, items } = req.body;
    let { store_id: new_store_id_from_request } = req.body;

    if (!req.user) return res.status(401).json({ success: false, message: 'User not authenticated.' });
    
    let trx;
    try {
        trx = await knex.transaction();
        const existingPO = await trx('purchase_orders').where({ id }).first();
        if (!existingPO) {
            await trx.rollback();
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        if (req.user.role_name !== GLOBAL_ADMIN_ROLE_NAME && existingPO.store_id !== req.user.store_id) {
            await trx.rollback();
            return res.status(403).json({ success: false, message: 'Access denied to update this purchase order.' });
        }

        let effectiveStoreId = existingPO.store_id;
        if (new_store_id_from_request) {
            if (req.user.role_name === GLOBAL_ADMIN_ROLE_NAME) {
                effectiveStoreId = parseInt(new_store_id_from_request, 10);
            } else {
                if (parseInt(new_store_id_from_request, 10) !== req.user.store_id) {
                    await trx.rollback();
                    return res.status(403).json({ success: false, message: 'Access denied to change store for this purchase order.' });
                }
                effectiveStoreId = req.user.store_id;
            }
        }

        await trx('purchase_orders')
            .where({ id: existingPO.id })
            .update({
                supplier_id: parseInt(supplier_id, 10),
                store_id: effectiveStoreId,
                order_date,
                expected_delivery_date: expected_delivery_date || null,
                status,
                notes,
            });

        await trx('purchase_order_items').where({ purchase_order_id: existingPO.id }).del();

        let calculatedTotalAmount = 0;

        if (items && Array.isArray(items) && items.length > 0) {
            const poItemsToInsert = items.map(item => {
                const quantity = parseFloat(item.quantity) || 0;
                const unit_price = parseFloat(item.unit_price) || 0;
                const subtotal = quantity * unit_price;
                calculatedTotalAmount += subtotal;

                // Ensure item_variant_id is present and valid
                if (!item.item_variant_id) {
                    throw new Error('Missing item_variant_id for an item in purchase order update.');
                }

                return {
                    purchase_order_id: existingPO.id,
                    item_variant_id: parseInt(item.item_variant_id, 10), // Corrected: use item_variant_id
                    quantity: quantity,
                    unit_price: unit_price,
                    subtotal: subtotal,
                    tax_rate: parseFloat(item.tax_rate) || 0.00,
                    discount_amount: parseFloat(item.discount_amount) || 0.00,
                };
            });

            if (poItemsToInsert.length > 0) {
                await trx('purchase_order_items').insert(poItemsToInsert);
            }
        }

        await trx('purchase_orders')
            .where({ id: existingPO.id })
            .update({ total_amount: calculatedTotalAmount });

        await trx.commit();
        
        // Fetch the updated PO with its items for the response
        const finalUpdatedPO = await knex('purchase_orders')
            .leftJoin('suppliers', 'purchase_orders.supplier_id', 'suppliers.id')
            .leftJoin('stores', 'purchase_orders.store_id', 'stores.id')
            .select('purchase_orders.*', 'suppliers.name as supplier_name', 'stores.name as store_name')
            .where('purchase_orders.id', id).first();

        const updatedPoItemsData = await knex('purchase_order_items as poi')
            .leftJoin('item_variations as iv', 'poi.item_variant_id', 'iv.id') // CORRECTED: item_variations
            .leftJoin('items as i', 'iv.item_id', 'i.id')
            .select(
                'poi.*',
                // Construct variant name (similar to getPurchaseOrderById)
                knex.raw(`COALESCE(iv.variant_name, i.item_name) as variant_name_resolved`), // Simpler variant name
                'iv.sku as item_variant_sku',
                'i.item_name as base_item_name',
                'iv.item_id as base_item_id' // Keep base_item_id
            )
            .where('poi.purchase_order_id', id);
        
        // Enrich with full display name if needed
        const detailedUpdatedItems = updatedPoItemsData.map(item => {
            let displayName = item.base_item_name || 'N/A';
            if (item.variant_name_resolved && item.variant_name_resolved.toLowerCase() !== 'default' && item.variant_name_resolved !== item.base_item_name) {
                displayName = `${item.base_item_name} - ${item.variant_name_resolved}`;
            }
            return {
                ...item,
                resolved_item_name: displayName // Use this for consistency if frontend expects it
            };
        });

        res.status(200).json({ success: true, data: { ...finalUpdatedPO, items: detailedUpdatedItems } });
    } catch (error) {
        if (trx) await trx.rollback();
        console.error(`Error updating purchase order ${id}:`, error);
         if (error.routine && (error.routine.includes('_foreign_key_check') || error.message.includes('violates foreign key constraint'))) {
             return res.status(400).json({ success: false, message: 'Invalid supplier, store, or item variant ID provided during update.' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * @desc    Delete a purchase order
 * @route   DELETE /api/purchase-orders/:id
 * @access  Private (requires purchase_order:delete permission)
 */
exports.deletePurchaseOrder = async (req, res) => {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ success: false, message: 'User not authenticated.' });

    let trx;
    try {
        trx = await knex.transaction();
        const purchaseOrder = await trx('purchase_orders').where({ id }).first();
        if (!purchaseOrder) {
            await trx.rollback();
            return res.status(404).json({ success: false, message: 'Purchase order not found' });
        }

        // Security: Non-global admin can only delete POs from their store
        if (req.user.role_name !== GLOBAL_ADMIN_ROLE_NAME && purchaseOrder.store_id !== req.user.store_id) {
            await trx.rollback();
            return res.status(403).json({ success: false, message: 'Access denied to delete this purchase order.' });
        }
        
        // Hard Delete
        await trx('purchase_order_items').where({ purchase_order_id: id }).del();
        await trx('purchase_orders').where({ id }).del();
        
        await trx.commit();
        res.status(200).json({ success: true, message: 'Purchase order deleted successfully.' });
    } catch (error) {
        if (trx) await trx.rollback();
        console.error(`Error deleting purchase order ${id}:`, error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};