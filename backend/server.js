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
const createItemUnitsRouterFunction = require('./routes/item_units'); 
const createItemsRouter = require('./routes/items');
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
const createItemVariantsRouter = require('./routes/itemVariants'); 
const goodsReceiptsRouter = require('./routes/goodsReceipts');

const app = express();

// --- Core Middleware ---
// ... your cors, express.json, express.urlencoded, methodOverride middleware ...
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

app.use(methodOverride(function (req, res) {
  let methodToOverride;
  if (req.query && typeof req.query === 'object' && '_method' in req.query) {
    methodToOverride = req.query._method;
    return methodToOverride;
  }
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    methodToOverride = req.body._method;
    delete req.body._method; 
    return methodToOverride;
  }
  return undefined;
}));

// --- Request Logging Middleware ---
app.use((req, res, next) => {
    const userId = req.user ? req.user.user_id : (req.user === null ? 'AuthFailed' : 'Guest'); // Corrected to req.user.user_id
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - User: ${userId}`);
    next();
});

// --- DEFINE HELPER FUNCTIONS BEFORE USE ---
// Helper for most protected routes whose factories take (knex, authenticateToken, authorizeAccess)
// and are expected to use these for internal route protection.
const mountProtectedRouter = (path, routerFactory) => {
    if (typeof routerFactory !== 'function') {
        console.warn(`Router factory for ${path} is not a function or is undefined. Skipping mount.`);
        return;
    }
    try {
        const router = routerFactory(knex, authenticateToken, authorizeAccess); // authorizeAccess is your checkPermission equivalent
        app.use(path, router); 
        console.log(`Mounted ${path} (router handles its own auth)`);
    } catch (error) {
        console.error(`Error creating or mounting router for ${path}:`, error);
    }
};

// Simpler helper for routes that might only need path-level authentication 
// and their factories only take knex
const mountSimpleProtectedRoute = (path, routerFactory) => {
    if (typeof routerFactory !== 'function') {
        console.warn(`Router factory for ${path} is not a function. Skipping.`);
        return;
    }
    try {
        const router = routerFactory(knex);
        app.use(path, authenticateToken, router); // Applies authenticateToken at the path level
        console.log(`Mounted ${path} with path-level authenticateToken`);
    } catch (e) {
        console.error(`Error mounting ${path}:`, e);
    }
};

// --- Mount Routers ---

// Public Route
try {
    const authRouter = createAuthRouter(knex);
    app.use('/api/auth', authRouter);
    console.log('Mounted /api/auth');
} catch (e) {
    console.error('Error mounting /api/auth:', e);
}

// Pass knex, authenticateToken, authorizeAccess when creating the router instance
const itemsRouter = createItemsRouter(knex, authenticateToken, authorizeAccess);
app.use('/api/items', itemsRouter);
console.log('Mounted /api/items');

// Mount the new item variants router
const itemVariantRoutes = require('./routes/itemVariants'); // No factory function call
app.use('/api/item-variants', itemVariantRoutes);
console.log('Mounted /api/item-variants');

// Apply to routers that are structured to use authenticateToken and authorizeAccess internally
mountProtectedRouter('/api/users', createUsersRouter);
mountProtectedRouter('/api/sales', createSalesRouter);
mountProtectedRouter('/api/employees', createEmployeesRouter);
mountProtectedRouter('/api/suppliers', createSuppliersRouter);
mountProtectedRouter('/api/purchase-orders', createPurchaseOrdersRouter);
mountProtectedRouter('/api/item-units', createItemUnitsRouterFunction); 

// Mount goods receipts router
app.use('/api/goods-receipts', goodsReceiptsRouter);

// Use for routers whose factories only expect `knex` and auth is handled at path level
mountSimpleProtectedRoute('/api/barcode-symbologies', createBarcodeSymbologiesRouter);
mountSimpleProtectedRoute('/api/brands', createBrandsRouter);
mountSimpleProtectedRoute('/api/categories', createCategoriesRouter);
mountSimpleProtectedRoute('/api/discount-types', createDiscountTypesRouter);
mountSimpleProtectedRoute('/api/inventory', createInventoryRouter);
mountSimpleProtectedRoute('/api/manufacturers', createManufacturersRouter);
mountSimpleProtectedRoute('/api/special-categories', createSpecialCategoriesRouter);
mountSimpleProtectedRoute('/api/stores', createStoresRouter);
mountSimpleProtectedRoute('/api/sub-categories', createSubCategoriesRouter);
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
// ... your global error handler ...
app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.message, err.stack || '');
    const statusCode = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred on the server.';

    if (err.name === 'UnauthorizedError') { 
        res.status(401).json({ status: 'error', statusCode: 401, message: 'Invalid or expired token.' });
    } else if (err.status === 401) { 
        res.status(401).json({ status: 'error', statusCode: 401, message: err.message || 'Unauthorized.' });
    } else if (err.status === 403) { 
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
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});