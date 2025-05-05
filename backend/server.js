// backend/server.js

// Load environment variables from .env file first
require('dotenv').config();

// Import necessary modules
const express = require('express');
const cors = require('cors'); // For handling Cross-Origin Resource Sharing
const knexConfig = require('./knexfile'); // Knex configuration from knexfile.js
const knex = require('knex')(knexConfig[process.env.NODE_ENV || 'development']); // Initialize Knex based on environment

// --- Import Route Factory Functions ---
// These functions create the specific routers, passing the knex instance
const createProductsRouter = require('./routes/products');
const createCategoriesRouter = require('./routes/categories');
const createSubCategoriesRouter = require('./routes/sub_categories');
const createBrandsRouter = require('./routes/brands');
const createUnitsRouter = require('./routes/units'); // Manages simplified unit definitions
const createProductUnitsRouter = require('./routes/product_units'); // Manages product-specific unit configs
const createSuppliersRouter = require('./routes/suppliers');
const createTaxesRouter = require('./routes/taxes');
const createManufacturersRouter = require('./routes/manufacturers');
const createWarrantiesRouter = require('./routes/warranties');
const createDiscountTypesRouter = require('./routes/discount_types'); // <-- Import
const createStoresRouter = require('./routes/stores');
const createTaxTypesRouter = require('./routes/tax_types');
const createBarcodeSymbologiesRouter = require('./routes/barcode_symbologies');
const createSpecialCategoriesRouter = require('./routes/special_categories');
// Import any other routers as you create them (e.g., users, orders, stock)

// --- Initialize Express App ---
const app = express();
// Determine the port from environment variables or use a default
const PORT = process.env.PORT || 5001;

// --- Database Connection Test ---
// Attempt a simple query on startup to verify the database connection
knex.raw('SELECT 1 AS result')
  .then(() => {
    console.log('PostgreSQL connected successfully using Knex.');
  })
  .catch((e) => {
    // Log detailed error and exit if connection fails - essential for diagnosing startup issues
    console.error('FATAL: PostgreSQL connection error:', e.message);
    console.error('Stack:', e.stack);
    console.error('Please check your database server status and .env connection settings (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).');
    process.exit(1); // Exit the application if DB connection fails
  });

// --- Global Middleware ---

// Enable CORS: Allows requests from your frontend (running on a different port)
// For production, restrict the origin: app.use(cors({ origin: 'YOUR_FRONTEND_URL' }));
app.use(cors());

// Parse incoming JSON request bodies: Makes `req.body` available for POST/PUT requests
app.use(express.json());

// Optional: Basic request logger middleware
app.use((req, res, next) => {
    // Log method, URL, and timestamp for each incoming request
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next(); // Pass control to the next middleware or route handler
});


// --- API Root Route ---
// A simple endpoint to check if the API is alive and responding
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Wholesale Retail API! Status: OK' });
});

// --- Mount Application Routers ---
// Define the base path for each router and pass the knex instance
// Order generally doesn't matter unless routes overlap significantly
app.use('/api/products', createProductsRouter(knex));
app.use('/api/categories', createCategoriesRouter(knex));
app.use('/api/sub-categories', createSubCategoriesRouter(knex));
app.use('/api/brands', createBrandsRouter(knex));
app.use('/api/units', createUnitsRouter(knex)); // Manages unit names
app.use('/api/product-units', createProductUnitsRouter(knex)); // Manages product-specific conversions
app.use('/api/suppliers', createSuppliersRouter(knex));
app.use('/api/taxes', createTaxesRouter(knex));
app.use('/api/manufacturers', createManufacturersRouter(knex));
app.use('/api/warranties', createWarrantiesRouter(knex));
app.use('/api/discount-types', createDiscountTypesRouter(knex)); // <-- Mount
app.use('/api/stores', createStoresRouter(knex)); 
app.use('/api/tax-types', createTaxTypesRouter(knex))
app.use('/api/barcode-symbologies', createBarcodeSymbologiesRouter(knex));
app.use('/api/special-categories', createSpecialCategoriesRouter(knex));
// Mount other routers here as needed...
// e.g., app.use('/api/users', createUserRouter(knex));


// --- API 404 Handler ---
// This middleware runs only if no preceding '/api/...' route matched the request
app.use('/api', (req, res, next) => {
    // Respond with a 404 for any unmatched API routes
    res.status(404).json({ message: 'API endpoint not found.' });
});


// --- Global Error Handling Middleware ---
// Express identifies this as an error handler by its four arguments (err, req, res, next)
// It catches errors thrown synchronously or passed via next(err) in route handlers
// NOTE: Must be defined *last*, after all other app.use() and route calls
app.use((err, req, res, next) => {
    // Log the error stack trace to the console for debugging
    console.error("Unhandled Error:", err.stack || err);

    // Send a generic error response to the client
    // Avoid leaking sensitive error details (like stack traces) in production environments
    res.status(err.status || 500).json({ // Use error status if available, otherwise default to 500
        message: err.message || 'An unexpected server error occurred. Please try again later.',
        // Optionally include more details only during development
        ...(process.env.NODE_ENV === 'development' && { error_type: err.name, details: err.toString() }),
    });
});


// --- Start Server ---
// Begin listening for incoming connections on the specified port
app.listen(PORT, () => {
  console.log(`Backend server is running and listening on http://localhost:${PORT}`);
  console.log(`Current Environment: ${process.env.NODE_ENV || 'development'}`);
});
