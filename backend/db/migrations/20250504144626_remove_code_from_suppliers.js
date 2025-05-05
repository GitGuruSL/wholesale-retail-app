// backend/db/migrations/YYYYMMDDHHMMSS_remove_code_from_suppliers.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    // Remove the 'code' column from the 'suppliers' table
    return knex.schema.alterTable('suppliers', function(table) {
      // Use hasColumn for safety in case migration is run multiple times
      return knex.schema.hasColumn('suppliers', 'code').then(exists => {
        if (exists) {
          table.dropColumn('code');
        }
      });
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    // Re-add the 'code' column if rolling back
    // Make it nullable and unique as it was before (or adjust if needed)
    return knex.schema.alterTable('suppliers', function(table) {
      table.string('code').unique().nullable();
    });
  };
  