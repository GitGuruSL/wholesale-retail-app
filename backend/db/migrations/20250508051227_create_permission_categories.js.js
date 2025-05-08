exports.up = function(knex) {
    return knex.schema.createTable('permission_categories', function(table) {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.integer('display_order').notNullable().defaultTo(0);
      table.timestamps(true, true);
      table.comment('Stores top-level categories for grouping permissions in the UI.');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('permission_categories');
  };