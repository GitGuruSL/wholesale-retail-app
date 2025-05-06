// Replace YYYYMMDDHHMMSS with the actual timestamp in your filename

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('users', (table) => {
      // 1. Add username column (unique, for login)
      table.string('username').nullable().unique(); // Make nullable initially
  
      // 2. Add employee_id column (foreign key to employees table)
      // Make it nullable initially to avoid issues if users table already has rows
      // Also make it unique to ensure one user per employee
      table.integer('employee_id').unsigned().nullable().unique();
  
      // 3. Add the foreign key constraint
      table.foreign('employee_id')
           .references('id')
           .inTable('employees')
           .onDelete('SET NULL') // Or 'CASCADE' if deleting an employee should delete the user
           .onUpdate('CASCADE');
  
      // 4. Drop the old columns
      table.dropColumn('name');
      table.dropColumn('email'); // Also implicitly drops the unique constraint on email
    });
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    // Reverses the changes made in the 'up' function
    return knex.schema.alterTable('users', (table) => {
      // 1. Add back the dropped columns
      // Note: Adding NOT NULL columns back might fail if rows exist.
      // Consider adding as nullable first, populating, then altering if needed.
      table.string('name').notNullable().defaultTo('Unknown'); // Provide default to satisfy NOT NULL
      table.string('email').notNullable().unique().defaultTo(`unknown_${Date.now()}@example.com`); // Provide unique default
  
      // 2. Drop the foreign key constraint
      // Constraint name format might vary slightly depending on DB/Knex version
      // Default format: users_employee_id_foreign
      table.dropForeign('employee_id');
  
      // 3. Drop the employee_id column
      table.dropColumn('employee_id');
  
      // 4. Drop the username column
      table.dropColumn('username'); // Also implicitly drops the unique constraint
    });
  };