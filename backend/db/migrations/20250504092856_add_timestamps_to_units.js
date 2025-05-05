    // backend/db/migrations/YYYYMMDDHHMMSS_add_timestamps_to_units.js

    /**
     * @param { import("knex").Knex } knex
     * @returns { Promise<void> }
     */
    exports.up = function(knex) {
        // Add created_at and updated_at columns to the units table
        return knex.schema.alterTable('units', function(table) {
          // Adds created_at and updated_at columns
          // Sets default to current timestamp and automatically updates updated_at on changes
          table.timestamps(true, true);
        });
      };
  
      /**
       * @param { import("knex").Knex } knex
       * @returns { Promise<void> }
       */
      exports.down = function(knex) {
        // Remove the created_at and updated_at columns if rolling back
        return knex.schema.alterTable('units', function(table) {
          table.dropTimestamps();
        });
      };
      