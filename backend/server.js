require('dotenv').config();
const express = require('express');
const cors = require('cors');
const knex = require('./db/knex');
const { authenticateToken } = require('./middleware/authMiddleware');
const authorizeAccess = require('./middleware/authorizeRoles'); // Keep this one
const methodOverride = require('method-override'); // Import method-override

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
const createPurchaseOrdersRouter = require('./routes/purchaseOrders');

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

// Body parsers - These are important for method-override to inspect req.body for non-multipart forms
// For multipart/form-data, multer handles parsing at the route level.
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Configure method-override
// It should come AFTER body parsers if it needs to inspect req.body for non-multipart forms.
// For multipart forms, multer (used in your route) will populate req.body with text fields.
app.use(methodOverride(function (req, res) {
  console.log('[MethodOverride] Original Method:', req.method, 'URL:', req.originalUrl);
  // console.log('[MethodOverride] req.body:', JSON.stringify(req.body)); // req.body will be undefined here for multipart before multer
  console.log('[MethodOverride] req.query:', JSON.stringify(req.query)); // Log req.query

  let methodToOverride;

  // Check query parameter first (most reliable for multipart forms)
  if (req.query && typeof req.query === 'object' && '_method' in req.query) {
    methodToOverride = req.query._method;
    console.log(`[MethodOverride] _method found in query: ${methodToOverride}. Overriding.`);
    // Optionally, delete req.query._method if you want to clean it up, though not strictly necessary
    // delete req.query._method; 
    return methodToOverride;
  }
  
  // Fallback to check body (for non-multipart forms where body is parsed earlier)
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    methodToOverride = req.body._method;
    console.log(`[MethodOverride] _method found in body: ${methodToOverride}. Overriding.`);
    delete req.body._method; 
    return methodToOverride;
  }

  console.log('[MethodOverride] _method not found in body or query.');
  return undefined; // If not found, continue with the original method
}));

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
        const router = routerFactory(knex, authenticateToken, authorizeAccess); // Correctly passing authorizeAccess
        app.use(path, router); 
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
mountProtectedRouter('/api/suppliers', createSuppliersRouter); // Ensure authenticateToken and authorizeAccess are correctly passed

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
mountProtectedRouter('/api/purchase-orders', createPurchaseOrdersRouter);


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