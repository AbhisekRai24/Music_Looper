const express = require('express');
const router = express.Router();
const projectRoutes = require('./projects');

// @route   GET /api/health
// @desc    Check if backend is running
// @access  Public
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'Server Running' });
});

router.use('/projects', projectRoutes);

module.exports = router;
