// backend/workers/seoWorker.js

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');
const { analyzeUrl } = require('../services/seoService');
const AnalysisResult = require('../models/AnalysisResult');

function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) {
    logger.info('Worker using existing MongoDB connection');
    return Promise.resolve();
  }

  if (mongoose.connection.readyState === 2) {
    logger.info('Worker waiting for MongoDB connection');
    return mongoose.connection.asPromise();
  }

  return mongoose
    .connect(config.MONGODB_URI)
    .then(() => logger.info('Worker MongoDB connected'));
}

const mongoReady = ensureMongoConnection().catch((err) => {
  logger.error('Worker MongoDB connection error:', err);
  process.exit(1);
});

// Create a Redis connection (same as in server)
const connection = new IORedis(config.REDIS_URL, config.REDIS_OPTIONS);

const worker = new Worker(
  'seoQueue',
  async (job) => {
    await mongoReady;

    const { analysisId, url } = job.data;
    logger.info(`Processing SEO job ${job.id} for URL ${url}`);
    try {
      const report = await analyzeUrl(url);

      // Update the existing document with full report and scores
      await AnalysisResult.findByIdAndUpdate(analysisId, {
        status: 'completed',
        errorMessage: '',
        ...report,
      });

      logger.info(`SEO job ${job.id} completed`);
    } catch (err) {
      logger.error(`SEO job ${job.id} failed: ${err.message}`);
      await AnalysisResult.findByIdAndUpdate(analysisId, {
        errorMessage: err.message,
      });
      // Re‑throw to let BullMQ capture the failure (will be retried per job options)
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', async (job, err) => {
  logger.error(`Job ${job.id} failed with error: ${err.message}`);
  await AnalysisResult.findByIdAndUpdate(job.data.analysisId, {
    status: 'failed',
    errorMessage: err.message,
  });
});

process.on('SIGINT', async () => {
  await worker.close();
  await connection.quit();
  logger.info('Worker shut down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await worker.close();
  await connection.quit();
  logger.info('Worker shut down gracefully');
  process.exit(0);
});

module.exports = worker;
