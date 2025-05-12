require('dotenv').config();
const express = require('express');
const cors = require('cors');
const knex = require('./db/knex');
const { authenticateToken } = require('./middleware/authMiddleware');
const checkPermission = require('./middleware/authorizeRoles'); // UPDATED - Assuming you renamed the export or the file's purpose

// --- Import Router Creation Functions ---
const createAuthRouter = require('./routes/auth');
const createBarcodeSymbologiesRouter = require('./routes/barcode_symbologies');
const createBrandsRouter = require('./routes/brands');
const createCategoriesRouter = require('./routes/categories');
const createDiscountTypesRouter = require('./routes/discount_types');
const createEmployeesRouter = require('./routes/employees');
const createInventoryRouter = require('./routes/inventory');
const createManufacturersRouter = require('./routes/manufacturers');
const createProductUnitsRouter = require('./routes/product_units'); // ADD THIS LINE
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
const createRolesRouter = require('./routes/roles');
const createPermissionsRouter = require('./routes/permissions');
const createPermissionCategoriesRouter = require('./routes/permissionCategories');
const createStoreSettingsRoutes = require('./routes/settings');
const createCustomersRouter = require('./routes/customers');
const createAttributesRouter = require('./routes/attributes');

const app = express();

// --- Core Middleware ---
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Request Logging Middleware ---
app.use((req, res, next) => {
    // Ensure req.user is accessed safely, as authenticateToken might not have run yet for all paths
    const userId = req.user ? req.user.id : (req.user === null ? 'AuthFailed' : 'Guest');
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - User: ${userId}`);
    next();
});

// --- Mount Routers ---

// Public Route
try {
    const authRouter = createAuthRouter(knex);
    app.use('/api/auth', authRouter);
    console.log('Mounted /api/auth');
} catch (e) {
    console.error('Error mounting /api/auth:', e);
}

// Helper for most protected routes whose factories take (knex, authenticateToken, checkPermission)
// and are expected to use these for internal route protection.
const mountProtectedRouter = (path, routerFactory) => {
    if (typeof routerFactory !== 'function') {
        console.warn(`Router factory for ${path} is not a function or is undefined. Skipping mount.`);
        return;
    }
    try {
        // Pass all auth tools to the factory; the factory decides how to use them.
        // The router itself will apply authenticateToken and checkPermission on its specific routes.
        // Pass checkPermission as the third argument
        const router = routerFactory(knex, authenticateToken, checkPermission); // Pass the actual checkPermission
        app.use(path, router); // No need to apply authenticateToken at app.use level if router handles it
        console.log(`Mounted ${path} (router handles its own auth)`);
    } catch (error) {
        console.error(`Error creating or mounting router for ${path}:`, error);
    }
};

// Apply to routers that are structured to use authenticateToken and checkPermission internally
mountProtectedRouter('/api/products', createProductsRouter);
mountProtectedRouter('/api/users', createUsersRouter); // Assuming createUsersRouter also uses auth tools internally
mountProtectedRouter('/api/sales', createSalesRouter); // Assuming createSalesRouter also uses auth tools internally
mountProtectedRouter('/api/employees', createEmployeesRouter); // And so on for other complex routers

// Simpler helper for routes that might only need path-level authentication 
// and their factories only take knex (internal routes might not need granular permissions or use a default)
const mountSimpleProtectedRoute = (path, routerFactory) => {
    if (typeof routerFactory !== 'function') {
        console.warn(`Router factory for ${path} is not a function. Skipping.`);
        return;
    }
    try {
        const router = routerFactory(knex); // Factory only takes knex
        app.use(path, authenticateToken, router); // Apply blanket authenticateToken for the path
        console.log(`Mounted ${path} with path-level authenticateToken`);
    } catch (e) {
        console.error(`Error mounting ${path}:`, e);
    }
};

// Use for routers whose factories only expect `knex` and auth is handled at path level
mountSimpleProtectedRoute('/api/barcode-symbologies', createBarcodeSymbologiesRouter);
mountSimpleProtectedRoute('/api/brands', createBrandsRouter);
mountSimpleProtectedRoute('/api/categories', createCategoriesRouter);
mountSimpleProtectedRoute('/api/discount-types', createDiscountTypesRouter);
mountSimpleProtectedRoute('/api/inventory', createInventoryRouter);
mountSimpleProtectedRoute('/api/manufacturers', createManufacturersRouter);
mountSimpleProtectedRoute('/api/product-units', createProductUnitsRouter); // ADD THIS LINE
mountSimpleProtectedRoute('/api/special-categories', createSpecialCategoriesRouter);
mountSimpleProtectedRoute('/api/stores', createStoresRouter);
mountSimpleProtectedRoute('/api/sub-categories', createSubCategoriesRouter);
mountSimpleProtectedRoute('/api/suppliers', createSuppliersRouter);
mountSimpleProtectedRoute('/api/tax-types', createTaxTypesRouter);
mountSimpleProtectedRoute('/api/taxes', createTaxesRouter);
mountSimpleProtectedRoute('/api/units', createUnitsRouter);
mountSimpleProtectedRoute('/api/warranties', createWarrantiesRouter);
mountSimpleProtectedRoute('/api/roles', createRolesRouter);
mountSimpleProtectedRoute('/api/permissions', createPermissionsRouter);
mountSimpleProtectedRoute('/api/permission-categories', createPermissionCategoriesRouter);
mountSimpleProtectedRoute('/api/settings', createStoreSettingsRoutes);
mountSimpleProtectedRoute('/api/customers', createCustomersRouter);
mountSimpleProtectedRoute('/api/attributes', createAttributesRouter);


// --- Global Error Handler ---
// (Keep your existing global error handler)
app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.message, err.stack || '');
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred on the server.';

    if (err.name === 'UnauthorizedError') { // Specific check for JWT errors if you use express-jwt
        res.status(401).json({ status: 'error', statusCode: 401, message: 'Invalid or expired token.' });
    } else if (err.status === 401) { // General 401
        res.status(401).json({ status: 'error', statusCode: 401, message: err.message || 'Unauthorized.' });
    } else if (err.status === 403) { // General 403
        res.status(403).json({ status: 'error', statusCode: 403, message: err.message || 'Forbidden.' });
    }
    else {
        res.status(statusCode).json({
            status: 'error',
            statusCode,
            message,
            ...(process.env.NODE_ENV === 'development' && { errorDetails: err.stack }),
        });
    }
});

// --- Start Server ---
// (Keep your existing server start logic)
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    // ... other startup logs
});