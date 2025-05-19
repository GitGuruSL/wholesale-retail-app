// filepath: <timestamp>_add_is_base_unit_to_item_units_table.js
exports.up = function(knex) {
  return knex.schema.table('item_units', function(table) {
    table.boolean('is_base_unit').defaultTo(false).notNullable();
    // Optional: Add an index if you often query for the base unit directly
    // table.index(['item_id', 'is_base_unit']);
    // Optional: If you want to ensure only one unit per item can be the base unit,
    // you might need a more complex constraint or handle it at the application level,
    // as a simple unique constraint on ('item_id', 'is_base_unit') wouldn't work directly
    // for boolean true values without filtering.
  });
};

exports.down = function(knex) {
  return knex.schema.table('item_units', function(table) {
    table.dropColumn('is_base_unit');
  });
};