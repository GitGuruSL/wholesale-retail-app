// filepath: d:\Development\wholesale-retail-app\backend\db\migrations\YYYYMMDDHHMMSS_create_roles_table.js
exports.up = function(knex) {
    return knex.schema.createTable('roles', function(table) {
        table.increments('id').primary();
        table.string('name', 50).notNullable().unique(); // e.g., 'global_admin', 'store_manager'
        table.string('description', 255).nullable();
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('roles');
};