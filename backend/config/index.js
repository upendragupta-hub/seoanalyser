// backend/config/index.js

require('dotenv').config();

function redisOptions() {
  const options = { maxRetriesPerRequest: null };

  if (process.env.REDIS_TLS === 'true' || process.env.REDIS_URL?.startsWith('rediss://')) {
    options.tls = {};
  }

  return options;
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://mongo:27017/seo-analyzer',
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  REDIS_OPTIONS: redisOptions(),
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret', // optional for future auth
};
