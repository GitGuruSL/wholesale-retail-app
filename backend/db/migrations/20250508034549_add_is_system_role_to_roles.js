// filepath: backend/db/migrations/YYYYMMDDHHMMSS_add_is_system_role_to_roles.js
exports.up = function(knex) {
    return knex.schema.table('roles', function(table) {
        table.boolean('is_system_role').defaultTo(false).notNullable();
    });
};

exports.down = function(knex) {
    return knex.schema.table('roles', function(table) {
        table.dropColumn('is_system_role');
    });
};