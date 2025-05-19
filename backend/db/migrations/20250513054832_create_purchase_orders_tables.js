/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('purchase_orders', function(table) {
      table.increments('id').primary();
      table.integer('supplier_id').unsigned().notNullable();
      table.foreign('supplier_id').references('id').inTable('suppliers').onDelete('RESTRICT'); // Or 'SET NULL' / 'CASCADE'
      table.integer('store_id').unsigned().nullable();
      table.foreign('store_id').references('id').inTable('stores').onDelete('SET NULL'); // Or 'RESTRICT' / 'CASCADE'
      table.date('order_date').notNullable().defaultTo(knex.fn.now());
      table.date('expected_delivery_date').nullable();
      table.string('status', 50).notNullable().defaultTo('Pending'); // Consider a check constraint if your DB supports it easily with Knex, or handle in application logic
      table.text('notes').nullable();
      table.decimal('total_amount', 12, 2).nullable();
      table.timestamps(true, true); // Adds created_at and updated_at

      table.index('supplier_id');
      table.index('store_id');
      table.index('status');
    })
    .createTable('purchase_order_items', function(table) {
      table.increments('id').primary();
      table.integer('purchase_order_id').unsigned().notNullable();
      table.foreign('purchase_order_id').references('id').inTable('purchase_orders').onDelete('CASCADE');
      table.integer('Item_id').unsigned().notNullable();
      table.foreign('Item_id').references('id').inTable('Items').onDelete('RESTRICT');
      table.decimal('quantity', 10, 2).notNullable(); // Add .checkPositive() if available and desired, or handle in app
      table.decimal('unit_price', 10, 2).notNullable(); // Add .checkNegative(false) if available, or handle in app
      table.decimal('subtotal', 12, 2).notNullable();
      table.decimal('tax_rate', 5, 2).nullable().defaultTo(0.00);
      table.decimal('discount_amount', 10, 2).nullable().defaultTo(0.00);
      table.timestamps(true, true); // Adds created_at and updated_at

      table.index('purchase_order_id');
      table.index('Item_id');
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