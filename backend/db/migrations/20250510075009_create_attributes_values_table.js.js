// This migration should ONLY create the 'attribute_values' table,
// assuming 'attributes' table was created by '20250510074929_create_attributes_table.js.js'

exports.up = async function(knex) { // UNCOMMENTED THIS LINE and the function body
  await knex.schema.createTable('attribute_values', function(table) {
    table.increments('id').primary();
    table.integer('attribute_id').unsigned().notNullable().references('id').inTable('attributes').onDelete('CASCADE');
    table.string('value').notNullable();
    table.timestamps(true, true);
    table.unique(['attribute_id', 'value']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('attribute_values');
};