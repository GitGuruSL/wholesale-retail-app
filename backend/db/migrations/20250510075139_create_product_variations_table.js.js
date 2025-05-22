// ... existing code ...
exports.up = async function(knex) {
  await knex.schema.createTable('item_variations', function(table) {
    table.increments('id').primary();
    table.integer('item_id').unsigned().notNullable();
    table.string('sku').unique();
    table.decimal('cost_price', 12, 2);
    table.integer('quantity_on_hand').defaultTo(0);
    table.string('barcode'); // This line creates the barcode column
    table.boolean('is_active').defaultTo(true);
    table.string('variant_name');
    table.timestamps(true, true);

    table.foreign('item_id').references('id').inTable('items').onDelete('CASCADE');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('item_variations');
};
// ... existing code ...