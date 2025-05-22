exports.up = async function(knex) {
  // Logic to alter purchase_order_items:
  // 1. Drop old foreign key on item_id (which references 'items' table)
  console.log('UP: Attempting to drop foreign key on item_id referencing items...');
  await knex.schema.alterTable('purchase_order_items', async function(table) {
    // Assuming 'purchase_order_items_item_id_foreign' is the correct name.
    // If this constraint doesn't exist, this might error. Add IF EXISTS if your DB supports it for raw,
    // or ensure it exists. For Knex's dropForeign, it should handle non-existence gracefully or error informatively.
    await table.dropForeign(['item_id'], 'purchase_order_items_item_id_foreign');
  });
  console.log('UP: Dropped foreign key on item_id.');

  // 2. Rename item_id to item_variant_id
  console.log('UP: Renaming column item_id to item_variant_id...');
  await knex.schema.alterTable('purchase_order_items', async function(table) {
    await table.renameColumn('item_id', 'item_variant_id');
  });
  console.log('UP: Renamed column item_id to item_variant_id.');

  // 3. Make item_variant_id nullable temporarily to handle existing data
  console.log('UP: Altering item_variant_id to be nullable...');
  await knex.schema.alterTable('purchase_order_items', async function(table) {
    await table.integer('item_variant_id').nullable().alter();
  });
  console.log('UP: Altered item_variant_id to be nullable.');

  // 4. Update existing data: set item_variant_id to NULL if it doesn't match an item_variation
  console.log('UP: Updating item_variant_id for existing rows...');
  await knex.raw(`
    UPDATE purchase_order_items
    SET item_variant_id = NULL
    WHERE item_variant_id IS NOT NULL
      AND item_variant_id NOT IN (SELECT id FROM item_variations);
  `);
  console.log('UP: Updated item_variant_id for existing rows.');

  // 5. Add new foreign key on item_variant_id referencing item_variations
  console.log('UP: Adding new foreign key on item_variant_id referencing item_variations...');
  await knex.schema.alterTable('purchase_order_items', async function(table) {
    // This will be auto-named 'purchase_order_items_item_variant_id_foreign' by PostgreSQL
    await table.foreign('item_variant_id')
      .references('id')
      .inTable('item_variations')
      .onDelete('RESTRICT')
      .onUpdate('CASCADE');
  });
  console.log('UP: Added new foreign key on item_variant_id.');

  // Optional: Alter item_variant_id back to NOT NULL if all data is clean and it should be NOT NULL
  // console.log('UP: Optionally altering item_variant_id back to NOT NULL...');
  // await knex.schema.alterTable('purchase_order_items', async function(table) {
  //   await table.integer('item_variant_id').notNullable().alter();
  // });
  // console.log('UP: Optionally altered item_variant_id back to NOT NULL.');
  console.log('Migration 20250520143733 up complete.');
};

// Keep your simplified exports.down function for now for testing
exports.down = async function(knex) {
  console.log('<<<<< EXECUTION REACHED DOWN FUNCTION OF 20250520143733 MIGRATION >>>>>');
  try {
    console.log('<<<<< INSIDE TRY BLOCK OF 20250520143733 DOWN FUNCTION >>>>>');
    console.log('<<<<< END OF TRY BLOCK (BEFORE ANY DB OPS) 20250520143733 DOWN FUNCTION >>>>>');
  } catch (err) {
    console.error('<<<<< CATCH BLOCK ERROR IN 20250520143733 DOWN FUNCTION >>>>>', err);
    throw err;
  }
  console.log('<<<<< END OF 20250520143733 DOWN FUNCTION >>>>>');
};