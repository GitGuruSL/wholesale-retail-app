/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries from related tables first to avoid foreign key constraint issues.
  // Order matters: delete from tables that reference 'roles' or 'users' first.
  // Assuming 'role_permissions' links roles to permissions.
  
  // Clear join tables first
  // await knex('user_roles').del(); // Commented out as 'user_roles' table does not exist yet
  await knex('role_permissions').del(); 

  // Then clear tables that are referenced
  // If your 'users' table has a foreign key to 'roles', ensure 'users' are cleared or updated
  // before clearing 'roles' if there are dependencies.
  // For a clean seed, deleting users first is fine if they will be re-seeded or are not dependent on roles being present for deletion.
  await knex('users').del(); 
  await knex('roles').del(); // Clear roles table

  // Inserts seed entries for roles
  await knex('roles').insert([
    { 
      id: 1, 
      name: 'global_admin', 
      display_name: 'Global Admin', 
      description: 'Has all permissions across the system.',
      is_system_role: true // Mark as a system role
    },
    { 
      id: 2, 
      name: 'store_admin', 
      display_name: 'Store Admin', 
      description: 'Manages a specific store and its staff.',
      is_system_role: false 
    },
    { 
      id: 3, 
      name: 'sales_person', 
      display_name: 'Sales Person', 
      description: 'Handles sales and customer interactions.',
      is_system_role: false 
    },
    // Example for store_manager if you add it:
    // { 
    //   id: 4, 
    //   name: 'store_manager', 
    //   display_name: 'Store Manager', 
    //   description: 'Manages day-to-day store operations.',
    //   is_system_role: false 
    // }
  ]);
};