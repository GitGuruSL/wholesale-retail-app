// filepath: d:\Development\wholesale-retail-app\backend\db\migrations\YYYYMMDDHHMMSS_create_permissions_table.js
exports.up = function(knex) {
    return knex.schema.createTable('permissions', function(table) {
        table.increments('id').primary();
        // e.g., 'create_user', 'edit_product', 'view_all_orders', 'manage_settings'
        table.string('name', 100).notNullable().unique();
        table.string('description', 255).nullable();
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('permissions');
};