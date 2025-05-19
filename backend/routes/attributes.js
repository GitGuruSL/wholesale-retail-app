const express = require('express');
const { ROLES } = require('../utils/roles'); // Adjust path as needed
// const { authenticateToken, authorizePermission } = require('../middleware/authMiddleware'); // Assuming you have this

function createAttributesRouter(knex) {
    const router = express.Router();

    // Middleware to check permissions for attribute management
    // This is a simplified example; integrate with your actual auth middleware
    const checkAttributePermission = (permission) => (req, res, next) => {
        // Assuming req.user and req.user.permissions are populated by your auth middleware
        // For now, let's assume a simple role check or pass through if not fully implemented
        if (req.user && req.user.role_name) { // Basic check
            const requiredRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]; // Example roles
            if (permission.includes('read') && (requiredRoles.includes(req.user.role_name) || req.user.role_name === ROLES.STORE_MANAGER || req.user.role_name === ROLES.SALES_PERSON)) {
                return next();
            }
            if ((permission.includes('create') || permission.includes('update') || permission.includes('delete')) && requiredRoles.includes(req.user.role_name)) {
                return next();
            }
            // return res.status(403).json({ message: `Forbidden: You do not have ${permission} permission for attributes.` });
            // For now, allowing if user exists, replace with actual permission check
            console.warn(`[AttributesRoute] Permission check for ${permission} passed without full validation for user ${req.user.id}`);
            return next();

        }
        // If no user or role, deny access (should be caught by authenticateToken earlier)
        // return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
        console.warn(`[AttributesRoute] Bypassing permission check for ${permission} as req.user is not fully populated for this example.`);
        return next(); // Allow for now if auth middleware isn't fully set up here
    };


    // GET /api/attributes - List all attributes with their values
    router.get('/', checkAttributePermission('Item_attribute:read'), async (req, res, next) => {
        try {
            const attributes = await knex('attributes').select('*').orderBy('name', 'asc');
            const attributesWithValues = [];

            for (const attribute of attributes) {
                const values = await knex('attribute_values')
                    .where({ attribute_id: attribute.id })
                    .select('id', 'value')
                    .orderBy('value', 'asc');
                attributesWithValues.push({ ...attribute, values });
            }
            res.status(200).json({ data: attributesWithValues });
        } catch (err) {
            console.error('[AttributesRoute] GET / Error:', err);
            next(err);
        }
    });

    // GET /api/attributes/:id - Get a single attribute by ID with its values
    router.get('/:id', checkAttributePermission('Item_attribute:read'), async (req, res, next) => {
        const { id } = req.params;
        try {
            const attribute = await knex('attributes').where({ id }).first();
            if (!attribute) {
                return res.status(404).json({ message: 'Attribute not found.' });
            }
            const values = await knex('attribute_values').where({ attribute_id: id });
            attribute.values = values; // Attach the values
            res.json(attribute);
        } catch (err) {
            console.error(`[AttributesRoute] GET /${id} Error:`, err);
            next(err);
        }
    });

    // POST /api/attributes - Create a new attribute and its values
    router.post('/', checkAttributePermission('Item_attribute:create'), async (req, res, next) => {
        const { name, values = [] } = req.body; // `values` is an array of strings

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Attribute name is required and must be a non-empty string.' });
        }
        if (!Array.isArray(values) || !values.every(v => typeof v === 'string' && v.trim() !== '')) {
            return res.status(400).json({ message: 'Values must be an array of non-empty strings.' });
        }

        try {
            await knex.transaction(async trx => {
                const existingAttribute = await trx('attributes').whereRaw('LOWER(name) = LOWER(?)', [name.trim()]).first();
                if (existingAttribute) {
                    // Use a specific error code or flag for the frontend to handle this
                    return res.status(409).json({ message: `Attribute with name "${name.trim()}" already exists.`});
                }

                const [newAttribute] = await trx('attributes').insert({ name: name.trim() }).returning('*');

                if (values.length > 0) {
                    const uniqueValues = [...new Set(values.map(v => v.trim()))]; // Ensure unique values
                    const valuesToInsert = uniqueValues.map(value => ({
                        attribute_id: newAttribute.id,
                        value: value
                    }));
                    await trx('attribute_values').insert(valuesToInsert);
                }
                
                // Refetch to include values
                const finalValues = await trx('attribute_values')
                    .where({ attribute_id: newAttribute.id })
                    .select('id', 'value')
                    .orderBy('value', 'asc');

                res.status(201).json({ ...newAttribute, values: finalValues });
            });
        } catch (err) {
            // The transaction should automatically rollback on error
            if (err.message.includes("already exists")) { // Catch the 409 from inside transaction
                 return res.status(409).json({ message: err.message });
            }
            if (err.code === '23505') { // Unique constraint violation (e.g. on attribute name if not caught above)
                return res.status(409).json({ message: `Attribute with name "${name.trim()}" already exists (DB constraint).`, detail: err.detail });
            }
            console.error('[AttributesRoute] POST / Error:', err);
            next(err);
        }
    });

    // PUT /api/attributes/:id - Update an attribute and its values
    router.put('/:id', checkAttributePermission('Item_attribute:update'), async (req, res, next) => {
        const { id } = req.params;
        const { name, values = [] } = req.body; // `values` is an array of strings

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ message: 'Attribute name is required.' });
        }
        if (!Array.isArray(values) || !values.every(v => typeof v === 'string' && v.trim() !== '')) {
            return res.status(400).json({ message: 'Values must be an array of non-empty strings.' });
        }

        try {
            await knex.transaction(async trx => {
                const attribute = await trx('attributes').where({ id }).first();
                if (!attribute) {
                    return res.status(404).json({ message: 'Attribute not found.' });
                }

                // Check if name is being changed to one that already exists (excluding itself)
                if (name.trim().toLowerCase() !== attribute.name.toLowerCase()) {
                    const existingName = await trx('attributes')
                        .whereRaw('LOWER(name) = LOWER(?)', [name.trim()])
                        .whereNot({ id })
                        .first();
                    if (existingName) {
                         return res.status(409).json({ message: `Another attribute with name "${name.trim()}" already exists.`});
                    }
                }
                
                await trx('attributes').where({ id }).update({ name: name.trim(), updated_at: new Date() });

                // Manage attribute values:
                // 1. Get current values from DB
                // 2. Get new values from request (unique and trimmed)
                // 3. Values to add: in new set, not in current DB set
                // 4. Values to delete: in current DB set, not in new set
                const currentDbValues = await trx('attribute_values').where({ attribute_id: id }).select('id', 'value');
                const currentDbValueStrings = currentDbValues.map(v => v.value);
                
                const newRequestValueStrings = [...new Set(values.map(v => v.trim()))];

                const valuesToAdd = newRequestValueStrings.filter(v => !currentDbValueStrings.includes(v));
                const valuesToDelete = currentDbValueStrings.filter(v => !newRequestValueStrings.includes(v));
                
                if (valuesToDelete.length > 0) {
                    // Check if any value to be deleted is currently in use by Item variations
                    const usedValues = await trx('Item_variation_attribute_values as pvav')
                        .join('attribute_values as av', 'pvav.attribute_value_id', 'av.id')
                        .where('av.attribute_id', id)
                        .whereIn('av.value', valuesToDelete)
                        .distinct('av.value')
                        .pluck('av.value');

                    if (usedValues.length > 0) {
                        return res.status(400).json({ 
                            message: `Cannot delete attribute values currently in use by Item variations: ${usedValues.join(', ')}. Please remove them from Items first.`
                        });
                    }
                    await trx('attribute_values').where({ attribute_id: id }).whereIn('value', valuesToDelete).del();
                }

                if (valuesToAdd.length > 0) {
                    const valuesToInsert = valuesToAdd.map(value => ({
                        attribute_id: id,
                        value: value
                    }));
                    await trx('attribute_values').insert(valuesToInsert);
                }
                
                const updatedAttribute = await trx('attributes').where({ id }).first();
                const finalValues = await trx('attribute_values')
                    .where({ attribute_id: id })
                    .select('id', 'value')
                    .orderBy('value', 'asc');

                res.status(200).json({ ...updatedAttribute, values: finalValues });
            });
        } catch (err) {
            if (err.message.includes("already exists") || err.message.includes("Cannot delete attribute values")) {
                 return res.status(err.status || 409).json({ message: err.message });
            }
            if (err.code === '23505') { // Unique constraint violation
                return res.status(409).json({ message: `Attribute name "${name.trim()}" may already exist (DB constraint).`, detail: err.detail });
            }
            console.error(`[AttributesRoute] PUT /${id} Error:`, err);
            next(err);
        }
    });

    // DELETE /api/attributes/:id - Delete an attribute and its values
    router.delete('/:id', checkAttributePermission('Item_attribute:delete'), async (req, res, next) => {
        const { id } = req.params;
        try {
            await knex.transaction(async trx => {
                const attribute = await trx('attributes').where({ id }).first();
                if (!attribute) {
                    return res.status(404).json({ message: 'Attribute not found.' });
                }

                // Check if the attribute (any of its values) is used in Item_variation_attribute_values
                const isInUse = await trx('attribute_values as av')
                    .join('Item_variation_attribute_values as pvav', 'av.id', 'pvav.attribute_value_id')
                    .where('av.attribute_id', id)
                    .first();

                if (isInUse) {
                    return res.status(400).json({ message: 'Cannot delete attribute. It is currently in use by Item variations. Please remove it from Items first.' });
                }

                // If not in use, proceed with deletion
                // Foreign key 'attribute_id' in 'attribute_values' should have ON DELETE CASCADE
                // So, deleting from 'attributes' table will also delete related 'attribute_values'.
                // If not, you'd delete from 'attribute_values' first:
                // await trx('attribute_values').where({ attribute_id: id }).del();
                const deletedCount = await trx('attributes').where({ id }).del();

                if (deletedCount > 0) {
                    res.status(200).json({ message: 'Attribute and its values deleted successfully.' });
                } else {
                    // Should be caught by the 404 above
                    res.status(404).json({ message: 'Attribute not found or already deleted.' });
                }
            });
        } catch (err) {
             if (err.message.includes("Cannot delete attribute")) {
                 return res.status(400).json({ message: err.message });
            }
            console.error(`[AttributesRoute] DELETE /${id} Error:`, err);
            next(err);
        }
    });

    return router;
}

module.exports = createAttributesRouter;