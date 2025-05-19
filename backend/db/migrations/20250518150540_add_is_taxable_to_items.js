// Example migration file: <timestamp>_add_is_taxable_to_items.js
exports.up = function(knex) {
  return knex.schema.table('items', function(table) {
    table.boolean('is_taxable').defaultTo(false).notNullable(); // Or true, or allow nulls
  });
};

exports.down = function(knex) {
  return knex.schema.table('items', function(table) {
    table.dropColumn('is_taxable');
  });
};