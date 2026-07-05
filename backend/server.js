// backend/server.js

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const analyzeRoutes = require('./routes/analyze');
const resultsRoutes = require('./routes/results');
const config = require('./config');
const { createFallbackQueue } = require('./utils/localStore');

// Initialize Express app
const app = express();
app.use(helmet());
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  ...(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'https:' && /^seoanalyser-[a-z0-9-]+\.vercel\.app$/.test(hostname);
  } catch (err) {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, Postman)
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB (best-effort, local fallback if unavailable)
mongoose
  .connect(config.MONGODB_URI)
  .then(() => logger.info('MongoDB connected'))
  .catch((err) => {
    logger.warn(`MongoDB unavailable, using local fallback: ${err.message}`);
  });

let seoQueue;
try {
  const connection = new IORedis(config.REDIS_URL, config.REDIS_OPTIONS);
  seoQueue = new Queue('seoQueue', { connection });
  logger.info('Redis/BullMQ queue initialized');
} catch (err) {
  logger.warn(`Redis unavailable, using local fallback queue: ${err.message}`);
  seoQueue = createFallbackQueue();
}

// Make queue accessible via app locals
app.locals.seoQueue = seoQueue;

if (process.env.START_WORKER === 'true') {
  require('./workers/seoWorker');
  logger.info('SEO worker started in server process');
}

// Register routes
app.use('/api/analyze', analyzeRoutes);
app.use('/api/results', resultsRoutes);

// Global error handling middleware
app.use(errorHandler);

const PORT = Number(config.PORT || 5000);
const startServer = (port) => {
  const server = app.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is busy, trying ${port + 1}`);
      server.close(() => startServer(port + 1));
      return;
    }

    logger.error('Server startup error:', err);
    process.exit(1);
  });
};

startServer(PORT);

module.exports = app;
