// Define your PERMISSIONS object
const PERMISSIONS = {
    // User Permissions
    USER_CREATE: 'user:create',
    USER_READ_ALL: 'user:read_all',
    USER_READ_SELF: 'user:read_self', // If users can view their own profile
    USER_UPDATE_ALL: 'user:update_all', // For admins to update any user
    USER_UPDATE_SELF: 'user:update_self', // For users to update their own profile
    USER_DELETE: 'user:delete',
    USER_ASSIGN_ROLE: 'user:assign_role',
    USER_ASSIGN_STORE: 'user:assign_store',

    // Product Permissions
    PRODUCT_CREATE: 'product:create',
    PRODUCT_READ: 'product:read', // General read access
    PRODUCT_UPDATE: 'product:update',
    PRODUCT_DELETE: 'product:delete',
    PRODUCT_MANAGE_PRICE: 'product:manage_price', // If price changes are restricted

    // Category/SubCategory Permissions (can be combined or separate)
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
    
    // Add more permissions as needed for other modules like:
    // reports, settings, taxes, discounts, brands, etc.
    // Example: REPORT_VIEW_SALES: 'report:view_sales'
};

const ROLES = {
    GLOBAL_ADMIN: 'global_admin',
    STORE_ADMIN: 'store_admin',
    STORE_MANAGER: 'store_manager',
    SALES_PERSON: 'sales_person'
    // Add other roles as defined in your database
};

module.exports = {
    PERMISSIONS, // Now PERMISSIONS is defined before being exported
    ROLES
};