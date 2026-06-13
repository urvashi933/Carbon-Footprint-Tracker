const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');
const { chatLimiter, webLimiter } = require('../middlewares/rateLimit.middleware');

router.post('/chat', chatLimiter, apiController.handleChat);
router.post('/check-website', webLimiter, apiController.checkWebsite);

module.exports = router;
