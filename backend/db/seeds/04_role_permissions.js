exports.seed = async function(knex) {
  // --- Define Role IDs (ensure these match your 01_roles.js seed file) ---
  const ROLES = {
    GLOBAL_ADMIN: 1,
    STORE_ADMIN: 2,
    SALES_PERSON: 3,
    // Add other roles if you have them, e.g., INVENTORY_MANAGER: 4
  };

  // --- Fetch all defined permission names and map them to their IDs ---
  // This makes assignments more readable and less prone to ID errors.
  const allPermissionsFromDB = await knex('permissions').select('id', 'name');
  const permissionsMap = allPermissionsFromDB.reduce((map, p) => {
    map[p.name] = p.id;
    return map;
  }, {});

  const assignments = [];

  // --- 1. GLOBAL_ADMIN: Assign ALL permissions ---
  // The GLOBAL_ADMIN should have every permission defined in the permissionsMap.
  for (const permissionName in permissionsMap) {
    if (Object.prototype.hasOwnProperty.call(permissionsMap, permissionName)) {
      assignments.push({
        role_id: ROLES.GLOBAL_ADMIN,
        permission_id: permissionsMap[permissionName]
      });
    }
  }
  console.log(`Prepared ${Object.keys(permissionsMap).length} assignments for GLOBAL_ADMIN.`);


  // --- 2. STORE_ADMIN: Define specific permissions ---
  // Example: A Store Admin can manage Items, inventory, and sales for their store,
  // view users in their store, and manage store-specific settings.
  const storeAdminPermissions = [
    'user:read_self', 'user:update_self', // Manage own profile
    // 'user:read_store_users', // Custom permission if you want them to see users only in their store
    'Item:create', 'Item:read', 'Item:update', 'Item:delete',
    'category:create', 'category:read', 'category:update', 'category:delete',
    'subcategory:create', 'subcategory:read', 'subcategory:update', 'subcategory:delete',
    'brand:create', 'brand:read', 'brand:update', 'brand:delete',
    'specialcategory:create', 'specialcategory:read', 'specialcategory:update', 'specialcategory:delete',
    'Item_attribute:create', 'Item_attribute:read', 'Item_attribute:update', 'Item_attribute:delete',
    'tax_type:create', 'tax_type:read', 'tax_type:update', 'tax_type:delete',
    'tax:create', 'tax:read', 'tax:update', 'tax:delete', 'tax:manage',
    'Item_settings:read',
    'unit:create', 'unit:read', 'unit:update', 'unit:delete',
    'manufacturer:create', 'manufacturer:read', 'manufacturer:update', 'manufacturer:delete',
    'warranty:create', 'warranty:read', 'warranty:update', 'warranty:delete',
    'barcode_symbology:create', 'barcode_symbology:read', 'barcode_symbology:update', 'barcode_symbology:delete',
    'discount_type:create', 'discount_type:read', 'discount_type:update', 'discount_type:delete',
    'inventory:read', 'inventory:update',
    'sale:create', 'sale:read', // 'sale:update' might be too broad, consider specific return/exchange perms
    'supplier:read', 'supplier:create', 'supplier:update', // Maybe not delete
    'report:read_sales', 'report:read_inventory', // Reports relevant to their store
    'store_settings:read', 'store_settings:update', // Manage settings for their own store
  ];

  storeAdminPermissions.forEach(permissionName => {
    if (permissionsMap[permissionName]) {
      assignments.push({
        role_id: ROLES.STORE_ADMIN,
        permission_id: permissionsMap[permissionName]
      });
    } else {
      console.warn(`Warning: Permission '${permissionName}' for STORE_ADMIN not found in permissionsMap.`);
    }
  });
  console.log(`Prepared ${storeAdminPermissions.length} potential assignments for STORE_ADMIN.`);


  // --- 3. SALES_PERSON: Define specific permissions ---
  // Example: A Sales Person can view Items, create sales, and view their own sales history.
  const salesPersonPermissions = [
    'user:read_self', 'user:update_self',
    'Item:read', // To see Item details
    'category:read', // To browse categories
    'subcategory:read',
    'brand:read',
    'inventory:read', // To check stock
    'sale:create',    // To make sales
    'sale:read',      // To view their own sales history (needs filtering in API)
  ];

  salesPersonPermissions.forEach(permissionName => {
    if (permissionsMap[permissionName]) {
      assignments.push({
        role_id: ROLES.SALES_PERSON,
        permission_id: permissionsMap[permissionName]
      });
    } else {
      console.warn(`Warning: Permission '${permissionName}' for SALES_PERSON not found in permissionsMap.`);
    }
  });
  console.log(`Prepared ${salesPersonPermissions.length} potential assignments for SALES_PERSON.`);

  // --- Actual database operations ---
  if (assignments.length > 0) {
    try {
      // Deletes ALL existing entries from the role_permissions table first
      await knex('role_permissions').truncate();
      console.log('Successfully truncated role_permissions table.');

      // Inserts seed entries
      await knex('role_permissions').insert(assignments);
      console.log(`Successfully seeded ${assignments.length} role-permission assignments.`);
    } catch (error) {
      console.error('Error seeding role_permissions:', error);
    }
  } else {
    console.log('No role-permission assignments defined to seed. This might be an error if permissionsMap was empty.');
  }
};