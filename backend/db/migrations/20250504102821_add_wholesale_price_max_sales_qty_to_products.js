// backend/db/migrations/YYYYMMDDHHMMSS_add_wholesale_price_max_sales_qty_to_products.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('products', function(table) {
      // Add wholesale_price column (nullable decimal for currency)
      // Adjust precision (total digits) and scale (digits after decimal) as needed
      table.decimal('wholesale_price', 12, 2).nullable().after('retail_price'); // Place it after retail_price
  
      // Add max_sales_qty_per_person column (nullable integer)
      table.integer('max_sales_qty_per_person').unsigned().nullable().comment('Maximum quantity a single customer can buy in one transaction/period');
      // You can place it where it makes sense, e.g., after discount fields
      // table.integer('max_sales_qty_per_person').unsigned().nullable().after('discount_value');
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    // Drop the columns if rolling back
    return knex.schema.alterTable('products', function(table) {
      // Use hasColumn for safety during rollback
      return knex.schema.hasColumn('products', 'wholesale_price').then(exists => {
          if (exists) table.dropColumn('wholesale_price');
      }).then(() => knex.schema.hasColumn('products', 'max_sales_qty_per_person'))
        .then(exists => {
          if (exists) table.dropColumn('max_sales_qty_per_person');
      });
    });
  };
  