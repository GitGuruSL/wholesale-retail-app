// Example migration file: <timestamp>_add_is_active_to_items.js
exports.up = function(knex) {
  return knex.schema.table('items', function(table) {
    table.boolean('is_active').defaultTo(true).notNullable(); // Or allow nulls if appropriate
  });
};

exports.down = function(knex) {
  return knex.schema.table('items', function(table) {
    table.dropColumn('is_active');
  });
};