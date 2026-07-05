// backend/controllers/resultController.js

const AnalysisResult = require('../models/AnalysisResult');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

/**
 * GET /api/results/:id
 * Returns the analysis status and report if completed.
 */
async function getResult(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid analysis id' });
    }

    const doc = await AnalysisResult.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const response = {
      status: doc.status || 'processing',
    };

    if (doc.status === 'failed') {
      response.error = doc.errorMessage || 'Analysis failed';
    }

    if (doc.status === 'completed') {
      response.report = {
        url: doc.url,
        technicalScore: doc.technicalScore,
        onPageScore: doc.onPageScore,
        performanceScore: doc.performanceScore,
        contentScore: doc.contentScore,
        overallScore: doc.overallScore,
        technical: doc.technical,
        onPage: doc.onPage,
        performance: doc.performance,
        content: doc.content,
        recommendations: doc.recommendations,
      };
    }

    res.json(response);
  } catch (err) {
    logger.error('Error fetching result:', err);
    next(err);
  }
}

module.exports = { getResult };
