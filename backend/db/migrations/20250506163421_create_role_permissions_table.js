// filepath: d:\Development\wholesale-retail-app\backend\db\migrations\YYYYMMDDHHMMSS_create_role_permissions_table.js
exports.up = function(knex) {
    return knex.schema.createTable('role_permissions', function(table) {
        table.integer('role_id').unsigned().notNullable();
        table.foreign('role_id').references('id').inTable('roles').onDelete('CASCADE');

        table.integer('permission_id').unsigned().notNullable();
        table.foreign('permission_id').references('id').inTable('permissions').onDelete('CASCADE');

        table.primary(['role_id', 'permission_id']); // Composite primary key
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTableIfExists('role_permissions');
};