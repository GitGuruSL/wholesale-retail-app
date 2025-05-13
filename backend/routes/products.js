const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const productController = require('../controllers/productController');
// const { ROLES } = require('../utils/roles'); // Controller handles role checks internally now

// --- Multer Setup for File Uploads (e.g., barcode image) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, '..', 'public', 'uploads', 'products', 'barcodes');
        fs.mkdirSync(uploadPath, { recursive: true }); // Ensure directory exists
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `barcode-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 2 } // 2MB limit
});
// --- End Multer Setup ---


function createProductsRouter(knex, authenticateToken, checkPermission) {
    const router = express.Router();
    console.log('[PRODUCTS.JS Router] createProductsRouter called.');

    // GET /api/products - List products
    router.get('/', authenticateToken, checkPermission(null, ['product:read']), productController.getProducts);

    // GET /api/products/:id - Fetch single product
    router.get('/:id', authenticateToken, checkPermission(null, ['product:read']), productController.getProductById);

    // POST /api/products - Create a new product
    // 'barcode_image' should match the name attribute of your file input in the frontend form
    router.post('/', authenticateToken, checkPermission(null, ['product:create']), upload.single('barcode_image'), productController.createProduct);

    // PUT /api/products/:id - Update a product
    router.put('/:id', authenticateToken, checkPermission(null, ['product:update']), upload.single('barcode_image'), productController.updateProduct);

    // DELETE /api/products/:id - Delete a product
    router.delete('/:id', authenticateToken, checkPermission(null, ['product:delete']), productController.deleteProduct);

    console.log('[PRODUCTS.JS Router] Product router instance configured.');
    return router;
}

module.exports = createProductsRouter;