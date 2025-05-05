// backend/db/migrations/YYYYMMDDHHMMSS_create_initial_tables.js
// Replace YYYYMMDDHHMMSS with the actual timestamp

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema
      // --- Independent Reference Tables ---
  
      .createTable('stores', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.text('address').nullable();
        table.string('contact_info').nullable();
        table.timestamps(true, true);
      })
  
      .createTable('users', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('email').notNullable().unique();
        table.string('password_hash').notNullable();
        table.string('role').notNullable().defaultTo('sales_person');
        table.timestamps(true, true);
      })
  
      .createTable('suppliers', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.text('contact_info').nullable();
        table.text('address').nullable();
        table.timestamps(true, true);
        table.index('name');
      })
  
      .createTable('manufacturers', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.text('contact_info').nullable();
        table.timestamps(true, true);
        table.index('name');
      })
  
      .createTable('customers', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.string('email').unique().nullable(); // Allow null emails
        table.string('phone').nullable();
        table.text('address').nullable();
        table.timestamps(true, true);
        table.index('name');
        table.index('email');
      })
  
      .createTable('categories', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable().unique();
        table.text('description').nullable();
        table.timestamps(true, true);
      })
  
      .createTable('special_categories', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable().unique();
        table.text('description').nullable();
        table.timestamps(true, true);
      })
  
      .createTable('brands', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable().unique();
        table.text('description').nullable();
        table.timestamps(true, true);
      })
  
      // --- Simplified Units Table ---
      // Stores unit names like 'Piece', 'Box', 'Pack', 'Kg', 'g'
      .createTable('units', function(table) {
          table.increments('id').primary();
          table.string('name').notNullable().unique(); // Unit names must be unique
          // No conversion factor or base_unit_id here anymore
          table.timestamps(true, true); // Add timestamps
      })
  
      .createTable('barcode_symbologies', function(table) {
        table.increments('id').primary();
        table.string('name', 100).notNullable().unique();
        // No timestamps needed if this is static reference data
      })
  
      .createTable('tax_types', function(table) {
        table.increments('id').primary();
        table.string('name', 50).notNullable().unique();
        // No timestamps needed if static
      })
  
      .createTable('discount_types', function(table) {
        table.increments('id').primary();
        table.string('name', 50).notNullable().unique();
         // No timestamps needed if static
      })
  
      .createTable('warranties', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.integer('duration_months').unsigned().nullable();
        table.text('description').nullable();
        table.timestamps(true, true);
      })
  
      // --- Dependent Reference Tables ---
  
      .createTable('sub_categories', function(table) {
        table.increments('id').primary();
        table.string('name', 255).notNullable();
        table.integer('category_id').unsigned().notNullable()
          .references('id').inTable('categories')
          .onDelete('CASCADE')
          .onUpdate('CASCADE');
        table.timestamps(true, true);
        table.index('category_id');
        table.unique(['category_id', 'name']);
      })
  
      .createTable('taxes', function(table) {
        table.increments('id').primary();
        table.string('name', 100).notNullable();
        table.decimal('rate', 10, 4).notNullable();
        table.integer('tax_type_id').unsigned().notNullable()
          .references('id').inTable('tax_types')
          .onDelete('RESTRICT')
          .onUpdate('CASCADE');
        table.timestamps(true, true); // Add timestamps if taxes can change
        table.unique(['name', 'tax_type_id']);
        table.index('tax_type_id');
      })
  
      // --- Core Product Table ---
      // References the simplified 'units' table for its base unit
      .createTable('products', function(table) {
        table.increments('id').primary();
  
        // Product Information
        table.string('product_name').notNullable();
        table.string('slug').unique().nullable(); // Now nullable
        table.string('sku').unique().nullable(); // Now nullable
        table.string('selling_type').nullable();
        table.integer('category_id').unsigned().notNullable()
          .references('id').inTable('categories')
          .onDelete('RESTRICT').onUpdate('CASCADE');
        table.integer('sub_category_id').unsigned().nullable()
          .references('id').inTable('sub_categories')
          .onDelete('SET NULL').onUpdate('CASCADE');
        table.integer('special_category_id').unsigned().nullable()
          .references('id').inTable('special_categories')
          .onDelete('SET NULL').onUpdate('CASCADE');
        table.string('inventory_type').notNullable().defaultTo('Inventory');
        table.integer('brand_id').unsigned().nullable()
          .references('id').inTable('brands')
          .onDelete('SET NULL').onUpdate('CASCADE');
  
        // *** IMPORTANT: References the simplified units table ***
        table.integer('base_unit_id').unsigned().notNullable() // The fundamental tracking unit (e.g., reference to 'Piece' in units table)
           .references('id').inTable('units')
           .onDelete('RESTRICT').onUpdate('CASCADE'); // Prevent deleting unit if used as base
  
        table.integer('barcode_symbology_id').unsigned().nullable()
          .references('id').inTable('barcode_symbologies')
          .onDelete('SET NULL').onUpdate('CASCADE');
        table.string('barcode_image_path').nullable();
        table.string('item_barcode').nullable();
        table.text('description').nullable();
  
        // Pricing & Base Stock Info
        table.string('product_type').notNullable().defaultTo('Standard');
        table.decimal('cost_price', 12, 2).defaultTo(0.00);
        table.decimal('retail_price', 12, 2).defaultTo(0.00);
        table.integer('tax_id').unsigned().nullable()
          .references('id').inTable('taxes')
          .onDelete('SET NULL').onUpdate('CASCADE');
        table.integer('discount_type_id').unsigned().nullable()
          .references('id').inTable('discount_types')
          .onDelete('SET NULL').onUpdate('CASCADE');
        table.decimal('discount_value', 10, 2).nullable();
        table.string('measurement_type').nullable();
        table.string('measurement_value').nullable();
  
        // Custom Fields / Attributes
        table.decimal('weight', 10, 3).nullable();
        table.integer('manufacturer_id').unsigned().nullable()
          .references('id').inTable('manufacturers')
          .onDelete('SET NULL').onUpdate('CASCADE');
        table.boolean('has_expiry').defaultTo(false);
  
        // Warranty
        table.integer('warranty_id').unsigned().nullable()
          .references('id').inTable('warranties')
          .onDelete('SET NULL').onUpdate('CASCADE');
        table.integer('expiry_notification_days').unsigned().nullable();
  
        // Other
        table.boolean('is_serialized').defaultTo(false);
        table.integer('supplier_id').unsigned().nullable()
          .references('id').inTable('suppliers')
          .onDelete('SET NULL').onUpdate('CASCADE');
  
        table.timestamps(true, true);
  
        // Indexes
        table.index('product_name');
        table.index('sku');
        table.index('slug');
        table.index('category_id');
        table.index('sub_category_id');
        table.index('brand_id');
        table.index('base_unit_id'); // Index the base unit FK
        table.index('tax_id');
        table.index('manufacturer_id');
        table.index('supplier_id');
      })
  
      // --- Product Images Table ---
      .createTable('product_images', function(table) {
        table.increments('id').primary();
        table.integer('product_id').unsigned().notNullable()
          .references('id').inTable('products')
          .onDelete('CASCADE')
          .onUpdate('CASCADE');
        table.string('image_path').notNullable();
        table.integer('sort_order').defaultTo(0);
        table.timestamps(true, true);
        table.index('product_id');
      });
  
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    // Drop tables in reverse order of creation
    // Need to drop tables that depend on others first
    return knex.schema
      .dropTableIfExists('product_images')
      .dropTableIfExists('products') // Depends on many tables
      .dropTableIfExists('taxes') // Depends on tax_types
      .dropTableIfExists('sub_categories') // Depends on categories
      // Now drop the independent/less dependent tables
      .dropTableIfExists('warranties')
      .dropTableIfExists('discount_types')
      .dropTableIfExists('tax_types')
      .dropTableIfExists('barcode_symbologies')
      .dropTableIfExists('units') // Drop simplified units table
      .dropTableIfExists('brands')
      .dropTableIfExists('special_categories')
      .dropTableIfExists('categories')
      .dropTableIfExists('customers')
      .dropTableIfExists('manufacturers')
      .dropTableIfExists('suppliers')
      .dropTableIfExists('users')
      .dropTableIfExists('stores');
      // Note: The original base_units table is not recreated here as it was removed in the 'up'
  };
  