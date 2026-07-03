// backend/models/AnalysisResult.js

const mongoose = require('mongoose');

const SeoReportSchema = new mongoose.Schema({
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // Scores (0-100)
  technicalScore: { type: Number, default: 0 },
  onPageScore: { type: Number, default: 0 },
  performanceScore: { type: Number, default: 0 },
  contentScore: { type: Number, default: 0 },
  overallScore: { type: Number, default: 0 },
  // Detailed sections
  technical: { type: mongoose.Schema.Types.Mixed, default: {} },
  onPage: { type: mongoose.Schema.Types.Mixed, default: {} },
  performance: { type: mongoose.Schema.Types.Mixed, default: {} },
  content: { type: mongoose.Schema.Types.Mixed, default: {} },
  recommendations: { type: [String], default: [] },
});

module.exports = mongoose.model('AnalysisResult', SeoReportSchema);
