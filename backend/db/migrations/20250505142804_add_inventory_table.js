// filepath: backend/db/migrations/YYYYMMDDHHMMSS_add_inventory_table.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('inventory', (table) => {
      table.increments('id').primary();
      table.integer('product_id').unsigned().notNullable();
      table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
      // --- Add store_id ---
      table.integer('store_id').unsigned().notNullable();
      table.foreign('store_id').references('id').inTable('stores').onDelete('CASCADE'); // Assuming you have a 'stores' table
      // --- End add store_id ---
      table.integer('quantity').notNullable().defaultTo(0); // Quantity is always in product's base unit
      table.integer('low_stock_threshold').nullable();
      table.timestamps(true, true); // Adds created_at and updated_at
  
      // --- Ensure unique inventory record per product per store ---
      table.unique(['product_id', 'store_id']);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('inventory');
  };