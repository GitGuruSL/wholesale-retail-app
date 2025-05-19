exports.up = async function(knex) { // Changed to async function
  await knex.schema.createTable('stock', function(table) { // Changed to await
    table.increments('id').primary();
    
    table.integer('store_id').unsigned().notNullable();
    table.foreign('store_id').references('id').inTable('stores').onDelete('CASCADE');

    table.integer('item_id').unsigned().notNullable();
    table.foreign('item_id').references('id').inTable('items').onDelete('CASCADE');

    table.integer('item_variation_id').unsigned().nullable();
    table.foreign('item_variation_id').references('id').inTable('item_variations').onDelete('CASCADE');

    table.decimal('quantity', 12, 4).notNullable().defaultTo(0);
    
    table.timestamps(true, true);

    table.index('store_id');
    table.index('item_id');
    table.index('item_variation_id');
  });

  // Create partial unique indexes using knex.schema.raw() for PostgreSQL
  // For standard items (item_variation_id is NULL)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX stock_store_item_unique_idx
    ON stock (store_id, item_id)
    WHERE item_variation_id IS NULL;
  `);
  
  // For variable items (item_variation_id is NOT NULL)
  await knex.schema.raw(`
    CREATE UNIQUE INDEX stock_store_item_variation_unique_idx
    ON stock (store_id, item_variation_id)
    WHERE item_variation_id IS NOT NULL;
  `);
};

exports.down = async function(knex) { // Changed to async function
  // Drop the raw indexes first if they exist
  await knex.schema.raw('DROP INDEX IF EXISTS stock_store_item_variation_unique_idx;');
  await knex.schema.raw('DROP INDEX IF EXISTS stock_store_item_unique_idx;');
  await knex.schema.dropTableIfExists('stock'); // Changed to await
};