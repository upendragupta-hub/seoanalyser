// backend/config/index.js

require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://mongo:27017/seo-analyzer',
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'change_this_secret', // optional for future auth
};
