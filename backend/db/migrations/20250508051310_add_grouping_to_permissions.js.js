exports.up = function(knex) {
    return knex.schema.table('permissions', function(table) {
      table.integer('permission_category_id').unsigned().nullable()
           .comment('Foreign key to permission_categories table for top-level grouping.');
      table.foreign('permission_category_id')
           .references('id')
           .inTable('permission_categories')
           .onDelete('SET NULL'); // Or 'CASCADE' if a permission must belong to a category
  
      table.string('sub_group_key', 50).nullable()
           .comment('A key for the sub-group this permission belongs to (e.g., user, role, product_core).');
      table.string('sub_group_display_name', 100).nullable()
           .comment('The display name for the sub-group (e.g., User Management, Role Management).');
    });
  };
  
  exports.down = function(knex) {
    return knex.schema.table('permissions', function(table) {
      // Drop foreign key constraint first if it exists by name (Knex default name or custom)
      // Knex default: permissions_permission_category_id_foreign
      // You might need to check your DB for the exact constraint name if it's custom.
      if (knex.client.config.client === 'sqlite3') {
          // SQLite doesn't easily support dropping foreign keys by name in this way through alter table
          // Often requires table recreation for complex schema changes.
          // For simplicity here, we'll just drop the column.
          // In a real scenario with SQLite, you might use `sql` blocks for more control.
      } else {
          table.dropForeign('permission_category_id');
      }
      table.dropColumn('permission_category_id');
      table.dropColumn('sub_group_key');
      table.dropColumn('sub_group_display_name');
    });
  };