const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the storage directory
const storageDir = path.join(__dirname, '..', 'uploads', 'barcodes');

// Ensure the storage directory exists
if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
}

// Set up storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, storageDir); // Files will be saved in 'backend/uploads/barcodes/'
    },
    filename: function (req, file, cb) {
        // Create a unique filename: fieldname-timestamp.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Error: File upload only supports the following filetypes - ' + allowedTypes), false);
};

// Initialize multer with storage and file filter
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB file size limit
    },
    fileFilter: fileFilter
});

module.exports = { upload };