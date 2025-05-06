// Replace YYYYMMDDHHMMSS with the actual timestamp in your filename

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('employees', (table) => {
      table.increments('id').primary(); // Standard auto-incrementing primary key
  
      // === Employee Information ===
      table.string('employee_code').notNullable().unique(); // Now required and unique
      table.string('first_name').notNullable();
      table.string('last_name').notNullable(); // Only one last_name column needed
      table.string('email').notNullable().unique(); // Employee's primary email
      table.string('phone').notNullable(); // Renamed from Contact Number
      table.date('date_of_birth').notNullable();
      table.string('gender').notNullable();
      table.string('nationality').notNullable();
      table.string('religion').notNullable();
      table.date('hire_date').notNullable(); // Renamed from Joining Date
      table.string('shift').notNullable();
      table.string('department').notNullable();
      table.string('designation').notNullable();
      table.string('blood_group').notNullable();
      table.text('about').nullable();
      table.string('image_url').nullable(); // For the profile image
      table.string('status').notNullable().defaultTo('active'); // e.g., 'active', 'inactive'
  
      // === Address Information ===
      table.string('address_line1').nullable();
      table.string('country').nullable();
      table.string('state').nullable();
      table.string('city').nullable();
      table.string('zipcode').nullable();
  
      // === Emergency Information ===
      table.string('emergency_contact1_name').nullable();
      table.string('emergency_contact1_relation').nullable();
      table.string('emergency_contact1_phone').nullable();
      table.string('emergency_contact2_name').nullable();
      table.string('emergency_contact2_relation').nullable();
      table.string('emergency_contact2_phone').nullable();
  
      // === Bank Information ===
      table.string('bank_name').nullable();
      table.string('bank_account_number').nullable(); // Store as string for flexibility
      table.string('bank_ifsc_code').nullable();
      table.string('bank_branch').nullable();
  
      // === Timestamps ===
      table.timestamps(true, true); // Adds created_at and updated_at
  
      // Note: Password fields are intentionally omitted. They belong in the 'users' table.
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('employees');
  };