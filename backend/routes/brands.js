// backend/routes/brands.js
const express = require('express');

/**
 * Creates router for handling brand-related API requests.
 * @param {import("knex").Knex} knex - Knex instance.
 * @returns {express.Router} Express router instance.
 */
function createBrandsRouter(knex) {
    const router = express.Router();

    // --- Helper: Check for Product dependencies ---
    const hasProducts = async (brandId) => {
        const countResult = await knex('products')
                                .where({ brand_id: brandId })
                                .count('id as count')
                                .first();
        return countResult && countResult.count > 0;
    };

    // GET /api/brands - Fetch all brands
    router.get('/', async (req, res) => {
        try {
            const brands = await knex('brands')
                                 .select('id', 'name', 'description') // Include description
                                 .orderBy('name');
            res.status(200).json(brands);
        } catch (err) {
            console.error("Error fetching brands:", err);
            res.status(500).json({ message: 'Database error fetching brands.', error: err.message });
        }
    });

    // GET /api/brands/:id - Fetch a single brand by ID
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid brand ID.' });
        }
        try {
            const brand = await knex('brands').where({ id: parseInt(id) }).first();
            if (!brand) {
                return res.status(404).json({ message: `Brand with ID ${id} not found.` });
            }
            res.status(200).json(brand);
        } catch (err) {
            console.error(`Error fetching brand ${id}:`, err);
            res.status(500).json({ message: 'Database error fetching brand details.', error: err.message });
        }
    });


    // POST /api/brands - Create a new brand
    router.post('/', async (req, res) => {
        const { name, description } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Brand name is required.' });
        }

        const newBrand = {
            name: name.trim(),
            description: typeof description === 'string' ? (description.trim() || null) : null,
             // created_at/updated_at handled by DB defaults
        };

        try {
            const [insertedBrand] = await knex('brands').insert(newBrand).returning('*');
            res.status(201).json(insertedBrand);
        } catch (err) {
            // Handle potential unique constraint violation on 'name'
            if (err.code === '23505') {
                return res.status(409).json({ message: `Conflict: Brand name "${newBrand.name}" already exists.`, error: err.detail });
            }
            console.error("Error creating brand:", err);
            res.status(500).json({ message: 'Database error creating brand.', error: err.message });
        }
    });

    // PUT /api/brands/:id - Update an existing brand
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { name, description } = req.body;

         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid brand ID.' });
        }

        const brandUpdates = {
            updated_at: new Date()
        };

        if (name !== undefined) {
            if (typeof name !== 'string' || name.trim() === '') {
                 return res.status(400).json({ message: 'Brand name must be a non-empty string.' });
            }
            brandUpdates.name = name.trim();
        }

        if (description !== undefined) {
             brandUpdates.description = typeof description === 'string' ? (description.trim() || null) : null;
        }

         if (Object.keys(brandUpdates).length <= 1) {
             const currentBrand = await knex('brands').where({ id: parseInt(id) }).first();
              if (!currentBrand) return res.status(404).json({ message: `Brand with ID ${id} not found.` });
              return res.status(200).json(currentBrand);
         }


        try {
            const count = await knex('brands').where({ id: parseInt(id) }).update(brandUpdates);

            if (count === 0) {
                const exists = await knex('brands').where({ id: parseInt(id) }).first();
                if (!exists) {
                    return res.status(404).json({ message: `Brand with ID ${id} not found.` });
                } else {
                    console.warn(`Brand ${id} existed but update resulted in 0 rows affected.`);
                    res.status(200).json(exists);
                    return;
                }
            }

            const updatedBrand = await knex('brands').where({ id: parseInt(id) }).first();
            res.status(200).json(updatedBrand);

        } catch (err) {
            if (err.code === '23505' && brandUpdates.name) {
                return res.status(409).json({ message: `Conflict: Brand name "${brandUpdates.name}" already exists.`, error: err.detail });
            }
            console.error(`Error updating brand ${id}:`, err);
            res.status(500).json({ message: 'Database error updating brand.', error: err.message });
        }
    });

    // DELETE /api/brands/:id - Delete a brand
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
         if (isNaN(parseInt(id))) {
             return res.status(400).json({ message: 'Invalid brand ID.' });
        }

        try {
            // Check for dependencies (products using this brand)
            const brandHasProducts = await hasProducts(parseInt(id));
             if (brandHasProducts) {
                return res.status(409).json({ message: 'Conflict: Cannot delete brand because it has associated products.' });
            }

            // Proceed with deletion
            const count = await knex('brands').where({ id: parseInt(id) }).del();

            if (count === 0) {
                return res.status(404).json({ message: `Brand with ID ${id} not found.` });
            }

            res.status(204).send(); // Success

        } catch (err) {
             if (err.code === '23503') { // Fallback FK check
                 console.warn(`Attempted to delete brand ${id} with existing references (FK violation).`);
                 return res.status(409).json({ message: 'Conflict: Cannot delete brand due to existing references.', error: err.detail });
             }
            console.error(`Error deleting brand ${id}:`, err);
            res.status(500).json({ message: 'Database error deleting brand.', error: err.message });
        }
    });

    return router;
}
module.exports = createBrandsRouter;
