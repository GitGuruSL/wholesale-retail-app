exports.seed = async function(knex) {
  const permissions = [
    // User Management
    { id: 1, name: 'user:create', display_name: 'Create Users', description: 'Can create new users' },
    { id: 2, name: 'user:read_all', display_name: 'View All Users', description: 'Can view all users' },
    { id: 3, name: 'user:read_self', display_name: 'View Own Profile', description: 'Can view own user profile' },
    { id: 4, name: 'user:update_all', display_name: 'Update Any User', description: 'Can update any user\'s details' },
    { id: 5, name: 'user:update_self', display_name: 'Update Own Profile', description: 'Can update own user profile' },
    { id: 6, name: 'user:delete', display_name: 'Delete Users', description: 'Can delete users' },
    { id: 7, name: 'user:assign_roles', display_name: 'Assign Roles to Users', description: 'Can assign roles to users' },
    { id: 8, name: 'user:assign_stores', display_name: 'Assign Users to Stores', description: 'Can assign users to stores' },

    // Role Management
    { id: 10, name: 'role:create', display_name: 'Create Roles', description: 'Can create new roles' },
    { id: 11, name: 'role:read', display_name: 'View Roles', description: 'Can view roles and their permissions' },
    { id: 12, name: 'role:update', display_name: 'Update Roles', description: 'Can update roles and assign permissions' },
    { id: 13, name: 'role:delete', display_name: 'Delete Roles', description: 'Can delete roles' },

    // Permission Management
    { id: 20, name: 'permission:read', display_name: 'View Permissions', description: 'Can view available system permissions' },

    // Store Management
    { id: 30, name: 'store:create', display_name: 'Create Stores', description: 'Can create new stores' },
    { id: 31, name: 'store:read', display_name: 'View Stores', description: 'Can view store details' },
    { id: 32, name: 'store:update', display_name: 'Update Stores', description: 'Can update store details' },
    { id: 33, name: 'store:delete', display_name: 'Delete Stores', description: 'Can delete stores' },

    // Product Management (Core)
    { id: 40, name: 'product:create', display_name: 'Create Products', description: 'Can create new products' },
    { id: 41, name: 'product:read', display_name: 'View Products', description: 'Can view products' },
    { id: 42, name: 'product:update', display_name: 'Update Products', description: 'Can update products' },
    { id: 43, name: 'product:delete', display_name: 'Delete Products', description: 'Can delete products' },

    // Product Catalog - Categories
    { id: 50, name: 'category:create', display_name: 'Create Categories', description: 'Can create product categories' },
    { id: 51, name: 'category:read', display_name: 'View Categories', description: 'Can view product categories' },
    { id: 52, name: 'category:update', display_name: 'Update Categories', description: 'Can update product categories' },
    { id: 53, name: 'category:delete', display_name: 'Delete Categories', description: 'Can delete product categories' },

    // Product Catalog - Sub-Categories
    { id: 60, name: 'subcategory:create', display_name: 'Create Sub-Categories', description: 'Can create product sub-categories' },
    { id: 61, name: 'subcategory:read', display_name: 'View Sub-Categories', description: 'Can view product sub-categories' },
    { id: 62, name: 'subcategory:update', display_name: 'Update Sub-Categories', description: 'Can update product sub-categories' },
    { id: 63, name: 'subcategory:delete', display_name: 'Delete Sub-Categories', description: 'Can delete product sub-categories' },

    // Product Catalog - Brands
    { id: 70, name: 'brand:create', display_name: 'Create Brands', description: 'Can create product brands' },
    { id: 71, name: 'brand:read', display_name: 'View Brands', description: 'Can view product brands' },
    { id: 72, name: 'brand:update', display_name: 'Update Brands', description: 'Can update product brands' },
    { id: 73, name: 'brand:delete', display_name: 'Delete Brands', description: 'Can delete product brands' },

    // Product Catalog - Special Categories
    { id: 80, name: 'specialcategory:create', display_name: 'Create Special Categories', description: 'Can create special product categories' },
    { id: 81, name: 'specialcategory:read', display_name: 'View Special Categories', description: 'Can view special product categories' },
    { id: 82, name: 'specialcategory:update', display_name: 'Update Special Categories', description: 'Can update special product categories' },
    { id: 83, name: 'specialcategory:delete', display_name: 'Delete Special Categories', description: 'Can delete special product categories' },

    // Product Attributes - General
    { id: 90, name: 'product_attribute:create', display_name: 'Create Product Attributes', description: 'Can create product attributes' },
    { id: 91, name: 'product_attribute:read', display_name: 'View Product Attributes', description: 'Can view product attributes' },
    { id: 92, name: 'product_attribute:update', display_name: 'Update Product Attributes', description: 'Can update product attributes' },
    { id: 93, name: 'product_attribute:delete', display_name: 'Delete Product Attributes', description: 'Can delete product attributes' },

    // Product Attributes - Tax Types
    { id: 100, name: 'tax_type:create', display_name: 'Create Tax Types', description: 'Can create tax types' },
    { id: 101, name: 'tax_type:read', display_name: 'View Tax Types', description: 'Can view tax types' },
    { id: 102, name: 'tax_type:update', display_name: 'Update Tax Types', description: 'Can update tax types' },
    { id: 103, name: 'tax_type:delete', display_name: 'Delete Tax Types', description: 'Can delete tax types' },

    // Product Attributes - Taxes
    { id: 110, name: 'tax:create', display_name: 'Create Taxes', description: 'Can create taxes' },
    { id: 111, name: 'tax:read', display_name: 'View Taxes', description: 'Can view taxes' },
    { id: 112, name: 'tax:update', display_name: 'Update Taxes', description: 'Can update taxes' },
    { id: 113, name: 'tax:delete', display_name: 'Delete Taxes', description: 'Can delete taxes' },
    { id: 114, name: 'tax:manage', display_name: 'Manage Taxes', description: 'General permission to manage taxes' },

    // Product Settings - General
    { id: 120, name: 'product_settings:read', display_name: 'Access Product Settings', description: 'Can access product settings section' },

    // Product Settings - Units
    { id: 121, name: 'unit:create', display_name: 'Create Units', description: 'Can create product units' },
    { id: 122, name: 'unit:read', display_name: 'View Units', description: 'Can view product units' },
    { id: 123, name: 'unit:update', display_name: 'Update Units', description: 'Can update product units' },
    { id: 124, name: 'unit:delete', display_name: 'Delete Units', description: 'Can delete product units' },

    // Product Settings - Manufacturers
    { id: 130, name: 'manufacturer:create', display_name: 'Create Manufacturers', description: 'Can create manufacturers' },
    { id: 131, name: 'manufacturer:read', display_name: 'View Manufacturers', description: 'Can view manufacturers' },
    { id: 132, name: 'manufacturer:update', display_name: 'Update Manufacturers', description: 'Can update manufacturers' },
    { id: 133, name: 'manufacturer:delete', display_name: 'Delete Manufacturers', description: 'Can delete manufacturers' },

    // Product Settings - Warranties
    { id: 140, name: 'warranty:create', display_name: 'Create Warranties', description: 'Can create warranties' },
    { id: 141, name: 'warranty:read', display_name: 'View Warranties', description: 'Can view warranties' },
    { id: 142, name: 'warranty:update', display_name: 'Update Warranties', description: 'Can update warranties' },
    { id: 143, name: 'warranty:delete', display_name: 'Delete Warranties', description: 'Can delete warranties' },

    // Product Settings - Barcode Symbologies
    { id: 150, name: 'barcode_symbology:create', display_name: 'Create Barcode Symbologies', description: 'Can create barcode symbologies' },
    { id: 151, name: 'barcode_symbology:read', display_name: 'View Barcode Symbologies', description: 'Can view barcode symbologies' },
    { id: 152, name: 'barcode_symbology:update', display_name: 'Update Barcode Symbologies', description: 'Can update barcode symbologies' },
    { id: 153, name: 'barcode_symbology:delete', display_name: 'Delete Barcode Symbologies', description: 'Can delete barcode symbologies' },

    // Product Settings - Discount Types
    { id: 160, name: 'discount_type:create', display_name: 'Create Discount Types', description: 'Can create discount types' },
    { id: 161, name: 'discount_type:read', display_name: 'View Discount Types', description: 'Can view discount types' },
    { id: 162, name: 'discount_type:update', display_name: 'Update Discount Types', description: 'Can update discount types' },
    { id: 163, name: 'discount_type:delete', display_name: 'Delete Discount Types', description: 'Can delete discount types' },

    // Inventory Management
    { id: 170, name: 'inventory:read', display_name: 'View Inventory', description: 'Can view inventory levels' },
    { id: 171, name: 'inventory:update', display_name: 'Update Inventory', description: 'Can update inventory levels (e.g., stock adjustments)' },
    // { id: 172, name: 'inventory:manage_transfers', display_name: 'Manage Inventory Transfers', description: 'Can manage inventory transfers between stores/locations' },

    // Sales Management
    { id: 180, name: 'sale:create', display_name: 'Create Sales (POS)', description: 'Can create new sales (POS)' },
    { id: 181, name: 'sale:read', display_name: 'View Sales Records', description: 'Can view sales records' },
    { id: 182, name: 'sale:update', display_name: 'Update Sales Records', description: 'Can update sales records (e.g., returns, modifications - use with caution)' },
    { id: 183, name: 'sale:delete', display_name: 'Delete Sales Records', description: 'Can delete sales records (use with extreme caution)' },

    // Supplier Management
    { id: 190, name: 'supplier:create', display_name: 'Create Suppliers', description: 'Can create new suppliers' },
    { id: 191, name: 'supplier:read', display_name: 'View Suppliers', description: 'Can view suppliers' },
    { id: 192, name: 'supplier:update', display_name: 'Update Suppliers', description: 'Can update suppliers' },
    { id: 193, name: 'supplier:delete', display_name: 'Delete Suppliers', description: 'Can delete suppliers' },

    // Reports
    { id: 200, name: 'report:read', display_name: 'Access Reports Section', description: 'General access to the reports section' },
    { id: 201, name: 'report:read_sales', display_name: 'View Sales Reports', description: 'Can view sales reports' },
    { id: 202, name: 'report:read_inventory', display_name: 'View Inventory Reports', description: 'Can view inventory reports' },
    { id: 203, name: 'report:read_user_activity', display_name: 'View User Activity Reports', description: 'Can view user activity reports' },
    // { id: 204, name: 'report:read_financial', display_name: 'View Financial Reports', description: 'Can view financial reports' },

    // System Settings
    { id: 210, name: 'system:manage_settings', display_name: 'Manage System Settings', description: 'Can manage global system settings (e.g., company profile)' },

    // Store Settings (Per-store configuration)
    { id: 220, name: 'store_settings:read', display_name: 'Read Store Settings', description: 'Can read settings for assigned store(s)' },
    { id: 221, name: 'store_settings:update', display_name: 'Update Store Settings', description: 'Can update settings for assigned store(s)' },
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