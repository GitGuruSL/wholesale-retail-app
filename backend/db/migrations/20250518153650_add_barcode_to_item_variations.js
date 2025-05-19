// Example migration file: <timestamp>_add_barcode_to_item_variations.js
exports.up = function(knex) {
  return knex.schema.table('item_variations', function(table) {
    table.string('barcode').nullable(); // Or notNullable() if always required
    // You might want to add a unique constraint if barcodes must be unique across variations
    // table.unique(['barcode']);
  });
};

exports.down = function(knex) {
  return knex.schema.table('item_variations', function(table) {
    table.dropColumn('barcode');
  });
};