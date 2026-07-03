// backend/middlewares/errorHandler.js

const logger = require('../utils/logger');

/**
 * Global error handling middleware for Express.
 * Logs the error and sends a generic JSON response.
 */
function errorHandler(err, req, res, next) {
  logger.error(err.stack || err.message || err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    // In production you might omit stack trace
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
