// backend/server.js

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const analyzeRoutes = require('./routes/analyze');
const resultsRoutes = require('./routes/results');
const config = require('./config');

// Initialize Express app
const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose
  .connect(config.MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Initialize Redis connection for BullMQ
const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });
const seoQueue = new Queue('seoQueue', { connection });
// Make queue accessible via app locals
app.locals.seoQueue = seoQueue;

// Register routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/results', resultsRoutes);

// Global error handling middleware
app.use(errorHandler);

const PORT = config.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

module.exports = app;
