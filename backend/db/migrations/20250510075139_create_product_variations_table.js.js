/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('product_variations', function(table) {
    table.increments('id').primary();
    table.integer('product_id').unsigned().notNullable();
    // Assuming your main products table is named 'products' and has an 'id' primary key
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');

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
  return knex.schema.dropTableIfExists('product_variations');
};