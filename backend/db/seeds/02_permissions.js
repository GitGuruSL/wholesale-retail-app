exports.seed = async function(knex) {
  const permissions = [
    // User Management
    { id: 1, name: 'user:create', description: 'Can create new users' },
    { id: 2, name: 'user:read_all', description: 'Can view all users' },
    { id: 3, name: 'user:read_self', description: 'Can view own user profile' },
    { id: 4, name: 'user:update_all', description: 'Can update any user\'s details' },
    { id: 5, name: 'user:update_self', description: 'Can update own user profile' },
    { id: 6, name: 'user:delete', description: 'Can delete users' },
    { id: 7, name: 'user:assign_roles', description: 'Can assign roles to users' },
    { id: 8, name: 'user:assign_stores', description: 'Can assign users to stores' },

    // Role Management
    { id: 10, name: 'role:create', description: 'Can create new roles' },
    { id: 11, name: 'role:read', description: 'Can view roles and their permissions' },
    { id: 12, name: 'role:update', description: 'Can update roles and assign permissions' },
    { id: 13, name: 'role:delete', description: 'Can delete roles' },

    // Permission Management (Typically read-only for most admins)
    { id: 20, name: 'permission:read', description: 'Can view available system permissions' },

    // Store Management
    { id: 30, name: 'store:create', description: 'Can create new stores' },
    { id: 31, name: 'store:read', description: 'Can view store details' },
    { id: 32, name: 'store:update', description: 'Can update store details' },
    { id: 33, name: 'store:delete', description: 'Can delete stores' },

    // Product Management (Core)
    { id: 40, name: 'product:create', description: 'Can create new products' },
    { id: 41, name: 'product:read', description: 'Can view products' },
    { id: 42, name: 'product:update', description: 'Can update products' },
    { id: 43, name: 'product:delete', description: 'Can delete products' },

    // Product Catalog - Categories
    { id: 50, name: 'category:create', description: 'Can create product categories' },
    { id: 51, name: 'category:read', description: 'Can view product categories' },
    { id: 52, name: 'category:update', description: 'Can update product categories' },
    { id: 53, name: 'category:delete', description: 'Can delete product categories' },

    // Product Catalog - Sub-Categories
    { id: 60, name: 'subcategory:create', description: 'Can create product sub-categories' },
    { id: 61, name: 'subcategory:read', description: 'Can view product sub-categories' },
    { id: 62, name: 'subcategory:update', description: 'Can update product sub-categories' },
    { id: 63, name: 'subcategory:delete', description: 'Can delete product sub-categories' },

    // Product Catalog - Brands
    { id: 70, name: 'brand:create', description: 'Can create product brands' },
    { id: 71, name: 'brand:read', description: 'Can view product brands' },
    { id: 72, name: 'brand:update', description: 'Can update product brands' },
    { id: 73, name: 'brand:delete', description: 'Can delete product brands' },

    // Product Catalog - Special Categories
    { id: 80, name: 'specialcategory:create', description: 'Can create special product categories' },
    { id: 81, name: 'specialcategory:read', description: 'Can view special product categories' },
    { id: 82, name: 'specialcategory:update', description: 'Can update special product categories' },
    { id: 83, name: 'specialcategory:delete', description: 'Can delete special product categories' },

    // Product Attributes - General
    { id: 90, name: 'product_attribute:create', description: 'Can create product attributes' },
    { id: 91, name: 'product_attribute:read', description: 'Can view product attributes' },
    { id: 92, name: 'product_attribute:update', description: 'Can update product attributes' },
    { id: 93, name: 'product_attribute:delete', description: 'Can delete product attributes' },

    // Product Attributes - Tax Types
    { id: 100, name: 'tax_type:create', description: 'Can create tax types' },
    { id: 101, name: 'tax_type:read', description: 'Can view tax types' },
    { id: 102, name: 'tax_type:update', description: 'Can update tax types' },
    { id: 103, name: 'tax_type:delete', description: 'Can delete tax types' },

    // Product Attributes - Taxes
    { id: 110, name: 'tax:create', description: 'Can create taxes' },
    { id: 111, name: 'tax:read', description: 'Can view taxes' },
    { id: 112, name: 'tax:update', description: 'Can update taxes' },
    { id: 113, name: 'tax:delete', description: 'Can delete taxes' },
    { id: 114, name: 'tax:manage', description: 'General permission to manage taxes (can be an alternative to individual CRUD)' },


    // Product Settings - General (for the section header if needed)
    { id: 120, name: 'product_settings:read', description: 'Can access product settings section' },

    // Product Settings - Units
    { id: 121, name: 'unit:create', description: 'Can create product units' },
    { id: 122, name: 'unit:read', description: 'Can view product units' },
    { id: 123, name: 'unit:update', description: 'Can update product units' },
    { id: 124, name: 'unit:delete', description: 'Can delete product units' },

    // Product Settings - Manufacturers
    { id: 130, name: 'manufacturer:create', description: 'Can create manufacturers' },
    { id: 131, name: 'manufacturer:read', description: 'Can view manufacturers' },
    { id: 132, name: 'manufacturer:update', description: 'Can update manufacturers' },
    { id: 133, name: 'manufacturer:delete', description: 'Can delete manufacturers' },

    // Product Settings - Warranties
    { id: 140, name: 'warranty:create', description: 'Can create warranties' },
    { id: 141, name: 'warranty:read', description: 'Can view warranties' },
    { id: 142, name: 'warranty:update', description: 'Can update warranties' },
    { id: 143, name: 'warranty:delete', description: 'Can delete warranties' },

    // Product Settings - Barcode Symbologies
    { id: 150, name: 'barcode_symbology:create', description: 'Can create barcode symbologies' },
    { id: 151, name: 'barcode_symbology:read', description: 'Can view barcode symbologies' },
    { id: 152, name: 'barcode_symbology:update', description: 'Can update barcode symbologies' },
    { id: 153, name: 'barcode_symbology:delete', description: 'Can delete barcode symbologies' },

    // Product Settings - Discount Types
    { id: 160, name: 'discount_type:create', description: 'Can create discount types' },
    { id: 161, name: 'discount_type:read', description: 'Can view discount types' },
    { id: 162, name: 'discount_type:update', description: 'Can update discount types' },
    { id: 163, name: 'discount_type:delete', description: 'Can delete discount types' },

    // Inventory Management
    { id: 170, name: 'inventory:read', description: 'Can view inventory levels' },
    { id: 171, name: 'inventory:update', description: 'Can update inventory levels (e.g., stock adjustments)' },
    // { id: 172, name: 'inventory:manage_transfers', description: 'Can manage inventory transfers between stores/locations' },


    // Sales Management
    { id: 180, name: 'sale:create', description: 'Can create new sales (POS)' },
    { id: 181, name: 'sale:read', description: 'Can view sales records' }, // Could be further refined to own_sales vs all_sales
    { id: 182, name: 'sale:update', description: 'Can update sales records (e.g., returns, modifications - use with caution)' },
    { id: 183, name: 'sale:delete', description: 'Can delete sales records (use with extreme caution)' },

    // Supplier Management
    { id: 190, name: 'supplier:create', description: 'Can create new suppliers' },
    { id: 191, name: 'supplier:read', description: 'Can view suppliers' },
    { id: 192, name: 'supplier:update', description: 'Can update suppliers' },
    { id: 193, name: 'supplier:delete', description: 'Can delete suppliers' },

    // Reports
    { id: 200, name: 'report:read', description: 'General access to the reports section' },
    { id: 201, name: 'report:read_sales', description: 'Can view sales reports' },
    { id: 202, name: 'report:read_inventory', description: 'Can view inventory reports' },
    { id: 203, name: 'report:read_user_activity', description: 'Can view user activity reports' },
    // { id: 204, name: 'report:read_financial', description: 'Can view financial reports' },


    // System Settings
    { id: 210, name: 'system:manage_settings', description: 'Can manage global system settings (e.g., company profile)' },

    // Store Settings (Per-store configuration)
    { id: 220, name: 'store_settings:read', description: 'Can read settings for assigned store(s)' },
    { id: 221, name: 'store_settings:update', description: 'Can update settings for assigned store(s)' },
  ];

  try {
    // Use TRUNCATE ... CASCADE on 'permissions' to handle foreign key constraints.
    // This will also truncate 'role_permissions' if it has foreign keys to 'permissions'.
    // RESTART IDENTITY is important for PostgreSQL to reset the ID sequence.
    await knex.raw('TRUNCATE TABLE permissions RESTART IDENTITY CASCADE');
    console.log('Successfully truncated "permissions" table and dependent tables (like "role_permissions") via CASCADE.');
    
    // The 'role_permissions' table will also be truncated by the CASCADE above.
    // The truncate operation in '03_role_permissions.js' will then run on an already empty table, which is fine.

    // Inserts seed entries for permissions
    await knex('permissions').insert(permissions);
    console.log(`Successfully seeded ${permissions.length} permissions.`);

  } catch (error) {
    console.error('Error seeding permissions:', error);
  }
};