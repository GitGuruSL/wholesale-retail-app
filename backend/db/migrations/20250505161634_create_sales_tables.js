// filepath: backend/migrations/YYYYMMDDHHMMSS_create_sales_tables.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema
      .createTable('sales', (table) => {
        table.increments('id').primary();
        table.timestamp('sale_date').defaultTo(knex.fn.now());
        table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('SET NULL'); // Keep sale record even if user deleted? Or restrict?
        table.integer('store_id').unsigned().notNullable().references('id').inTable('stores').onDelete('RESTRICT'); // Don't allow deleting store if sales exist
        table.string('customer_name').nullable();
        table.decimal('sub_total', 12, 2).notNullable().defaultTo(0.00); // Sum of line totals before overall discount/tax
        table.decimal('discount_amount', 12, 2).notNullable().defaultTo(0.00); // Overall discount on the sale
        table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0.00); // Overall tax on the sale
        table.decimal('final_amount', 12, 2).notNullable(); // sub_total - discount_amount + tax_amount
        table.string('payment_method').nullable(); // e.g., 'cash', 'card', 'upi'
        table.text('notes').nullable();
        table.timestamps(true, true); // Adds created_at and updated_at
      })
      .createTable('sale_items', (table) => {
        table.increments('id').primary();
        table.integer('sale_id').unsigned().notNullable().references('id').inTable('sales').onDelete('CASCADE'); // Delete items if sale is deleted
        table.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('RESTRICT'); // Don't allow deleting product if sales exist
        table.decimal('quantity', 10, 3).notNullable(); // Allow fractional quantities if needed
        table.decimal('unit_price', 12, 2).notNullable(); // Price per unit at the time of sale
        table.decimal('discount_per_unit', 12, 2).notNullable().defaultTo(0.00);
        table.decimal('tax_per_unit', 12, 2).notNullable().defaultTo(0.00);
        table.decimal('line_total', 12, 2).notNullable(); // (unit_price - discount_per_unit + tax_per_unit) * quantity
        // No timestamps needed here usually, inherit from parent sale
      });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema
      .dropTableIfExists('sale_items')
      .dropTableIfExists('sales');
  };