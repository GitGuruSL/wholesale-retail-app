exports.up = async function(knex) {
  await knex.schema.createTable('item_variation_attribute_values', function(table) {
    table.integer('item_variation_id').unsigned().notNullable();
    table.integer('attribute_value_id').unsigned().notNullable();
    table.timestamps(true, true);

    table.foreign('item_variation_id')
      .references('id')
      .inTable('item_variations') // MUST BE 'item_variations' (lowercase)
      .onDelete('CASCADE');
    table.foreign('attribute_value_id')
      .references('id')
      .inTable('attribute_values')
      .onDelete('CASCADE');

    table.primary(['item_variation_id', 'attribute_value_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('item_variation_attribute_values');
};