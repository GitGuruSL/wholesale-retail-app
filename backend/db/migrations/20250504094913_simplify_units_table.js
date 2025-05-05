    // backend/db/migrations/YYYYMMDDHHMMSS_simplify_units_table.js

    /**
     * @param { import("knex").Knex } knex
     * @returns { Promise<void> }
     */
    exports.up = function(knex) {
        return knex.schema.alterTable('units', function(table) {
          // Drop the foreign key constraint first if it exists
          // The constraint name might vary, check your DB or initial migration if needed
          // Common default name pattern: units_base_unit_id_foreign
          // Use .hasColumn first to avoid errors if run multiple times or column missing
          return knex.schema.hasColumn('units', 'base_unit_id').then(exists => {
            if (exists) {
              // You might need to find the specific constraint name if it's not the default
               try {
                   table.dropForeign('base_unit_id'); // Try dropping FK
               } catch (e) {
                   console.warn("Could not drop foreign key 'units_base_unit_id_foreign' automatically. Manual check might be needed if rollback fails.", e.message);
               }
            }
          }).then(() => {
              // Now drop the columns
              if (knex.schema.hasColumn('units', 'base_unit_id')) {
                   table.dropColumn('base_unit_id');
              }
               if (knex.schema.hasColumn('units', 'conversion_factor')) {
                   table.dropColumn('conversion_factor');
              }
               // Optional: Also remove boolean flags if they move to product_units
               // if (knex.schema.hasColumn('units', 'is_sellable')) {
               //    table.dropColumn('is_sellable');
               // }
               // if (knex.schema.hasColumn('units', 'is_purchaseable')) {
               //    table.dropColumn('is_purchaseable');
               // }
          });
        });
      };
  
      /**
       * @param { import("knex").Knex } knex
       * @returns { Promise<void> }
       */
      exports.down = function(knex) {
        // Re-add the columns (might require setting defaults or making nullable temporarily)
        return knex.schema.alterTable('units', function(table) {
          table.integer('base_unit_id').unsigned().nullable(); // Add back as nullable initially
          table.decimal('conversion_factor', 12, 4).notNullable().defaultTo(1); // Add back with default
          // Optional: Add back boolean flags
          // table.boolean('is_sellable').defaultTo(true);
          // table.boolean('is_purchaseable').defaultTo(true);
  
          // Re-add foreign key constraint if needed (might fail if data integrity issues arose)
          // Consider adding this in a separate step or manually if rollback is complex
          // table.foreign('base_unit_id').references('id').inTable('units'); // Or 'base_units' if you had that
        });
      };
      