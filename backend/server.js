require('dotenv').config();
const express = require('express');
const cors = require('cors');
const knex = require('./db/knex');
const { authenticateToken } = require('./middleware/authMiddleware'); // Import authenticateToken
const { checkPermission } = require('./middleware/authorizeRoles'); // Adjust path as needed

// --- Import Router Creation Functions ---
const createAuthRouter = require('./routes/auth');
const createBarcodeSymbologiesRouter = require('./routes/barcode_symbologies');
const createBrandsRouter = require('./routes/brands');
const createCategoriesRouter = require('./routes/categories');
const createDiscountTypesRouter = require('./routes/discount_types');
const createEmployeesRouter = require('./routes/employees');
const createInventoryRouter = require('./routes/inventory');
const createManufacturersRouter = require('./routes/manufacturers');
const createProductUnitsRouter = require('./routes/product_units');
const createProductsRouter = require('./routes/products');
const createSalesRouter = require('./routes/sales');
const createSpecialCategoriesRouter = require('./routes/special_categories');
const createStoresRouter = require('./routes/stores');
const createSubCategoriesRouter = require('./routes/sub_categories');
const createSuppliersRouter = require('./routes/suppliers');
const createTaxTypesRouter = require('./routes/tax_types');
const createTaxesRouter = require('./routes/taxes');
const createUnitsRouter = require('./routes/units');
const createUsersRouter = require('./routes/users');
const createWarrantiesRouter = require('./routes/warranties');
const createRolesRouter = require('./routes/roles'); // Add roles router
const createPermissionsRouter = require('./routes/permissions');
const createPermissionCategoriesRouter = require('./routes/permissionCategories');
const createStoreSettingsRoutes = require('./routes/settings'); // This one points to settings.js
const createCustomersRouter = require('./routes/customers');
// const createCompanyProfileRouter = require('./routes/company_profile'); // Commented out
// const createStoreSettingsRouter = require('./routes/store_settings'); // <-- COMMENT THIS LINE OUT
// const createReportsRouter = require('./routes/reports'); // <-- COMMENT THIS LINE OUT
const createAttributesRouter = require('./routes/attributes'); // <-- New Import

const app = express();

// --- Core Middleware ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Request Logging Middleware ---
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - User: ${req.user ? req.user.id : 'Guest'}`);
    next();
});

// --- Helper Function to Mount Routers ---
const mountRouter = (path, routerCreator, ...middlewares) => {
    if (typeof routerCreator !== 'function') {
        console.warn(`Router creator for ${path} is not a function or is undefined. Skipping mount.`);
        return;
    }
    try {
        let router;
        // Special handling for routers that require more arguments for their creator
        if (routerCreator === createProductsRouter) {
            // createProductsRouter expects (knex, authenticateToken, checkPermissionFactory)
            // The ...middlewares for this call are [authenticateToken, checkPermissionFactory]
            if (middlewares.length >= 2 && middlewares[0] === authenticateToken && middlewares[1] === checkPermission) {
                router = routerCreator(knex, middlewares[0], middlewares[1]); // Pass them correctly
            } else {
                 console.error(`Error: createProductsRouter not called with expected authenticateToken and checkPermission factory.`);
                 // Fallback or throw error, for now, let's try with knex only and log
                 router = routerCreator(knex); // This will likely still lead to issues if not handled
            }
        } else if (routerCreator === createUsersRouter) { // Example if createUsersRouter needs authenticateToken
             if (middlewares.length >= 1 && middlewares[0] === authenticateToken) {
                 router = routerCreator(knex, middlewares[0]);
             } else {
                 router = routerCreator(knex);
             }
        }
        // Add other similar else if blocks for other routers needing specific args from ...middlewares
        else {
            router = routerCreator(knex); // Default for simple routers like auth
        }

        // Filter out the checkPermission factory from path-level middlewares if it's present,
        // as it's a factory, not a direct middleware for app.use(path, factory, router)
        const actualPathMiddlewares = middlewares.filter(mw => mw !== checkPermission);
        // If you had a default permission for all product routes, you'd use:
        // actualPathMiddlewares.push(checkPermission('some-default-product-permission'));

        if (actualPathMiddlewares.length > 0) {
            app.use(path, ...actualPathMiddlewares, router);
            console.log(`Mounted ${path} with ${actualPathMiddlewares.map(m => m.name || 'middleware').join(', ')}`);
        } else {
            app.use(path, router);
            console.log(`Mounted ${path}`);
        }
    } catch (error) {
        console.error(`Error creating or mounting router for ${path}:`, error);
    }
};

// --- Public Routes ---
mountRouter('/api/auth', createAuthRouter);

// --- Protected Routes (Require Authentication) ---
mountRouter('/api/barcode-symbologies', createBarcodeSymbologiesRouter, authenticateToken);
mountRouter('/api/brands', createBrandsRouter, authenticateToken);
mountRouter('/api/categories', createCategoriesRouter, authenticateToken);
mountRouter('/api/discount-types', createDiscountTypesRouter, authenticateToken);
mountRouter('/api/employees', createEmployeesRouter, authenticateToken);
mountRouter('/api/inventory', createInventoryRouter, authenticateToken);
mountRouter('/api/manufacturers', createManufacturersRouter, authenticateToken);
mountRouter('/api/product-units', createProductUnitsRouter, authenticateToken);
mountRouter('/api/products', createProductsRouter, authenticateToken, checkPermission);
mountRouter('/api/sales', createSalesRouter, authenticateToken);
mountRouter('/api/special-categories', createSpecialCategoriesRouter, authenticateToken);
mountRouter('/api/stores', createStoresRouter, authenticateToken);
mountRouter('/api/sub-categories', createSubCategoriesRouter, authenticateToken);
mountRouter('/api/suppliers', createSuppliersRouter, authenticateToken);
mountRouter('/api/tax-types', createTaxTypesRouter, authenticateToken);
mountRouter('/api/taxes', createTaxesRouter, authenticateToken);
mountRouter('/api/units', createUnitsRouter, authenticateToken);
mountRouter('/api/users', createUsersRouter, authenticateToken);
mountRouter('/api/warranties', createWarrantiesRouter, authenticateToken);
mountRouter('/api/roles', createRolesRouter, authenticateToken);
mountRouter('/api/permissions', createPermissionsRouter, authenticateToken);
mountRouter('/api/permission-categories', createPermissionCategoriesRouter, authenticateToken);
mountRouter('/api/settings', createStoreSettingsRoutes, authenticateToken); // This uses settings.js
mountRouter('/api/customers', createCustomersRouter, authenticateToken);
// mountRouter('/api/company-profile', createCompanyProfileRouter, authenticateToken); // Already commented
// mountRouter('/api/store-settings', createStoreSettingsRouter, authenticateToken); // Already commented
// mountRouter('/api/reports', createReportsRouter, authenticateToken); // <-- AND COMMENT THIS LINE OUT
mountRouter('/api/attributes', createAttributesRouter, authenticateToken); // <-- Use new router

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.message, err.stack || '');
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred on the server.';

    if (err.name === 'UnauthorizedError') {
        res.status(401).json({ status: 'error', statusCode: 401, message: 'Invalid or expired token.' });
    } else {
        res.status(statusCode).json({
            status: 'error',
            statusCode,
            message,
            ...(process.env.NODE_ENV === 'development' && { errorDetails: err.stack }),
        });
    }
});

// --- Start Server ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`CORS configured for frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    if (!process.env.JWT_SECRET) {
        console.warn('SECURITY WARNING: JWT_SECRET is not defined in .env file. Authentication will not work correctly.');
    }
    if (!process.env.DATABASE_URL && (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_DATABASE)) {
        console.warn('DATABASE WARNING: Database connection details are not fully set in .env file.');
    }
});