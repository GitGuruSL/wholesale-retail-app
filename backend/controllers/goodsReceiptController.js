const knex = require('../db/knex');

exports.listGoodsReceipts = async (req, res) => {
  try {
    const { store_id } = req.query; // Get store_id from query parameters

    let query = knex('goods_receipts')
      .leftJoin('purchase_orders', 'goods_receipts.purchase_order_id', 'purchase_orders.id')
      .leftJoin('stores', 'goods_receipts.store_id', 'stores.id')
      .select(
        'goods_receipts.*',
        'purchase_orders.supplier_id',
        'stores.name as store_name'
      );

    if (store_id) {
      query = query.where('goods_receipts.store_id', store_id); // Add this line to filter by store_id
    }

    const receipts = await query;
    res.json(receipts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching goods receipts', error: err.message });
  }
};

exports.getGoodsReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await knex('goods_receipts').where({ id }).first();
    if (!receipt) return res.status(404).json({ message: 'Not found' });
    const items = await knex('goods_receipt_items').where({ goods_receipt_id: id });
    res.json({ ...receipt, items });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching goods receipt', error: err.message });
  }
};

exports.createGoodsReceipt = async (req, res) => {
  try {
    const { purchase_order_id, store_id, received_by, notes, items } = req.body;
    await knex.transaction(async trx => {
      const [goodsReceiptIdObj] = await trx('goods_receipts')
        .insert({
          purchase_order_id, store_id, received_by, notes
        })
        .returning('id');

      const goodsReceiptId = goodsReceiptIdObj.id || goodsReceiptIdObj;

      const itemsToInsert = items.map(item => ({
        goods_receipt_id: goodsReceiptId,
        item_id: item.item_id,
        quantity_received: item.quantity_received,
        unit_cost: item.unit_cost || 0,
        free_quantity_received: item.free_quantity_received || 0,
      }));

      // Log the items array just before insertion
      console.log('Backend: Attempting to insert goods_receipt_items:', JSON.stringify(itemsToInsert, null, 2)); // <--- ADD THIS LINE

      await trx('goods_receipt_items').insert(itemsToInsert);

      res.status(201).json({ message: 'Goods receipt created successfully', id: goodsReceiptId });
    });
  } catch (err) {
    console.error('Backend Error in createGoodsReceipt transaction:', err); // Ensure full error is logged
    res.status(500).json({ message: 'Error creating goods receipt', error: err.message });
  }
};