exports.up = function(knex) {
  return knex.schema.alterTable('goods_receipt_items', function(table) {
    table.integer('free_quantity_received').notNullable().defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('goods_receipt_items', function(table) {
    table.dropColumn('free_quantity_received');
  });
};