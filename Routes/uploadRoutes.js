const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Endpoint: POST /api/upload
router.post('/', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        // Return the file path (relative to the static folder)
        const fileUrl = `/uploads/${req.file.filename}`;
        
        res.status(200).json({ 
            message: 'File uploaded successfully',
            fileUrl,
            fileType: req.file.mimetype,
            fileName: req.file.originalname
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

module.exports = router;
