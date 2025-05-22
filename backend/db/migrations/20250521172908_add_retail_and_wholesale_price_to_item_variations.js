exports.up = async function(knex) {
  await knex.schema.alterTable('item_variations', async function(table) { 
    console.log('UP: Attempting to add retail_price to item_variations (no hasColumn check)');
    table.decimal('retail_price', 12, 2).nullable(); 
    
    console.log('UP: Attempting to add wholesale_price to item_variations (no hasColumn check)');
    table.decimal('wholesale_price', 12, 2).nullable(); 
  });
  console.log('UP: Finished attempting to add price columns to item_variations.');
};

exports.down = async function(knex) {
  console.log('DOWN: Starting for 20250521172908_add_retail_and_wholesale_price_to_item_variations.js');
  try {
    const hasRetail = await knex.schema.hasColumn('item_variations', 'retail_price');
    console.log('DOWN: Has retail_price:', hasRetail);

    const hasWholesale = await knex.schema.hasColumn('item_variations', 'wholesale_price');
    console.log('DOWN: Has wholesale_price:', hasWholesale);

    if (hasRetail || hasWholesale) {
      console.log('DOWN: One or more columns exist, proceeding to alterTable.');
      await knex.schema.alterTable('item_variations', function(table) { // No need for async here if only dropping
        console.log('DOWN: Inside alterTable callback.');
        if (hasRetail) {
          console.log('DOWN: Dropping retail_price from item_variations');
          table.dropColumn('retail_price');
          console.log('DOWN: Queued drop retail_price.');
        }
        if (hasWholesale) {
          console.log('DOWN: Dropping wholesale_price from item_variations');
          table.dropColumn('wholesale_price');
          console.log('DOWN: Queued drop wholesale_price.');
        }
        console.log('DOWN: Exiting alterTable callback.');
      });
      console.log('DOWN: Finished alterTable operations.');
    } else {
      console.log('DOWN: Neither retail_price nor wholesale_price exist. Skipping alterTable.');
    }
  } catch (err) {
    console.error('DOWN: Error during function of 20250521172908:', err);
    throw err; // Re-throw to ensure Knex knows it failed
  }
  console.log('DOWN: Successfully completed for 20250521172908_add_retail_and_wholesale_price_to_item_variations.js');
};