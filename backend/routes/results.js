// backend/routes/results.js

const express = require('express');
const router = express.Router();
const { getResult } = require('../controllers/resultController');

// GET /api/results/:id
router.get('/:id', getResult);

module.exports = router;
