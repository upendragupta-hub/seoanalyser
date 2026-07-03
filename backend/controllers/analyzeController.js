// backend/controllers/analyzeController.js

const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const AnalysisResult = require('../models/AnalysisResult');

/**
 * Validate the incoming request body – it must contain a valid URL string.
 */
const validate = [
  body('url')
    .isURL({ require_protocol: true })
    .withMessage('A valid URL with protocol (http/https) is required'),
];

/**
 * Controller for POST /api/analyze
 *   - validates URL
 *   - creates a placeholder document in MongoDB (status pending)
 *   - enqueues a job in BullMQ
 *   - returns jobId and status "queued"
 */
async function submitUrl(req, res, next) {
  try {
    // Run validators
    await Promise.all(validate.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url } = req.body;

    // Create a pending document – results will be filled by the worker later
    const placeholder = new AnalysisResult({ url });
    await placeholder.save();

    const queue = req.app.locals.seoQueue;
    const job = await queue.add('seoJob', { analysisId: placeholder._id, url }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    logger.info(`Enqueued SEO job ${job.id} for URL ${url}`);
    res.status(202).json({ jobId: placeholder._id, status: 'queued' });
  } catch (err) {
    next(err);
  }
}

module.exports = { submitUrl, validate };
