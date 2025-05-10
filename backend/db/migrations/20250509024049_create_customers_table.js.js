exports.up = function(knex) {
    return knex.schema.createTable('customers', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.text('contact_info');
        table.string('address');
        table.string('city');
        table.string('contact_person');
        table.string('telephone');
        table.string('fax');
        table.string('email').unique();
        table.date('since_date');
        table.text('tax_invoice_details');
        table.decimal('default_discount_percent', 5, 2);
        table.decimal('credit_limit', 10, 2);
        table.integer('credit_days');
        table.boolean('active').defaultTo(true);
        table.timestamps(true, true);
    });
};

exports.down = function(knex) {
    return knex.schema.dropTable('customers');
};