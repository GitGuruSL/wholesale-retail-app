// filepath: d:\Development\wholesale-retail-app\backend\db\migrations\20250521051736_add_price_to_variations_and_stock_link.js
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // 1. Add price and barcode columns to item_variations
    await knex.schema.alterTable('item_variations', async function(table) {
        const hasRetailPrice = await knex.schema.hasColumn('item_variations', 'retail_price');
        if (!hasRetailPrice) {
            table.decimal('retail_price', 12, 2).nullable().comment('Retail price for this specific variation.');
        }

        const hasWholesalePrice = await knex.schema.hasColumn('item_variations', 'wholesale_price');
        if (!hasWholesalePrice) {
            table.decimal('wholesale_price', 12, 2).nullable().comment('Wholesale price for this specific variation.');
        }

        const hasBarcode = await knex.schema.hasColumn('item_variations', 'barcode');
        if (!hasBarcode) {
            table.string('barcode').nullable().comment('Barcode specific to this variation.');
            table.index('barcode', 'idx_item_variations_barcode');
        }
    });

    // 2. Modify the 'stock' table
    await knex.schema.alterTable('stock', async function(table) {
        const hasItemVariationId = await knex.schema.hasColumn('stock', 'item_variation_id');
        if (!hasItemVariationId) {
            table.integer('item_variation_id').unsigned().nullable().references('id').inTable('item_variations').onDelete('CASCADE').onUpdate('CASCADE');
            table.index('item_variation_id', 'idx_stock_item_variation_id');
        }
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Revert changes to 'stock' table first
    await knex.schema.alterTable('stock', async function(table) {
        const hasItemVariationId = await knex.schema.hasColumn('stock', 'item_variation_id');
        if (hasItemVariationId) {
            try {
                await table.dropForeign(['item_variation_id']);
            } catch (e) {
                console.warn("Could not drop FK for item_variation_id. Error:", e.message);
            }
            try {
                await table.dropIndex([], 'idx_stock_item_variation_id');
            } catch (e) {
                console.warn("Could not drop index idx_stock_item_variation_id. Error:", e.message);
            }
            await table.dropColumn('item_variation_id');
        }
    });

    // Revert changes to 'item_variations' table
    await knex.schema.alterTable('item_variations', async function(table) {
        const hasBarcode = await knex.schema.hasColumn('item_variations', 'barcode');
        if (hasBarcode) {
            try {
                await table.dropIndex([], 'idx_item_variations_barcode');
            } catch (e) {
                console.warn("Could not drop index idx_item_variations_barcode. Error:", e.message);
            }
            // Not dropping barcode column itself as it likely pre-existed
        }

        const hasWholesalePrice = await knex.schema.hasColumn('item_variations', 'wholesale_price');
        if (hasWholesalePrice) {
            await table.dropColumn('wholesale_price');
        }

        const hasRetailPrice = await knex.schema.hasColumn('item_variations', 'retail_price');
        if (hasRetailPrice) {
            await table.dropColumn('retail_price');
        }
    });
};