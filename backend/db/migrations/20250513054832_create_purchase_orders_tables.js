// ... existing code ...
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('purchase_orders', function(table) {
      table.increments('id').primary();
      table.integer('supplier_id').unsigned().notNullable();
      table.foreign('supplier_id').references('id').inTable('suppliers').onDelete('RESTRICT');
      table.integer('store_id').unsigned().nullable();
      table.foreign('store_id').references('id').inTable('stores').onDelete('SET NULL');
      table.date('order_date').notNullable().defaultTo(knex.fn.now());
      table.date('expected_delivery_date').nullable();
      table.string('status', 50).notNullable().defaultTo('Pending');
      table.text('notes').nullable();
      table.decimal('total_amount', 12, 2).nullable();
      table.timestamps(true, true);

      table.index('supplier_id');
      table.index('store_id');
      table.index('status');
    })
    .createTable('purchase_order_items', function(table) {
      table.increments('id').primary();
      table.integer('purchase_order_id').unsigned().notNullable();
      table.foreign('purchase_order_id').references('id').inTable('purchase_orders').onDelete('CASCADE');
      table.integer('item_id').unsigned().notNullable(); // Corrected to lowercase
      table.foreign('item_id').references('id').inTable('items').onDelete('RESTRICT'); // Corrected to lowercase 'item_id' and 'items'
      table.decimal('quantity', 10, 2).notNullable();
      table.decimal('unit_price', 10, 2).notNullable();
      table.decimal('subtotal', 12, 2).notNullable();
      table.decimal('tax_rate', 5, 2).nullable().defaultTo(0.00);
      table.decimal('discount_amount', 10, 2).nullable().defaultTo(0.00);
      table.timestamps(true, true);

      table.index('purchase_order_id');
      table.index('item_id'); // Corrected to lowercase
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('purchase_order_items')
    .dropTableIfExists('purchase_orders');
};
// ... existing code ...