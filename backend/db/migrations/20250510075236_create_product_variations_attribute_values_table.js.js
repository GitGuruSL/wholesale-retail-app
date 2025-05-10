/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('product_variation_attribute_values', function(table) {
    table.integer('product_variation_id').unsigned().notNullable();
    table.foreign('product_variation_id').references('id').inTable('product_variations').onDelete('CASCADE');

    table.integer('attribute_value_id').unsigned().notNullable();
    table.foreign('attribute_value_id').references('id').inTable('attribute_values').onDelete('CASCADE');

    // Composite primary key to ensure each variation has a unique set of attribute values
    // and an attribute value is used only once per variation.
    table.primary(['product_variation_id', 'attribute_value_id']);
    
    table.timestamps(true, true); // Optional: if you want to track when a specific attribute was linked
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('product_variation_attribute_values');
};