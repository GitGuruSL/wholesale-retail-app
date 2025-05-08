// Replace YYYYMMDDHHMMSS with the actual timestamp from the generated file name

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    await knex.schema.alterTable('roles', function(table) {
      table.string('display_name', 100).nullable(); // Add the new column
    });
  
    // Populate display_name for existing roles
    // Adjust these if your existing role names or desired display names are different
    await knex('roles')
      .where({ name: 'global_admin' })
      .update({ display_name: 'Global Admin' });
    await knex('roles')
      .where({ name: 'store_admin' })
      .update({ display_name: 'Store Admin' });
    await knex('roles')
      .where({ name: 'sales_person' })
      .update({ display_name: 'Sales Person' });
    // Add updates for any other existing roles, e.g., store_manager
    await knex('roles')
      .where({ name: 'store_manager' }) // Assuming you have this role
      .update({ display_name: 'Store Manager' });
  
    // It's good practice to make it not nullable after populating if all roles should have it
    // However, if some roles might legitimately not have a display_name, keep it nullable.
    // For now, let's assume all roles will have one. If you populated all, you can make it notNullable.
    // If you want to enforce it:
    // await knex.schema.alterTable('roles', function(table) {
    //   table.string('display_name', 100).notNullable().alter();
    // });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.alterTable('roles', function(table) {
      table.dropColumn('display_name');
    });
  };