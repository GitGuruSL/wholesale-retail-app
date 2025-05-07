export const ROLES = {
    GLOBAL_ADMIN: 'global_admin',
    STORE_ADMIN: 'store_admin',
    SALES_PERSON: 'sales_person',
    // Add other roles as defined and ensure they match exactly
    // with what's stored in your database and used in the backend
};

export const ROLES_OPTIONS = [
    { value: ROLES.GLOBAL_ADMIN, label: 'Global Admin' },
    { value: ROLES.STORE_ADMIN, label: 'Store Admin' },
    { value: ROLES.SALES_PERSON, label: 'Sales Person' },
    // Add other options as needed
];

// If you had other things or a default export, make sure 'ROLES' is a named export.
// For example, avoid:
// const MY_ROLES = { ... };
// export default MY_ROLES; // This would require 'import ANY_NAME from ...'
// and then using ANY_NAME.GLOBAL_ADMIN, not { ROLES }.