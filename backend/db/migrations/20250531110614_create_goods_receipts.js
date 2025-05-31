exports.up = function(knex) {
  return knex.schema
    .createTable('goods_receipts', function(table) {
      table.increments('id').primary();
      table.integer('purchase_order_id').unsigned().notNullable()
        .references('id').inTable('purchase_orders').onDelete('CASCADE');
      table.integer('store_id').unsigned().notNullable()
        .references('id').inTable('stores');
      table.integer('received_by').unsigned().references('id').inTable('users');
      table.timestamp('received_at').defaultTo(knex.fn.now());
      table.text('notes');
      table.timestamps(true, true);
    })
    .createTable('goods_receipt_items', function(table) {
      table.increments('id').primary();
      table.integer('goods_receipt_id').unsigned().notNullable()
        .references('id').inTable('goods_receipts').onDelete('CASCADE');
      table.integer('item_id').unsigned().notNullable()
        .references('id').inTable('items');
      table.integer('quantity_received').notNullable();
      table.decimal('unit_cost', 14, 2);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('goods_receipt_items')
    .dropTableIfExists('goods_receipts');
};