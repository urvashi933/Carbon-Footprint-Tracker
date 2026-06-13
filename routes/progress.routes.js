const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const progressController = require('../controllers/progress.controller');

router.post('/save-progress', authenticateToken, progressController.saveProgress);
router.get('/load-progress', authenticateToken, progressController.loadProgress);

module.exports = router;
