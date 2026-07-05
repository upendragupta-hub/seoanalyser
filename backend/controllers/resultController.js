// backend/controllers/resultController.js

const logger = require('../utils/logger');
const mongoose = require('mongoose');
const { getAnalysisResult } = require('../utils/localStore');

/**
 * GET /api/results/:id
 * Returns the analysis status and report if completed.
 */
async function getResult(req, res, next) {
  try {
    const { id } = req.params;
    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const isLocalId = typeof id === 'string' && /^[A-Za-z0-9._:-]+$/.test(id);

    if (!id || (!isMongoId && !isLocalId)) {
      return res.status(400).json({ error: 'Invalid analysis id' });
    }

    const doc = await getAnalysisResult(id);
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
