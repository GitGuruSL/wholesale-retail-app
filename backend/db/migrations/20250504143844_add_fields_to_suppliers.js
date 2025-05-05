    // backend/db/migrations/YYYYMMDDHHMMSS_add_fields_to_suppliers.js

    /**
     * @param { import("knex").Knex } knex
     * @returns { Promise<void> }
     */
    exports.up = function(knex) {
        return knex.schema.alterTable('suppliers', function(table) {
          // Add new fields based on the screenshot
  
          // Section 1
          table.string('code').unique().nullable().after('id'); // Unique supplier code
          table.string('city').nullable().after('address');
  
          // Section 2 (Contact Information)
          table.string('contact_person').nullable().after('city'); // Specific contact person
          table.string('telephone').nullable().after('contact_person'); // Phone number
          table.string('fax').nullable().after('telephone');
          table.string('email').nullable().after('fax'); // Consider adding .unique() if emails must be unique
  
          // Section 3 (Office Use)
          table.date('since_date').nullable().after('email'); // Date relationship started
          table.integer('main_category_id').unsigned().nullable().after('since_date')
              .references('id').inTable('categories') // Foreign key to categories table
              .onDelete('SET NULL') // If category deleted, set this to null
              .onUpdate('CASCADE');
          table.string('tax_invoice_details').nullable().after('main_category_id'); // Tax info
          table.decimal('default_discount_percent', 5, 2).nullable().defaultTo(0.00).after('tax_invoice_details'); // e.g., 10.50%
          table.decimal('credit_limit', 14, 2).nullable().defaultTo(0.00).after('default_discount_percent');
          table.integer('credit_days').unsigned().nullable().defaultTo(0).after('credit_limit');
          table.boolean('is_default_supplier').defaultTo(false).after('credit_days');
  
          // Modify existing 'contact_info' - maybe make it nullable or drop if replaced
          // For now, let's make it nullable if it wasn't already
          table.text('contact_info').nullable().alter();
          table.text('address').nullable().alter(); // Ensure address is nullable too
  
          // Add index for foreign key
          table.index('main_category_id');
        });
      };
  
      /**
       * @param { import("knex").Knex } knex
       * @returns { Promise<void> }
       */
      exports.down = function(knex) {
        // Drop the columns in reverse order of addition (or use hasColumn checks)
        return knex.schema.alterTable('suppliers', function(table) {
          // Drop FK constraint first
          // You might need the specific constraint name if not default
          // table.dropForeign('main_category_id');
  
          table.dropColumn('is_default_supplier');
          table.dropColumn('credit_days');
          table.dropColumn('credit_limit');
          table.dropColumn('default_discount_percent');
          table.dropColumn('tax_invoice_details');
          table.dropColumn('main_category_id'); // Drop column after FK
          table.dropColumn('since_date');
          table.dropColumn('email');
          table.dropColumn('fax');
          table.dropColumn('telephone');
          table.dropColumn('contact_person');
          table.dropColumn('city');
          table.dropColumn('code');
  
          // Optionally revert changes to existing columns (e.g., make contact_info notNullable again if needed)
          // table.text('contact_info').notNullable().alter();
        });
      };
      