const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectController = require('../controllers/projectController');
const path = require('path');

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Relative to server root
    },
    filename: function (req, file, cb) {
        // Appending standard webm/mp4 extension or just relying on originalname is okay
        const ext = file.originalname && file.originalname !== 'blob'
            ? path.extname(file.originalname) || '.webm'
            : '.webm';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

router.post('/', upload.any(), projectController.saveProject);
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
