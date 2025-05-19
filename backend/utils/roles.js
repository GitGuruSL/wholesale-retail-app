// Define the PERMISSIONS object
const PERMISSIONS = {
    // User Permissions
    USER_CREATE: 'user:create',
    USER_READ_ALL: 'user:read_all',
    USER_READ_SELF: 'user:read_self', // For users to view their own profile
    USER_UPDATE_ALL: 'user:update_all', // For admins to update any user
    USER_UPDATE_SELF: 'user:update_self', // For users to update their own profile
    USER_DELETE: 'user:delete',
    USER_ASSIGN_ROLE: 'user:assign_role',
    USER_ASSIGN_STORE: 'user:assign_store',

    // Item Permissions
    Item_CREATE: 'Item:create',
    Item_READ: 'Item:read', // General read access
    Item_UPDATE: 'Item:update',
    Item_DELETE: 'Item:delete',
    Item_MANAGE_PRICE: 'Item:manage_price', // For managing Item prices

    // Category/SubCategory Permissions
    CATEGORY_CREATE: 'category:create',
    CATEGORY_READ: 'category:read',
    CATEGORY_UPDATE: 'category:update',
    CATEGORY_DELETE: 'category:delete',

    // Store Permissions
    STORE_CREATE: 'store:create',
    STORE_READ: 'store:read', // General store listing/viewing
    STORE_UPDATE: 'store:update',
    STORE_DELETE: 'store:delete',
    STORE_ASSIGN_USER: 'store:assign_user', // Assigning users to a store

    // Inventory Permissions
    INVENTORY_ADJUST: 'inventory:adjust',
    INVENTORY_VIEW: 'inventory:view',

    // Sales Permissions
    SALE_CREATE: 'sale:create',
    SALE_VIEW_ALL: 'sale:view_all', // View all sales records
    SALE_VIEW_STORE: 'sale:view_store', // View sales for assigned store
    SALE_PROCESS_RETURN: 'sale:process_return',

    // Supplier Permissions
    SUPPLIER_CREATE: 'supplier:create',
    SUPPLIER_READ: 'supplier:read',
    SUPPLIER_UPDATE: 'supplier:update',
    SUPPLIER_DELETE: 'supplier:delete',

    // Additional Permissions
    REPORT_VIEW_SALES: 'report:view_sales',
    REPORT_VIEW_INVENTORY: 'report:view_inventory',
    SETTINGS_MANAGE: 'settings:manage',
    TAX_MANAGE: 'tax:manage',
    DISCOUNT_MANAGE: 'discount:manage',
    BRAND_MANAGE: 'brand:manage',


    // Role Permissions (managing the roles themselves)
    ROLE_CREATE: 'role:create',
    ROLE_READ: 'role:read',
    ROLE_UPDATE: 'role:update', // For updating role details like name, description
    ROLE_DELETE: 'role:delete',
    ROLE_ASSIGN_PERMISSIONS: 'role:assign_permissions',
};

// Define the ROLES object
const ROLES = {
    GLOBAL_ADMIN: 'global_admin',
    STORE_ADMIN: 'store_admin',
    STORE_MANAGER: 'store_manager',
    SALES_PERSON: 'sales_person',
    // Add other roles as needed
};

// Export the PERMISSIONS and ROLES objects
module.exports = {
    PERMISSIONS,
    ROLES,
};