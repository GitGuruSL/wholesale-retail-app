/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('users', function(table) {
      table.integer('current_store_id').unsigned().nullable();
      table.foreign('current_store_id').references('id').inTable('stores').onDelete('SET NULL');
      table.index(['current_store_id'], 'idx_users_current_store_id');
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.alterTable('users', function(table) {
      // Ensure the index name matches what was created in 'up' if you need to drop it specifically
      // For PostgreSQL, Knex might generate a name like users_current_store_id_foreign
      // It's safer to drop the column, which usually drops associated constraints and indexes.
      // However, to be explicit for the index:
      // table.dropIndex(['current_store_id'], 'idx_users_current_store_id'); // If you named it explicitly
      // To drop foreign key constraint, you might need its specific name if not default.
      // table.dropForeign('current_store_id'); // Knex tries to guess the name
      
      // Simpler: just drop the column, which should handle related constraints/indexes.
      table.dropColumn('current_store_id');
    });
  };