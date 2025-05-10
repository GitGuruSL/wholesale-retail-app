/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('attribute_values', function(table) {
    table.increments('id').primary();
    table.integer('attribute_id').unsigned().notNullable();
    table.foreign('attribute_id').references('id').inTable('attributes').onDelete('CASCADE');
    table.string('value', 255).notNullable();
    table.timestamps(true, true);

    table.unique(['attribute_id', 'value']); // Ensure a value is unique for a given attribute
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('attribute_values');
};