    // backend/db/migrations/YYYYMMDDHHMMSS_create_product_units_table.js

    /**
     * @param { import("knex").Knex } knex
     * @returns { Promise<void> }
     */
    exports.up = function(knex) {
        return knex.schema.createTable('product_units', function(table) {
          table.increments('id').primary();
  
          // Foreign key to the product
          table.integer('product_id').unsigned().notNullable()
            .references('id').inTable('products')
            .onDelete('CASCADE') // If product is deleted, delete these unit definitions
            .onUpdate('CASCADE');
  
          // Foreign key to the unit being defined for this product (e.g., 'Box', 'Pack')
          table.integer('unit_id').unsigned().notNullable()
            .references('id').inTable('units')
            .onDelete('RESTRICT') // Don't delete a unit if it's used here
            .onUpdate('CASCADE');
  
          // Foreign key to the product's base unit (e.g., 'Piece')
          // This clarifies what the conversion factor relates to.
          // It should match the product's base_unit_id but stored here for direct reference.
          table.integer('base_unit_id').unsigned().notNullable()
             .references('id').inTable('units')
             .onDelete('RESTRICT') // Don't delete the base unit if used here
             .onUpdate('CASCADE');
  
          // The conversion factor specific to this product and unit
          // e.g., How many base_unit_id units are in one unit_id unit FOR THIS product_id
          table.decimal('conversion_factor', 12, 4).notNullable();
  
          // Flags indicating usability
          table.boolean('is_purchase_unit').defaultTo(false);
          table.boolean('is_sales_unit').defaultTo(false);
  
          // Optional: Pricing specific to this unit for this product
          // table.decimal('purchase_price', 12, 2).nullable();
          // table.decimal('sales_price', 12, 2).nullable();
  
          table.timestamps(true, true); // created_at, updated_at
  
          // Ensure a product cannot have the same unit defined twice
          table.unique(['product_id', 'unit_id']);
  
          // Index columns used for lookups
          table.index('product_id');
          table.index('unit_id');
          table.index('base_unit_id');
        });
      };
  
      /**
       * @param { import("knex").Knex } knex
       * @returns { Promise<void> }
       */
      exports.down = function(knex) {
        return knex.schema.dropTableIfExists('product_units');
      };
      