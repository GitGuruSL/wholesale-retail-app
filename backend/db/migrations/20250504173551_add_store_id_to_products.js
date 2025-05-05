// backend/db/migrations/YYYYMMDDHHMMSS_add_store_id_to_products.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    // Add the store_id column to the products table
    return knex.schema.alterTable('products', function(table) {
      table.integer('store_id')
        .unsigned()
        .nullable() // Allow NULL for products available in all stores
        .references('id')
        .inTable('stores') // Foreign key to the stores table
        .onDelete('SET NULL') // If store is deleted, set product's store_id to NULL (making it available to all)
        .onUpdate('CASCADE')
        .after('supplier_id'); // Place it after supplier_id (or adjust placement)
  
      table.index('store_id'); // Add an index for performance
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    // Remove the store_id column and its index/foreign key
    return knex.schema.alterTable('products', function(table) {
      // Drop foreign key and index first (names might vary)
      // table.dropForeign('store_id'); // Knex might handle this with dropColumn
      // table.dropIndex('store_id');  // Knex might handle this with dropColumn
      return knex.schema.hasColumn('products', 'store_id').then(exists => {
          if(exists) {
              table.dropColumn('store_id');
          }
      });
    });
  };
  