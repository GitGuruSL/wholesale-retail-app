    // backend/db/migrations/YYYYMMDDHHMMSS_add_fields_to_manufacturers.js

    /**
     * @param { import("knex").Knex } knex
     * @returns { Promise<void> }
     */
    exports.up = function(knex) {
        // Add detailed fields to the manufacturers table, similar to suppliers
        return knex.schema.alterTable('manufacturers', function(table) {
          // Add new fields based on the supplier screenshot structure
  
          // Section 1 (Address Info)
          table.text('address').nullable().after('name');
          table.string('city').nullable().after('address');
  
          // Section 2 (Contact Information)
          table.string('contact_person').nullable().after('city');
          table.string('telephone').nullable().after('contact_person');
          table.string('fax').nullable().after('telephone');
          table.string('email').nullable().after('fax'); // Consider .unique() if needed
  
          // Section 3 (Office Use - Adapt as needed for manufacturers)
          // These might be less relevant for manufacturers than suppliers,
          // but we'll add them for consistency with the request.
          table.date('relationship_start_date').nullable().after('email'); // Renamed from since_date
          // main_category_id might not apply directly to a manufacturer
          // table.integer('main_category_id').unsigned().nullable().references('id').inTable('categories')...
          table.string('tax_details').nullable().after('relationship_start_date'); // Renamed from tax_invoice_details
          // Discount/Credit terms might not apply directly to manufacturers
          // table.decimal('default_discount_percent', 5, 2).nullable().defaultTo(0.00);
          // table.decimal('credit_limit', 14, 2).nullable().defaultTo(0.00);
          // table.integer('credit_days').unsigned().nullable().defaultTo(0);
  
          // Modify existing 'contact_info' - make nullable if it wasn't
          // Or drop it if it's fully replaced by the new fields
          table.text('contact_info').nullable().alter();
        });
      };
  
      /**
       * @param { import("knex").Knex } knex
       * @returns { Promise<void> }
       */
      exports.down = function(knex) {
        // Drop the added columns
        return knex.schema.alterTable('manufacturers', function(table) {
          // Drop columns added in 'up'
          // table.dropColumn('credit_days');
          // table.dropColumn('credit_limit');
          // table.dropColumn('default_discount_percent');
          table.dropColumn('tax_details');
          // table.dropColumn('main_category_id'); // Drop if added
          table.dropColumn('relationship_start_date');
          table.dropColumn('email');
          table.dropColumn('fax');
          table.dropColumn('telephone');
          table.dropColumn('contact_person');
          table.dropColumn('city');
          table.dropColumn('address');
  
          // Optionally revert changes to 'contact_info'
          // table.text('contact_info').notNullable().alter();
        });
      };
      