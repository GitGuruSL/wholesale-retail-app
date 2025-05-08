/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('user_store_assignments_history', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE'); // If user is deleted, their assignment history is also deleted.
      
      table.integer('store_id').unsigned().notNullable();
      table.foreign('store_id').references('id').inTable('stores').onDelete('CASCADE'); // If store is deleted, related history is also deleted.
  
      table.timestamp('assigned_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('unassigned_at').nullable();
      
      // Optional: To track who made the assignment/unassignment
      // table.integer('created_by').unsigned().nullable();
      // table.foreign('created_by').references('id').inTable('users').onDelete('SET NULL');
      // table.integer('updated_by').unsigned().nullable(); 
      // table.foreign('updated_by').references('id').inTable('users').onDelete('SET NULL');
  
      table.timestamps(true, true); // Adds created_at and updated_at columns
  
      table.index(['user_id'], 'idx_user_store_history_user_id');
      table.index(['store_id'], 'idx_user_store_history_store_id');
      table.index(['user_id', 'unassigned_at'], 'idx_user_store_history_active_assignment'); // For quickly finding active assignments
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('user_store_assignments_history');
  };