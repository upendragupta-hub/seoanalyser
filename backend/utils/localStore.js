const logger = require('./logger');
const { analyzeUrl } = require('../services/seoService');

const memoryStore = new Map();
let sequence = 0;

function generateId() {
  sequence += 1;
  return `local-${Date.now()}-${sequence}`;
}

function normalizeDoc(doc) {
  if (!doc) return null;
  return {
    ...doc,
    _id: doc._id,
    createdAt: doc.createdAt || new Date(),
  };
}

async function createAnalysisResult(data) {
  const doc = {
    _id: data._id || generateId(),
    url: data.url,
    createdAt: new Date(),
    status: data.status || 'pending',
    errorMessage: data.errorMessage || '',
    technicalScore: 0,
    onPageScore: 0,
    performanceScore: 0,
    contentScore: 0,
    overallScore: 0,
    technical: {},
    onPage: {},
    performance: {},
    content: {},
    recommendations: [],
    ...data,
  };

  memoryStore.set(doc._id, doc);
  return normalizeDoc(doc);
}

async function getAnalysisResult(id) {
  const doc = memoryStore.get(id);
  return normalizeDoc(doc);
}

async function updateAnalysisResult(id, updates) {
  const existing = memoryStore.get(id) || { _id: id };
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  };

  memoryStore.set(id, updated);
  return normalizeDoc(updated);
}

function createFallbackQueue() {
  return {
    async add(name, data, options) {
      const jobId = generateId();
      setImmediate(async () => {
        try {
          const report = await analyzeUrl(data.url);
          await updateAnalysisResult(data.analysisId, {
            status: 'completed',
            errorMessage: '',
            ...report,
          });
        } catch (err) {
          logger.error(`Fallback queue job ${jobId} failed: ${err.message}`);
          await updateAnalysisResult(data.analysisId, {
            status: 'failed',
            errorMessage: err.message,
          });
        }
      });

      return { id: jobId };
    },
  };
}

module.exports = {
  createAnalysisResult,
  getAnalysisResult,
  updateAnalysisResult,
  createFallbackQueue,
  memoryStore,
};
