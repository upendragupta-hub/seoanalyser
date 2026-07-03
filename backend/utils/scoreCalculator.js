// backend/utils/scoreCalculator.js

/**
 * Scoring weights (must sum to 100)
 *   Technical SEO: 30%
 *   On‑page SEO:   30%
 *   Performance:   20%
 *   Content:       20%
 */
const WEIGHTS = {
  technical: 0.3,
  onPage: 0.3,
  performance: 0.2,
  content: 0.2,
};

/**
 * Calculate individual sub‑scores (0‑100) based on raw data.
 * Each sub‑score uses a simple heuristic; in a real product you would refine these.
 */
function technicalScore(data) {
  let score = 0;
  const checks = [];

  // HTTPS
  checks.push(data.technical.isHttps ? 1 : 0);
  // robots.txt presence
  checks.push(data.technical.robotsTxt ? 1 : 0);
  // sitemap.xml presence
  checks.push(data.technical.sitemapXml ? 1 : 0);
  // canonical tag
  checks.push(data.technical.canonical ? 1 : 0);
  // indexable (robots no noindex)
  checks.push(data.technical.indexable ? 1 : 0);
  // structured data count (at least one is good)
  checks.push(data.technical.structuredDataCount > 0 ? 1 : 0);

  score = (checks.reduce((a, b) => a + b, 0) / checks.length) * 100;
  return Math.round(score);
}

function onPageScore(data) {
  let score = 0;
  const checks = [];

  // Title presence and length (ideal 50–60 chars)
  const titleLen = data.onPage.title.length;
  checks.push(titleLen > 0 ? 1 : 0);
  checks.push(titleLen >= 50 && titleLen <= 60 ? 1 : 0);

  // Meta description presence and length (ideal 150‑160)
  const descLen = data.onPage.metaDescription.length;
  checks.push(descLen > 0 ? 1 : 0);
  checks.push(descLen >= 150 && descLen <= 160 ? 1 : 0);

  // H1 presence (at least one)
  checks.push(data.onPage.headings.h1.length > 0 ? 1 : 0);

  // Image alt text coverage
  const images = data.onPage.images || [];
  const altFilled = images.filter((i) => i.alt && i.alt.trim().length > 0).length;
  const altScore = images.length === 0 ? 1 : altFilled / images.length;
  checks.push(altScore);

  // Internal / external link ratio (simple heuristic)
  const totalLinks = data.onPage.internalLinksCount + data.onPage.externalLinksCount;
  if (totalLinks > 0) {
    const internalRatio = data.onPage.internalLinksCount / totalLinks;
    checks.push(internalRatio >= 0.2 ? 1 : 0); // at least 20% internal
  } else {
    checks.push(0);
  }

  score = (checks.reduce((a, b) => a + b, 0) / checks.length) * 100;
  return Math.round(score);
}

function performanceScore(data) {
  // Lighthouse already returns a percentage score (0‑100)
  return Math.round(data.performance.performanceScore || 0);
}

function contentScore(data) {
  let score = 0;
  const checks = [];

  // Content length (ideal > 300 words)
  checks.push(data.content.wordCount >= 300 ? 1 : 0);

  // Keyword density (simple check for presence)
  checks.push(data.content.keywordCount > 0 ? 1 : 0);

  // Readability (Flesch‑Kincaid: >= 60 is easy to read)
  checks.push(data.content.readability >= 60 ? 1 : 0);

  score = (checks.reduce((a, b) => a + b, 0) / checks.length) * 100;
  return Math.round(score);
}

/**
 * Combine the sub‑scores using the defined weights and generate recommendations.
 */
function calculateScores(rawReport) {
  const tech = technicalScore(rawReport);
  const onPage = onPageScore(rawReport);
  const perf = performanceScore(rawReport);
  const cont = contentScore(rawReport);

  const overall = Math.round(
    tech * WEIGHTS.technical +
      onPage * WEIGHTS.onPage +
      perf * WEIGHTS.performance +
      cont * WEIGHTS.content
  );

  // Generate simple recommendations based on missing/weak aspects
  const recommendations = [];

  // Technical
  if (!rawReport.technical.isHttps) recommendations.push('Enable HTTPS/SSL for the site');
  if (!rawReport.technical.robotsTxt) recommendations.push('Add a robots.txt file');
  if (!rawReport.technical.sitemapXml) recommendations.push('Create a sitemap.xml');
  if (!rawReport.technical.canonical) recommendations.push('Add a canonical tag');
  if (!rawReport.technical.indexable) recommendations.push('Allow indexing via robots.txt');
  if (rawReport.technical.structuredDataCount === 0) recommendations.push('Add structured data (JSON‑LD)');

  // On‑page
  if (!rawReport.onPage.title) recommendations.push('Add a meta title');
  if (rawReport.onPage.title && (rawReport.onPage.title.length < 50 || rawReport.onPage.title.length > 60))
    recommendations.push('Adjust meta title length to 50‑60 characters');
  if (!rawReport.onPage.metaDescription) recommendations.push('Add a meta description');
  if (rawReport.onPage.metaDescription && (rawReport.onPage.metaDescription.length < 150 || rawReport.onPage.metaDescription.length > 160))
    recommendations.push('Adjust meta description length to 150‑160 characters');
  if (rawReport.onPage.headings.h1.length === 0) recommendations.push('Add at least one H1 heading');
  const imagesMissingAlt = (rawReport.onPage.images || []).filter((i) => !i.alt || i.alt.trim().length === 0);
  if (imagesMissingAlt.length > 0) recommendations.push(`Add alt attributes to ${imagesMissingAlt.length} image(s)`);

  // Performance
  if (perf < 80) recommendations.push('Improve performance – consider optimizing images, reducing JS/CSS');

  // Content
  if (cont < 80) recommendations.push('Enhance content quality – increase length, improve readability, add target keywords');

  return {
    technicalScore: tech,
    onPageScore: onPage,
    performanceScore: perf,
    contentScore: cont,
    overallScore: overall,
    recommendations,
  };
}

module.exports = { calculateScores };
