require('dotenv').config(); // Load environment variables at the very top
const express = require('express');
const cors = require('cors');
const morgan = require('morgan'); // For HTTP request logging

// --- Knex Database Setup ---
const knexConfig = require('./knexfile');
const environment = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[environment]);

// --- Middleware Imports ---
// ####################################################################################
// #                                                                                  #
// #  >>>>> CRITICAL ERROR LOCATION <<<<<                                             #
// #                                                                                  #
// # The error "column 'email' does not exist" originates from the                    #
// # 'authenticateToken' function in the file:                                        #
// #                                                                                  #
// #          >>>   ./middleware/authMiddleware.js   <<<                             #
// #                                                                                  #
// # You MUST modify the Knex database query inside that 'authenticateToken' function #
// # to select only columns that actually exist in your 'users' table.                #
// # For example, remove 'email' and 'store_id' from its SELECT statement if they     #
// # are not in the 'users' table.                                                    #
// #                                                                                  #
// ####################################################################################
const { authenticateToken, authorizeRole } = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');

// --- Role Constants Import ---
const ROLES = require('./utils/roles');

// --- Router Imports (Creator Functions) ---
const createAuthRouter = require('./routes/auth');
const createUsersRouter = require('./routes/users');
const createStoresRouter = require('./routes/stores');
const createEmployeesRouter = require('./routes/employees');
const createProductsRouter = require('./routes/products');
const createCategoriesRouter = require('./routes/categories');
const createSubCategoriesRouter = require('./routes/sub_categories');
const createBrandsRouter = require('./routes/brands');
const createUnitsRouter = require('./routes/units');
const createSuppliersRouter = require('./routes/suppliers');
const createTaxTypesRouter = require('./routes/tax_types');
const createTaxesRouter = require('./routes/taxes');
const createManufacturersRouter = require('./routes/manufacturers');
const createWarrantiesRouter = require('./routes/warranties');
const createBarcodeSymbologiesRouter = require('./routes/barcode_symbologies');
const createDiscountTypesRouter = require('./routes/discount_types');
const createSpecialCategoriesRouter = require('./routes/special_categories');
const createInventoryRouter = require('./routes/inventory');
const createSalesRouter = require('./routes/sales');
// Add other router imports as needed

// --- Express App Setup ---
const app = express();

// --- Basic Global Middleware ---
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(environment === 'development' ? 'dev' : 'common'));

// --- Mount Public Routers ---
// Authentication routes (login, etc.) are public and do not require prior token authentication.
app.use('/api/auth', createAuthRouter(knex)); // `authenticateToken` is NOT applied here

// --- Apply Global Authentication for Protected API Routes ---
// All routes defined under '/api' AFTER this line will first pass through `authenticateToken`
// from './middleware/authMiddleware.js'.
// If the token is valid, `req.user` should be populated.
// THE ERROR "column 'email' does not exist" ORIGINATES FROM THE `authenticateToken`
// FUNCTION IN './middleware/authMiddleware.js' DUE TO AN INCORRECT DATABASE QUERY.
// THIS `server.js` FILE IS CORRECTLY *USING* THE MIDDLEWARE; THE MIDDLEWARE ITSELF IS FLAWED.
app.use('/api', authenticateToken);

// --- Mount Protected Routers ---
// These routes are now protected by the global `authenticateToken` above.
// `authorizeRole` can be used for more granular, role-based access control.

// Users route: Example - only GLOBAL_ADMIN can access user management.
app.use('/api/users', authorizeRole(ROLES.GLOBAL_ADMIN), createUsersRouter(knex, authorizeRole, ROLES));

// Employees route: Example - GLOBAL_ADMIN or STORE_ADMIN can manage employees.
app.use('/api/employees', authorizeRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]), createEmployeesRouter(knex, authorizeRole, ROLES));

// Other protected routers:
app.use('/api/stores', createStoresRouter(knex, authorizeRole, ROLES));
app.use('/api/products', createProductsRouter(knex, authorizeRole, ROLES));
// For /api/categories, the global `authenticateToken` runs.
// The createCategoriesRouter can then choose to make specific sub-routes (like GET /) public
// or use `authorizeRole` for POST, PUT, DELETE.
app.use('/api/categories', createCategoriesRouter(knex, authorizeRole, ROLES));
app.use('/api/sub-categories', createSubCategoriesRouter(knex, authorizeRole, ROLES));
app.use('/api/brands', createBrandsRouter(knex, authorizeRole, ROLES));
app.use('/api/units', createUnitsRouter(knex, authorizeRole, ROLES));
app.use('/api/suppliers', createSuppliersRouter(knex, authorizeRole, ROLES));
app.use('/api/tax-types', createTaxTypesRouter(knex, authorizeRole, ROLES));
app.use('/api/taxes', createTaxesRouter(knex, authorizeRole, ROLES));
app.use('/api/manufacturers', createManufacturersRouter(knex, authorizeRole, ROLES));
app.use('/api/warranties', createWarrantiesRouter(knex, authorizeRole, ROLES));
app.use('/api/barcode-symbologies', createBarcodeSymbologiesRouter(knex, authorizeRole, ROLES));
app.use('/api/discount-types', createDiscountTypesRouter(knex, authorizeRole, ROLES));
app.use('/api/special-categories', createSpecialCategoriesRouter(knex, authorizeRole, ROLES));
app.use('/api/inventory', createInventoryRouter(knex, authorizeRole, ROLES));
app.use('/api/sales', createSalesRouter(knex, authorizeRole, ROLES));


// --- 404 Handler (Not Found) ---
app.use(notFoundHandler);

// --- Global Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running in ${environment} mode on port ${PORT}`);
    knex.raw('SELECT 1 AS result')
        .then(() => console.log('Database connection successful.'))
        .catch(dbError => {
            console.error('Database connection failed:', dbError.message); // Log only message for brevity
        });
});