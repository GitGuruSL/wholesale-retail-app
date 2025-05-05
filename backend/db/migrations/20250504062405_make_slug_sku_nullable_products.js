/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('products', function(table) {
      // Change slug to be nullable. Keep unique constraint if desired (allows multiple nulls but only one of each actual value)
      table.string('slug').nullable().alter();
      // Change sku to be nullable. Keep unique constraint if desired.
      table.string('sku').nullable().alter();
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    // Revert the changes - CAUTION: This might fail if NULL values exist in these columns
    return knex.schema.alterTable('products', function(table) {
      table.string('slug').notNullable().alter();
      table.string('sku').notNullable().alter();
    });
  };