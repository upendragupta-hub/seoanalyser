// backend/workers/seoWorker.js

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');
const { analyzeUrl } = require('../services/seoService');
const AnalysisResult = require('../models/AnalysisResult');

// Connect to MongoDB
mongoose
  .connect(config.MONGODB_URI)
  .then(() => logger.info('Worker MongoDB connected'))
  .catch((err) => {
    logger.error('Worker MongoDB connection error:', err);
    process.exit(1);
  });

// Create a Redis connection (same as in server)
const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null, tls: {} });

const worker = new Worker(
  'seoQueue',
  async (job) => {
    const { analysisId, url } = job.data;
    logger.info(`Processing SEO job ${job.id} for URL ${url}`);
    try {
      const report = await analyzeUrl(url);

      // Update the existing document with full report and scores
      await AnalysisResult.findByIdAndUpdate(analysisId, {
        ...report,
      });

      logger.info(`SEO job ${job.id} completed`);
    } catch (err) {
      logger.error(`SEO job ${job.id} failed: ${err.message}`);
      // Re‑throw to let BullMQ capture the failure (will be retried per job options)
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed with error: ${err.message}`);
});

process.on('SIGINT', async () => {
  await worker.close();
  await connection.quit();
  logger.info('Worker shut down gracefully');
  process.exit(0);
});

module.exports = worker;
