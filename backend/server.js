require('dotenv').config();
const express = require('express');
const cors = require('cors');
const knex = require('./db/knex');
const { authenticateToken } = require('./middleware/authMiddleware'); // Import authenticateToken

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

const app = express();

// --- Core Middleware ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Request Logging Middleware ---
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - User: ${req.user ? req.user.id : 'Guest'}`);
    next();
});

// --- Mount Routers ---
// Helper to mount routers, allowing for prepended middleware (like authenticateToken)
const mountRouter = (path, routerCreator, ...middlewares) => {
    if (typeof routerCreator !== 'function') {
        console.warn(`Router creator for ${path} is not a function or is undefined. Skipping mount.`);
        return;
    }
    try {
        const router = routerCreator(knex); // Pass knex instance
        if (middlewares.length > 0) {
            app.use(path, ...middlewares, router);
            console.log(`Mounted ${path} with ${middlewares.map(m => m.name || 'middleware').join(', ')}`);
        } else {
            app.use(path, router);
            console.log(`Mounted ${path}`);
        }
    } catch (error) {
        console.error(`Error creating or mounting router for ${path}:`, error);
    }
};

// Public routes (or routes with their own internal auth)
mountRouter('/api/auth', createAuthRouter);

// Protected routes - apply authenticateToken before these routers
mountRouter('/api/barcode-symbologies', createBarcodeSymbologiesRouter, authenticateToken);
mountRouter('/api/brands', createBrandsRouter, authenticateToken);
mountRouter('/api/categories', createCategoriesRouter, authenticateToken);
mountRouter('/api/discount-types', createDiscountTypesRouter, authenticateToken);
mountRouter('/api/employees', createEmployeesRouter, authenticateToken);
mountRouter('/api/inventory', createInventoryRouter, authenticateToken);
mountRouter('/api/manufacturers', createManufacturersRouter, authenticateToken);
mountRouter('/api/product-units', createProductUnitsRouter, authenticateToken);
mountRouter('/api/products', createProductsRouter, authenticateToken);
mountRouter('/api/sales', createSalesRouter, authenticateToken);
mountRouter('/api/special-categories', createSpecialCategoriesRouter, authenticateToken);
mountRouter('/api/stores', createStoresRouter, authenticateToken); // Getting store list might need auth
mountRouter('/api/sub-categories', createSubCategoriesRouter, authenticateToken);
mountRouter('/api/suppliers', createSuppliersRouter, authenticateToken);
mountRouter('/api/tax-types', createTaxTypesRouter, authenticateToken);
mountRouter('/api/taxes', createTaxesRouter, authenticateToken);
mountRouter('/api/units', createUnitsRouter, authenticateToken);
mountRouter('/api/users', createUsersRouter, authenticateToken);
mountRouter('/api/warranties', createWarrantiesRouter, authenticateToken);


// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error("Global Error Handler Caught:", err.message, err.stack || '');
    let statusCode = err.statusCode || 500;
    let message = err.message || 'An unexpected error occurred on the server.';

    if (err.name === 'UnauthorizedError') { // Example for express-jwt, adjust if using different
        statusCode = 401;
        message = 'Invalid or expired token.';
    }
    // Add more specific error type handling if needed
    // e.g., if (err instanceof MyCustomError) { ... }

    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
        ...(process.env.NODE_ENV === 'development' && { errorDetails: err.stack }),
    });
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