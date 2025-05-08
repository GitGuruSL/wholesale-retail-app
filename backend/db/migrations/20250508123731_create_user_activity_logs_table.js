/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('user_activity_logs', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE'); // If user is deleted, their activity logs are also deleted.
  
      table.string('activity_type', 50).notNullable(); // e.g., 'login', 'logout', 'failed_login', 'password_reset_request', 'password_reset_success'
      table.timestamp('activity_timestamp').notNullable().defaultTo(knex.fn.now());
      
      table.string('ip_address', 45).nullable(); // For IPv4 and IPv6
      table.text('user_agent').nullable();
      table.jsonb('details').nullable(); // For any additional context-specific data
  
      table.index(['user_id'], 'idx_user_activity_user_id');
      table.index(['activity_type'], 'idx_user_activity_type');
      table.index(['activity_timestamp'], 'idx_user_activity_timestamp');
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('user_activity_logs');
  };