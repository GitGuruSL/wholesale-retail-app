exports.seed = async function(knex) {
  // Define category IDs (these should match the IDs in your 05_permission_categories.js seed)
  const CAT_USER_ROLE_PERM = 1;
  const CAT_STORE_Item_CATALOG = 2;
  const CAT_Item_CONFIG = 3;
  const CAT_OPERATIONS = 4;
  const CAT_SYSTEM_REPORTS = 5;
  const CAT_OTHER = 6; // For any uncategorized or future permissions

  const permissions = [
    // User Management (Category: User, Role & Permission Mgmt)
    { id: 1, name: 'user:create', display_name: 'Create Users', description: 'Can create new users', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'user', sub_group_display_name: 'User Management' },
    { id: 2, name: 'user:read_all', display_name: 'View All Users', description: 'Can view all users', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'user', sub_group_display_name: 'User Management' },
    { id: 3, name: 'user:read_self', display_name: 'View Own Profile', description: 'Can view own user profile', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'user', sub_group_display_name: 'User Management' },
    { id: 4, name: 'user:update_all', display_name: 'Update Any User', description: 'Can update any user\'s details', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'user', sub_group_display_name: 'User Management' },
    { id: 5, name: 'user:update_self', display_name: 'Update Own Profile', description: 'Can update own user profile', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'user', sub_group_display_name: 'User Management' },
    { id: 6, name: 'user:delete', display_name: 'Delete Users', description: 'Can delete users', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'user', sub_group_display_name: 'User Management' },
    { id: 7, name: 'user:assign_roles', display_name: 'Assign Roles to Users', description: 'Can assign roles to users', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'user', sub_group_display_name: 'User Management' },
    { id: 8, name: 'user:assign_stores', display_name: 'Assign Users to Stores', description: 'Can assign users to stores', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'user', sub_group_display_name: 'User Management' },

    // Role Management (Category: User, Role & Permission Mgmt)
    { id: 10, name: 'role:create', display_name: 'Create Roles', description: 'Can create new roles', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'role', sub_group_display_name: 'Role Management' },
    { id: 11, name: 'role:read', display_name: 'View Roles', description: 'Can view roles and their permissions', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'role', sub_group_display_name: 'Role Management' },
    { id: 12, name: 'role:update', display_name: 'Update Roles', description: 'Can update roles and assign permissions', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'role', sub_group_display_name: 'Role Management' },
    { id: 13, name: 'role:delete', display_name: 'Delete Roles', description: 'Can delete roles', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'role', sub_group_display_name: 'Role Management' },
    { id: 14, name: 'role:assign_permissions', display_name: 'Assign Permissions to Roles', description: 'Can assign/revoke permissions for roles', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'role', sub_group_display_name: 'Role Management' },
    
    // Permission Management (Category: User, Role & Permission Mgmt)
    { id: 20, name: 'permission:read', display_name: 'View Permissions', description: 'Can view available system permissions', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'permission', sub_group_display_name: 'Permission Management' },
    { id: 21, name: 'permission:create', display_name: 'Create Permissions', description: 'Can create new system permissions', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'permission', sub_group_display_name: 'Permission Management' },
    { id: 22, name: 'permission:update', display_name: 'Update Permissions', description: 'Can update existing system permissions', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'permission', sub_group_display_name: 'Permission Management' },
    { id: 23, name: 'permission:delete', display_name: 'Delete Permissions', description: 'Can delete system permissions', permission_category_id: CAT_USER_ROLE_PERM, sub_group_key: 'permission', sub_group_display_name: 'Permission Management' },


    // Store Management (Category: Store & Item Catalog)
    { id: 30, name: 'store:create', display_name: 'Create Stores', description: 'Can create new stores', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'store', sub_group_display_name: 'Store Core' },
    { id: 31, name: 'store:read', display_name: 'View Stores', description: 'Can view store details', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'store', sub_group_display_name: 'Store Core' },
    { id: 32, name: 'store:update', display_name: 'Update Stores', description: 'Can update store details', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'store', sub_group_display_name: 'Store Core' },
    { id: 33, name: 'store:delete', display_name: 'Delete Stores', description: 'Can delete stores', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'store', sub_group_display_name: 'Store Core' },

    // Item Management (Core) (Category: Store & Item Catalog)
    { id: 40, name: 'Item:create', display_name: 'Create Items', description: 'Can create new Items', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'Item', sub_group_display_name: 'Item Core' },
    { id: 41, name: 'Item:read', display_name: 'View Items', description: 'Can view Items', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'Item', sub_group_display_name: 'Item Core' },
    { id: 42, name: 'Item:update', display_name: 'Update Items', description: 'Can update Items', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'Item', sub_group_display_name: 'Item Core' },
    { id: 43, name: 'Item:delete', display_name: 'Delete Items', description: 'Can delete Items', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'Item', sub_group_display_name: 'Item Core' },

    // Item Catalog - Categories (Category: Store & Item Catalog)
    { id: 50, name: 'category:create', display_name: 'Create Categories', description: 'Can create Item categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'category', sub_group_display_name: 'Item Categories' },
    { id: 51, name: 'category:read', display_name: 'View Categories', description: 'Can view Item categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'category', sub_group_display_name: 'Item Categories' },
    { id: 52, name: 'category:update', display_name: 'Update Categories', description: 'Can update Item categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'category', sub_group_display_name: 'Item Categories' },
    { id: 53, name: 'category:delete', display_name: 'Delete Categories', description: 'Can delete Item categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'category', sub_group_display_name: 'Item Categories' },

    // Item Catalog - Sub-Categories (Category: Store & Item Catalog)
    { id: 60, name: 'subcategory:create', display_name: 'Create Sub-Categories', description: 'Can create Item sub-categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'subcategory', sub_group_display_name: 'Item Sub-Categories' },
    { id: 61, name: 'subcategory:read', display_name: 'View Sub-Categories', description: 'Can view Item sub-categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'subcategory', sub_group_display_name: 'Item Sub-Categories' },
    { id: 62, name: 'subcategory:update', display_name: 'Update Sub-Categories', description: 'Can update Item sub-categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'subcategory', sub_group_display_name: 'Item Sub-Categories' },
    { id: 63, name: 'subcategory:delete', display_name: 'Delete Sub-Categories', description: 'Can delete Item sub-categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'subcategory', sub_group_display_name: 'Item Sub-Categories' },

    // Item Catalog - Brands (Category: Store & Item Catalog)
    { id: 70, name: 'brand:create', display_name: 'Create Brands', description: 'Can create Item brands', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'brand', sub_group_display_name: 'Item Brands' },
    { id: 71, name: 'brand:read', display_name: 'View Brands', description: 'Can view Item brands', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'brand', sub_group_display_name: 'Item Brands' },
    { id: 72, name: 'brand:update', display_name: 'Update Brands', description: 'Can update Item brands', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'brand', sub_group_display_name: 'Item Brands' },
    { id: 73, name: 'brand:delete', display_name: 'Delete Brands', description: 'Can delete Item brands', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'brand', sub_group_display_name: 'Item Brands' },

    // Item Catalog - Special Categories (Category: Store & Item Catalog)
    { id: 80, name: 'specialcategory:create', display_name: 'Create Special Categories', description: 'Can create special Item categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'specialcategory', sub_group_display_name: 'Item Special Categories' },
    { id: 81, name: 'specialcategory:read', display_name: 'View Special Categories', description: 'Can view special Item categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'specialcategory', sub_group_display_name: 'Item Special Categories' },
    { id: 82, name: 'specialcategory:update', display_name: 'Update Special Categories', description: 'Can update special Item categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'specialcategory', sub_group_display_name: 'Item Special Categories' },
    { id: 83, name: 'specialcategory:delete', display_name: 'Delete Special Categories', description: 'Can delete special Item categories', permission_category_id: CAT_STORE_Item_CATALOG, sub_group_key: 'specialcategory', sub_group_display_name: 'Item Special Categories' },

    // Item Configuration - Attributes (Category: Item Configuration)
    { id: 90, name: 'Item_attribute:create', display_name: 'Create Item Attributes', description: 'Can create Item attributes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'Item_attribute', sub_group_display_name: 'Item Attributes' },
    { id: 91, name: 'Item_attribute:read', display_name: 'View Item Attributes', description: 'Can view Item attributes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'Item_attribute', sub_group_display_name: 'Item Attributes' },
    { id: 92, name: 'Item_attribute:update', display_name: 'Update Item Attributes', description: 'Can update Item attributes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'Item_attribute', sub_group_display_name: 'Item Attributes' },
    { id: 93, name: 'Item_attribute:delete', display_name: 'Delete Item Attributes', description: 'Can delete Item attributes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'Item_attribute', sub_group_display_name: 'Item Attributes' },

    // Item Configuration - Tax Types (Category: Item Configuration)
    { id: 100, name: 'tax_type:create', display_name: 'Create Tax Types', description: 'Can create tax types', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax_type', sub_group_display_name: 'Tax Types' },
    { id: 101, name: 'tax_type:read', display_name: 'View Tax Types', description: 'Can view tax types', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax_type', sub_group_display_name: 'Tax Types' },
    { id: 102, name: 'tax_type:update', display_name: 'Update Tax Types', description: 'Can update tax types', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax_type', sub_group_display_name: 'Tax Types' },
    { id: 103, name: 'tax_type:delete', display_name: 'Delete Tax Types', description: 'Can delete tax types', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax_type', sub_group_display_name: 'Tax Types' },

    // Item Configuration - Taxes (Category: Item Configuration)
    { id: 110, name: 'tax:create', display_name: 'Create Taxes', description: 'Can create taxes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax', sub_group_display_name: 'Taxes' },
    { id: 111, name: 'tax:read', display_name: 'View Taxes', description: 'Can view taxes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax', sub_group_display_name: 'Taxes' },
    { id: 112, name: 'tax:update', display_name: 'Update Taxes', description: 'Can update taxes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax', sub_group_display_name: 'Taxes' },
    { id: 113, name: 'tax:delete', display_name: 'Delete Taxes', description: 'Can delete taxes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax', sub_group_display_name: 'Taxes' },
    { id: 114, name: 'tax:manage', display_name: 'Manage Taxes', description: 'General permission to manage taxes', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'tax', sub_group_display_name: 'Taxes' },

    // Item Configuration - General Settings (Category: Item Configuration)
    { id: 120, name: 'Item_settings:read', display_name: 'Access Item Settings', description: 'Can access Item settings section', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'Item_settings', sub_group_display_name: 'Item Settings General' },

    // Item Configuration - Units (Category: Item Configuration)
    { id: 121, name: 'unit:create', display_name: 'Create Units', description: 'Can create Item units', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'unit', sub_group_display_name: 'Item Units' },
    { id: 122, name: 'unit:read', display_name: 'View Units', description: 'Can view Item units', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'unit', sub_group_display_name: 'Item Units' },
    { id: 123, name: 'unit:update', display_name: 'Update Units', description: 'Can update Item units', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'unit', sub_group_display_name: 'Item Units' },
    { id: 124, name: 'unit:delete', display_name: 'Delete Units', description: 'Can delete Item units', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'unit', sub_group_display_name: 'Item Units' },

    // Item Configuration - Manufacturers (Category: Item Configuration)
    { id: 130, name: 'manufacturer:create', display_name: 'Create Manufacturers', description: 'Can create manufacturers', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'manufacturer', sub_group_display_name: 'Item Manufacturers' },
    { id: 131, name: 'manufacturer:read', display_name: 'View Manufacturers', description: 'Can view manufacturers', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'manufacturer', sub_group_display_name: 'Item Manufacturers' },
    { id: 132, name: 'manufacturer:update', display_name: 'Update Manufacturers', description: 'Can update manufacturers', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'manufacturer', sub_group_display_name: 'Item Manufacturers' },
    { id: 133, name: 'manufacturer:delete', display_name: 'Delete Manufacturers', description: 'Can delete manufacturers', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'manufacturer', sub_group_display_name: 'Item Manufacturers' },

    // Item Configuration - Warranties (Category: Item Configuration)
    { id: 140, name: 'warranty:create', display_name: 'Create Warranties', description: 'Can create warranties', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'warranty', sub_group_display_name: 'Item Warranties' },
    { id: 141, name: 'warranty:read', display_name: 'View Warranties', description: 'Can view warranties', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'warranty', sub_group_display_name: 'Item Warranties' },
    { id: 142, name: 'warranty:update', display_name: 'Update Warranties', description: 'Can update warranties', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'warranty', sub_group_display_name: 'Item Warranties' },
    { id: 143, name: 'warranty:delete', display_name: 'Delete Warranties', description: 'Can delete warranties', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'warranty', sub_group_display_name: 'Item Warranties' },

    // Item Configuration - Barcode Symbologies (Category: Item Configuration)
    { id: 150, name: 'barcode_symbology:create', display_name: 'Create Barcode Symbologies', description: 'Can create barcode symbologies', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'barcode_symbology', sub_group_display_name: 'Item Barcode Symbologies' },
    { id: 151, name: 'barcode_symbology:read', display_name: 'View Barcode Symbologies', description: 'Can view barcode symbologies', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'barcode_symbology', sub_group_display_name: 'Item Barcode Symbologies' },
    { id: 152, name: 'barcode_symbology:update', display_name: 'Update Barcode Symbologies', description: 'Can update barcode symbologies', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'barcode_symbology', sub_group_display_name: 'Item Barcode Symbologies' },
    { id: 153, name: 'barcode_symbology:delete', display_name: 'Delete Barcode Symbologies', description: 'Can delete barcode symbologies', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'barcode_symbology', sub_group_display_name: 'Item Barcode Symbologies' },

    // Item Configuration - Discount Types (Category: Item Configuration)
    { id: 160, name: 'discount_type:create', display_name: 'Create Discount Types', description: 'Can create discount types', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'discount_type', sub_group_display_name: 'Item Discount Types' },
    { id: 161, name: 'discount_type:read', display_name: 'View Discount Types', description: 'Can view discount types', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'discount_type', sub_group_display_name: 'Item Discount Types' },
    { id: 162, name: 'discount_type:update', display_name: 'Update Discount Types', description: 'Can update discount types', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'discount_type', sub_group_display_name: 'Item Discount Types' },
    { id: 163, name: 'discount_type:delete', display_name: 'Delete Discount Types', description: 'Can delete discount types', permission_category_id: CAT_Item_CONFIG, sub_group_key: 'discount_type', sub_group_display_name: 'Item Discount Types' },

    // Operations - Inventory Management (Category: Operations)
    { id: 170, name: 'inventory:read', display_name: 'View Inventory', description: 'Can view inventory levels', permission_category_id: CAT_OPERATIONS, sub_group_key: 'inventory', sub_group_display_name: 'Inventory Management' },
    { id: 171, name: 'inventory:update', display_name: 'Update Inventory', description: 'Can update inventory levels (e.g., stock adjustments)', permission_category_id: CAT_OPERATIONS, sub_group_key: 'inventory', sub_group_display_name: 'Inventory Management' },

    // Operations - Sales Management (Category: Operations)
    { id: 180, name: 'sale:create', display_name: 'Create Sales (POS)', description: 'Can create new sales (POS)', permission_category_id: CAT_OPERATIONS, sub_group_key: 'sale', sub_group_display_name: 'Sales Management' },
    { id: 181, name: 'sale:read', display_name: 'View Sales Records', description: 'Can view sales records', permission_category_id: CAT_OPERATIONS, sub_group_key: 'sale', sub_group_display_name: 'Sales Management' },
    { id: 182, name: 'sale:update', display_name: 'Update Sales Records', description: 'Can update sales records (e.g., returns, modifications - use with caution)', permission_category_id: CAT_OPERATIONS, sub_group_key: 'sale', sub_group_display_name: 'Sales Management' },
    { id: 183, name: 'sale:delete', display_name: 'Delete Sales Records', description: 'Can delete sales records (use with extreme caution)', permission_category_id: CAT_OPERATIONS, sub_group_key: 'sale', sub_group_display_name: 'Sales Management' },

    // Operations - Supplier Management (Category: Operations)
    { id: 190, name: 'supplier:create', display_name: 'Create Suppliers', description: 'Can create new suppliers', permission_category_id: CAT_OPERATIONS, sub_group_key: 'supplier', sub_group_display_name: 'Supplier Management' },
    { id: 191, name: 'supplier:read', display_name: 'View Suppliers', description: 'Can view suppliers', permission_category_id: CAT_OPERATIONS, sub_group_key: 'supplier', sub_group_display_name: 'Supplier Management' },
    { id: 192, name: 'supplier:update', display_name: 'Update Suppliers', description: 'Can update suppliers', permission_category_id: CAT_OPERATIONS, sub_group_key: 'supplier', sub_group_display_name: 'Supplier Management' },
    { id: 193, name: 'supplier:delete', display_name: 'Delete Suppliers', description: 'Can delete suppliers', permission_category_id: CAT_OPERATIONS, sub_group_key: 'supplier', sub_group_display_name: 'Supplier Management' },

    // System & Reports - Reporting (Category: System & Reports)
    { id: 200, name: 'report:read', display_name: 'Access Reports Section', description: 'General access to the reports section', permission_category_id: CAT_SYSTEM_REPORTS, sub_group_key: 'report', sub_group_display_name: 'Reporting' },
    { id: 201, name: 'report:read_sales', display_name: 'View Sales Reports', description: 'Can view sales reports', permission_category_id: CAT_SYSTEM_REPORTS, sub_group_key: 'report', sub_group_display_name: 'Reporting' },
    { id: 202, name: 'report:read_inventory', display_name: 'View Inventory Reports', description: 'Can view inventory reports', permission_category_id: CAT_SYSTEM_REPORTS, sub_group_key: 'report', sub_group_display_name: 'Reporting' },
    { id: 203, name: 'report:read_user_activity', display_name: 'View User Activity Reports', description: 'Can view user activity reports', permission_category_id: CAT_SYSTEM_REPORTS, sub_group_key: 'report', sub_group_display_name: 'Reporting' },

    // System & Reports - System Settings (Category: System & Reports)
    { id: 210, name: 'system:manage_settings', display_name: 'Manage System Settings', description: 'Can manage global system settings (e.g., company profile)', permission_category_id: CAT_SYSTEM_REPORTS, sub_group_key: 'system', sub_group_display_name: 'System Settings' },
    { id: 211, name: 'system:manage_permission_categories', display_name: 'Manage Permission Categories', description: 'Can create, update, delete permission categories', permission_category_id: CAT_SYSTEM_REPORTS, sub_group_key: 'system', sub_group_display_name: 'System Settings' },


    // System & Reports - Store Settings (Category: System & Reports)
    { id: 220, name: 'store_settings:read', display_name: 'Read Store Settings', description: 'Can read settings for assigned store(s)', permission_category_id: CAT_SYSTEM_REPORTS, sub_group_key: 'store_settings', sub_group_display_name: 'Store Settings' },
    { id: 221, name: 'store_settings:update', display_name: 'Update Store Settings', description: 'Can update settings for assigned store(s)', permission_category_id: CAT_SYSTEM_REPORTS, sub_group_key: 'store_settings', sub_group_display_name: 'Store Settings' },
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
    console.log(`Successfully seeded ${permissions.length} permissions with category and sub-group info.`);

  } catch (error) {
    console.error('Error seeding permissions:', error);
  }
};