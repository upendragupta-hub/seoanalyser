// backend/controllers/resultController.js

const AnalysisResult = require('../models/AnalysisResult');
const logger = require('../utils/logger');

/**
 * GET /api/results/:id
 * Returns the analysis status and report if completed.
 */
async function getResult(req, res, next) {
  try {
    const { id } = req.params;
    const doc = await AnalysisResult.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    // Determine status based on whether scores have been populated
    const isCompleted =
      typeof doc.overallScore === 'number' && doc.overallScore > 0;

    const response = {
      status: isCompleted ? 'completed' : 'processing',
    };

    if (isCompleted) {
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
