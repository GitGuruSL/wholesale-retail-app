// filepath: d:\Development\wholesale-retail-app\backend\db\seeds\01_roles.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('roles').del();
  // Inserts seed entries
  await knex('roles').insert([
    { id: 1, name: 'global_admin', description: 'Has all permissions across the system.' },
    { id: 2, name: 'store_admin', description: 'Manages a specific store and its staff.' },
    { id: 3, name: 'sales_person', description: 'Handles sales and customer interactions.' }
    // Add more predefined roles here if needed
  ]);
};