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

// Initialize Express app
const app = express();
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));
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
const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null, tls: {} });
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
