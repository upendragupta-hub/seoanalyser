// backend/workers/seoWorker.js

const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');
const { analyzeUrl } = require('../services/seoService');
const AnalysisResult = require('../models/AnalysisResult');
const { updateAnalysisResult } = require('../utils/localStore');

async function ensureMongoConnection() {
  if (mongoose.connection.readyState === 1) {
    logger.info('Worker using existing MongoDB connection');
    return true;
  }

  if (mongoose.connection.readyState === 2) {
    logger.info('Worker waiting for MongoDB connection');
    try {
      await mongoose.connection.asPromise();
      logger.info('Worker MongoDB connected');
      return true;
    } catch (err) {
      logger.warn(`Worker MongoDB unavailable, using local fallback: ${err.message}`);
      return false;
    }
  }

  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('Worker MongoDB connected');
    return true;
  } catch (err) {
    logger.warn(`Worker MongoDB unavailable, using local fallback: ${err.message}`);
    return false;
  }
}

const mongoReady = ensureMongoConnection();

// Create a Redis connection (same as in server)
const connection = new IORedis(config.REDIS_URL, config.REDIS_OPTIONS);

async function persistResult(analysisId, updates) {
  const useMongo = mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(analysisId);

  if (useMongo) {
    try {
      return await AnalysisResult.findByIdAndUpdate(analysisId, updates, { new: true });
    } catch (err) {
      logger.warn(`Mongo update failed for ${analysisId}: ${err.message}`);
    }
  }

  return updateAnalysisResult(analysisId, updates);
}

const worker = new Worker(
  'seoQueue',
  async (job) => {
    await mongoReady;

    const { analysisId, url } = job.data;
    logger.info(`Processing SEO job ${job.id} for URL ${url}`);
    try {
      const report = await analyzeUrl(url);

      await persistResult(analysisId, {
        status: 'completed',
        errorMessage: '',
        ...report,
      });

      logger.info(`SEO job ${job.id} completed`);
    } catch (err) {
      logger.error(`SEO job ${job.id} failed: ${err.message}`);
      await persistResult(analysisId, {
        status: 'failed',
        errorMessage: err.message,
      });
      throw err;
    }
  },
  {
    connection,
    concurrency: 1,
    lockDuration: 10 * 60 * 1000,
    stalledInterval: 60 * 1000,
    maxStalledCount: 2,
  }
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', async (job, err) => {
  logger.error(`Job ${job.id} failed with error: ${err.message}`);
  await persistResult(job.data.analysisId, {
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
