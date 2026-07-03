// backend/routes/analyze.js

const express = require('express');
const router = express.Router();
const { submitUrl } = require('../controllers/analyzeController');

// POST /api/analyze
router.post('/', submitUrl);

module.exports = router;
