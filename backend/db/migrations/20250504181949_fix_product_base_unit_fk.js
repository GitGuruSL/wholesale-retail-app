// backend/db/migrations/YYYYMMDDHHMMSS_fix_product_base_unit_fk.js

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    // Fix the foreign key constraint for products.base_unit_id
    return knex.schema.alterTable('products', function(table) {
      // 1. Drop the old incorrect constraint.
      // Provide the column name(s) and optionally the constraint name.
      // If the constraint doesn't exist (or the name is wrong), this might
      // throw an error, which is acceptable here as it indicates a setup issue.
      // Knex versions might handle non-existent constraint drops differently.
      console.log('Attempting to drop constraint products_base_unit_id_foreign...');
      // Ensure you use the correct constraint name if it's different in your DB.
      // You can often find it using a DB tool like pgAdmin or DBeaver.
      table.dropForeign(['base_unit_id'], 'products_base_unit_id_foreign'); // Use the specific name
  
      // 2. Add the CORRECT constraint referencing the 'units' table
      console.log('Adding correct foreign key constraint for products.base_unit_id referencing units(id)...');
      table.foreign('base_unit_id')
           .references('id')
           .inTable('units')       // Reference the correct 'units' table
           .onDelete('RESTRICT')   // Keep RESTRICT to prevent deleting units used as base
           .onUpdate('CASCADE');
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    // Revert the changes: drop the correct constraint
    // NOTE: Re-adding the potentially incorrect old constraint referencing 'base_units'
    // might fail if the 'base_units' table doesn't exist. Rollback might need manual intervention.
    return knex.schema.alterTable('products', function(table) {
       // Drop the constraint added in the 'up' function
       // Knex needs the column name to find the constraint to drop by default convention
       console.log('Dropping foreign key constraint for products.base_unit_id referencing units(id)...');
       table.dropForeign('base_unit_id');
  
       // Optionally, try re-adding the old incorrect one (likely to fail if base_units is gone)
       // console.warn('Attempting to re-add old constraint referencing base_units. This might fail.');
       // table.foreign('base_unit_id', 'products_base_unit_id_foreign').references('id').inTable('base_units');
    });
  };
  