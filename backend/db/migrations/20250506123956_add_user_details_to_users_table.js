/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('users', function(table) {
      table.string('first_name', 100);
      table.string('last_name', 100);
      table.string('email', 255); // Consider making this unique if it should be
      // table.unique(['email']); // Optional: if email should be unique across users
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.table('users', function(table) {
      table.dropColumn('first_name');
      table.dropColumn('last_name');
      table.dropColumn('email');
    });
  };