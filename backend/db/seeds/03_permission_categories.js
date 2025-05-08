exports.seed = async function(knex) {
  const categories = [
    { id: 1, name: 'User, Role & Permission Mgmt', display_order: 10 },
    { id: 2, name: 'Store & Product Catalog', display_order: 20 },
    { id: 3, name: 'Product Configuration', display_order: 30 },
    { id: 4, name: 'Operations', display_order: 40 },
    { id: 5, name: 'System & Reports', display_order: 50 },
    { id: 6, name: 'Other Permissions', display_order: 999 }, // For any uncategorized
  ];

  // Deletes ALL existing entries and resets sequence for relevant tables
   await knex('permission_categories').del(); 
  // For PostgreSQL, to reset the sequence (optional, but good for clean seeding)
  if (knex.client.config.client === 'pg') {
    await knex.raw('ALTER SEQUENCE permission_categories_id_seq RESTART WITH 100;'); // Start IDs higher if you prefer
  }


  // Inserts seed entries
  await knex('permission_categories').insert(categories);
  console.log(`Successfully seeded ${categories.length} permission categories.`);
};