// filepath: d:\Development\wholesale-retail-app\backend\db\seeds\04_users.js
const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Ensure bcryptjs is installed: npm install bcryptjs
  // Or if you use yarn: yarn add bcryptjs

  // Deletes ALL existing entries from the users table.
  // CASCADE is used in case other tables reference users (e.g., user_activity_logs, orders created_by_user)
  // If no other tables reference users with ON DELETE CASCADE, 'RESTART IDENTITY' alone is fine.
  await knex.raw('TRUNCATE TABLE users RESTART IDENTITY CASCADE');

  const saltRounds = 10; // Standard salt rounds for bcrypt

  // --- Define your users here ---
  const usersToSeed = [
    {
      username: 'globaladmin',
      email: 'global.admin@example.com',
      password_plain: 'Boss1618', // Replace with a strong, unique password
      first_name: 'Global',
      last_name: 'Admin',
      role_id: 1, // Corresponds to 'global_admin' role_id from 01_roles.js
      is_active: true,
      // store_id: null, // Optional: if you have a store_id foreign key in your users table
    },
    {
      username: 'storeadmin01',
      email: 'store.admin01@example.com',
      password_plain: 'StoreP@ss1!', // Replace with a strong, unique password
      first_name: 'StoreOne',
      last_name: 'Admin',
      role_id: 2, // Corresponds to 'store_admin' role_id from 01_roles.js
      is_active: true,
      // store_id: 1, // Optional: Example if this user is tied to a specific store
    },
    {
      username: 'salesperson01',
      email: 'sales.person01@example.com',
      password_plain: 'SalesP@ss1!', // Replace with a strong, unique password
      first_name: 'SalesOne',
      last_name: 'Person',
      role_id: 3, // Corresponds to 'sales_person' role_id from 01_roles.js
      is_active: true,
      // store_id: 1, // Optional: Example if this user is tied to a specific store
    }
    // Add more user objects here as needed
  ];

  // Hash passwords and prepare user data for insertion
  const processedUsers = await Promise.all(
    usersToSeed.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password_plain, saltRounds);
      return {
        username: user.username,
        email: user.email,
        password_hash: hashedPassword, // Store the hashed password
        first_name: user.first_name,
        last_name: user.last_name,
        role_id: user.role_id,
        is_active: user.is_active,
        // store_id: user.store_id, // Include if you have this field
        // Add any other user fields your 'users' table requires
      };
    })
  );

  // Inserts seed entries into the users table
  if (processedUsers.length > 0) {
    await knex('users').insert(processedUsers);
    console.log(`Successfully seeded ${processedUsers.length} users.`);
  } else {
    console.log('No users defined in the seed file.');
  }
};