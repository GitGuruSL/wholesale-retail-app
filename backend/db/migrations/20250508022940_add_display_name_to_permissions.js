// filepath: backend/db/migrations/20250508022940_add_display_name_to_permissions.js
exports.up = function(knex) {
    return knex.schema.table('permissions', function(table) {
      // Add as nullable first
      table.string('display_name', 100).nullable().after('name'); 
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.table('permissions', function(table) {
      table.dropColumn('display_name');
    });
  };