export const ROLES = {
    GLOBAL_ADMIN: 'global_admin',
    STORE_ADMIN: 'store_admin',
    SALES_PERSON: 'sales_person',
    // Add other roles as defined in your backend
};

export const ROLES_OPTIONS = [
    { value: ROLES.GLOBAL_ADMIN, label: 'Global Admin' },
    { value: ROLES.STORE_ADMIN, label: 'Store Admin' },
    { value: ROLES.SALES_PERSON, label: 'Sales Person' },
];