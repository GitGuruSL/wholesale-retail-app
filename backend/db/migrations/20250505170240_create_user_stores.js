// filepath: backend/migrations/YYYYMMDDHHMMSS_create_user_stores.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('user_stores', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE'); // If user deleted, remove assignment
      table.integer('store_id').unsigned().notNullable();
      table.foreign('store_id').references('id').inTable('stores').onDelete('CASCADE'); // If store deleted, remove assignment
      table.timestamps(true, true);
  
      // Ensure a user can only be assigned to a store once
      table.unique(['user_id', 'store_id']);
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('user_stores');
  };