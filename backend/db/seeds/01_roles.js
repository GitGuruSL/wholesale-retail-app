/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries from users table first due to foreign key constraint
  // This assumes that if you are re-seeding roles, you also want to clear out users
  // or that users will be re-seeded by another seed file that runs after this.
  // If users.role_id was nullable and ON DELETE SET NULL, this wouldn't be strictly necessary
  // for the roles deletion itself, but users would lose their roles.
  await knex('users').del(); // Add this line

  // Deletes ALL existing entries from roles table
  await knex('roles').del();

  // Inserts seed entries for roles
  await knex('roles').insert([
    { id: 1, name: 'global_admin', display_name: 'Global Admin', description: 'Has all permissions across the system.' },
    { id: 2, name: 'store_admin', display_name: 'Store Admin', description: 'Manages a specific store and its staff.' },
    { id: 3, name: 'sales_person', display_name: 'Sales Person', description: 'Handles sales and customer interactions.' },
    // Example for store_manager if you add it:
    // { id: 4, name: 'store_manager', display_name: 'Store Manager', description: 'Manages day-to-day store operations.' }
  ]);
};