// Example migration file: <timestamp>_add_enable_stock_management_to_items.js
exports.up = function(knex) {
  return knex.schema.table('items', function(table) {
    table.boolean('enable_stock_management').defaultTo(true); // Or false, or nullable, as per your needs
  });
};

exports.down = function(knex) {
  return knex.schema.table('items', function(table) {
    table.dropColumn('enable_stock_management');
  });
};