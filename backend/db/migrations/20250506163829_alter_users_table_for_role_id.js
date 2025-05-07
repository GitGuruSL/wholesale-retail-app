// filepath: d:\Development\wholesale-retail-app\backend\db\migrations\YYYYMMDDHHMMSS_alter_users_table_for_role_id.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Step 1: Add the new role_id column, allowing nulls temporarily for existing data
    await knex.schema.alterTable('users', function(table) {
        table.integer('role_id').unsigned().nullable();
        table.foreign('role_id').references('id').inTable('roles').onDelete('SET NULL'); // Or .onDelete('RESTRICT')
    });

    // Step 2: Update existing users to set their role_id based on the old string role
    // Adjust these mappings if your role names or seeded IDs are different
    await knex('users').where({ role: 'global_admin' }).update({ role_id: 1 });
    await knex('users').where({ role: 'store_admin' }).update({ role_id: 2 });
    await knex('users').where({ role: 'sales_person' }).update({ role_id: 3 });
    // Add more updates if you have other string roles

    // Step 3: Now that existing users are updated, make role_id not nullable
    // And potentially set a default if desired.
    // The default '3' (sales_person) is an example, choose what's appropriate.
    await knex.schema.alterTable('users', function(table) {
        table.integer('role_id').unsigned().notNullable().defaultTo(3).alter(); // Default to 'sales_person' ID
    });

    // Step 4: Drop the old string-based 'role' column
    await knex.schema.alterTable('users', function(table) {
        table.dropColumn('role');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Revert changes: Add back the 'role' column
    await knex.schema.alterTable('users', function(table) {
        table.string('role', 50).nullable(); // Or .defaultTo('sales_person') if you had a default
    });

    // Populate the old 'role' column based on 'role_id'
    // This is a best-effort reversal.
    const rolesMap = {
        1: 'global_admin',
        2: 'store_admin',
        3: 'sales_person'
    };
    for (const [id, name] of Object.entries(rolesMap)) {
        await knex('users').where({ role_id: parseInt(id) }).update({ role: name });
    }

    // Drop the 'role_id' column
    await knex.schema.alterTable('users', function(table) {
        table.dropForeign('role_id');
        table.dropColumn('role_id');
    });
};