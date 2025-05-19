/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('Item_variations', function(table) {
    table.increments('id').primary();
    table.integer('Item_id').unsigned().notNullable();
    // Assuming your main Items table is named 'Items' and has an 'id' primary key
    table.foreign('Item_id').references('id').inTable('Items').onDelete('CASCADE');

    table.string('sku', 255).unique().nullable(); // Variation-specific SKU
    table.decimal('cost_price', 12, 2).nullable();
    table.decimal('retail_price', 12, 2).nullable();
    table.decimal('wholesale_price', 12, 2).nullable();
    // Add other variation-specific fields as needed, e.g.:
    // table.integer('stock_quantity').nullable().defaultTo(0);
    // table.string('image_path', 255).nullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('Item_variations');
};