// backend/services/seoService.js

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { URL } = require('url');
const axios = require('axios');
const { calculateScores } = require('../utils/scoreCalculator');
const logger = require('../utils/logger');

/**
 * Main entry point for SEO analysis.
 * @param {string} targetUrl - URL to analyze (must include protocol).
 * @returns {Promise<Object>} - Detailed report object.
 */
async function analyzeUrl(targetUrl) {
  logger.info(`Starting analysis for ${targetUrl}`);

  // 1️⃣ Fetch raw HTML using Puppeteer (handles JS-rendered pages)
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let html;
  let finalUrl;
  let redirects = [];

  try {
    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    html = await page.content();
    finalUrl = page.url(); // after redirects
    redirects = page.redirectChain ? page.redirectChain().map((r) => r.url()) : [];
  } finally {
    await browser.close();
  }

  const $ = cheerio.load(html);

  // ---------- On‑page SEO ----------
  const title = $('title').text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const hTags = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
  for (let i = 1; i <= 6; i++) {
    $(`h${i}`).each((_, el) => hTags[`h${i}`].push($(el).text().trim()));
  }
  const images = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || '';
    const alt = $(el).attr('alt') || '';
    images.push({ src, alt });
  });
  const internalLinks = [];
  const externalLinks = [];
  const baseDomain = new URL(finalUrl).hostname;
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    try {
      const linkUrl = new URL(href, finalUrl);
      if (linkUrl.hostname === baseDomain) internalLinks.push(linkUrl.href);
      else externalLinks.push(linkUrl.href);
    } catch (_) {}
  });

  // ---------- Technical SEO ----------
  const isHttps = finalUrl.startsWith('https://');
  const robotsTxtUrl = `${new URL(finalUrl).origin}/robots.txt`;
  const sitemapUrl = `${new URL(finalUrl).origin}/sitemap.xml`;
  const [robotsResp, sitemapResp] = await Promise.all([
    axios
      .get(robotsTxtUrl, { timeout: 5000 })
      .then((r) => r.data)
      .catch(() => null),
    axios
      .get(sitemapUrl, { timeout: 5000 })
      .then((r) => r.data)
      .catch(() => null),
  ]);
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const indexable = !robotsResp || !/noindex/.test(robotsResp);
  const structuredData = [];
  $('[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      structuredData.push(json);
    } catch (_) {}
  });

  // ---------- Performance (Lighthouse) ----------
  const performance = await getPerformanceMetrics(finalUrl);

  // ---------- Content Analysis ----------
  const textContent = $('body').text().replace(/\s+/g, ' ').trim();
  const contentLength = textContent.length;
  const wordCount = textContent.split(/\s+/).filter(Boolean).length;
  // Simple keyword presence (example: look for "SEO")
  const keyword = 'seo';
  const keywordCount = (textContent.toLowerCase().match(new RegExp(keyword, 'g')) || []).length;
  // Readability score using Flesch‑Kincaid (approximation)
  const readability = calculateReadability(textContent);

  // ---------- Open Graph / Twitter metadata ----------
  const og = {};
  $('meta[property^="og:"]').each((_, el) => {
    const property = $(el).attr('property');
    const content = $(el).attr('content');
    if (property && content) og[property] = content;
  });
  const twitter = {};
  $('meta[name^="twitter:"]').each((_, el) => {
    const name = $(el).attr('name');
    const content = $(el).attr('content');
    if (name && content) twitter[name] = content;
  });

  // Assemble raw data object
  const rawReport = {
    url: finalUrl,
    onPage: {
      title,
      metaDescription,
      headings: hTags,
      images,
      internalLinksCount: internalLinks.length,
      externalLinksCount: externalLinks.length,
    },
    technical: {
      isHttps,
      robotsTxt: robotsResp !== null,
      sitemapXml: sitemapResp !== null,
      canonical,
      redirects,
      indexable,
      structuredDataCount: structuredData.length,
    },
    performance,
    content: {
      contentLength,
      wordCount,
      keyword: keyword,
      keywordCount,
      readability,
    },
    social: {
      openGraph: og,
      twitter,
    },
  };

  // ---------- Scoring ----------
  const scores = calculateScores(rawReport);

  // Merge scores into report
  const fullReport = { ...rawReport, ...scores };

  return fullReport;
}

/**
 * Run Lighthouse programmatically in a headless Chrome instance.
 * Returns the full Lighthouse result object.
 */
async function runLighthouse(url) {
  const chrome = await puppeteer.launch({ args: ['--no-sandbox', '--headless'] });
  try {
    const { port } = new URL(chrome.wsEndpoint());

    // Dynamically import lighthouse (ESM)
    const lh = await import('lighthouse');
    const lighthouseFn = lh.default || lh;

    return await lighthouseFn(url, {
      port: Number(port),
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance'],
    });
  } finally {
    await chrome.close();
  }
}

async function getPerformanceMetrics(url) {
  try {
    const lhResult = await runLighthouse(url);
    const lhAudits = lhResult.lhr;

    return {
      performanceScore: lhAudits.categories.performance.score * 100,
      lcp: lhAudits.audits['largest-contentful-paint'].numericValue,
      fcp: lhAudits.audits['first-contentful-paint'].numericValue,
      cls: lhAudits.audits['cumulative-layout-shift'].numericValue,
      tbt: lhAudits.audits['total-blocking-time'].numericValue,
    };
  } catch (err) {
    logger.error(`Lighthouse failed for ${url}: ${err.message}`);
    return {
      performanceScore: 0,
      lcp: null,
      fcp: null,
      cls: null,
      tbt: null,
      error: err.message,
    };
  }
}

/**
 * Simple Flesch‑Kincaid readability estimator.
 */
function calculateReadability(text) {
  const sentences = text.split(/[.!?]+/).filter(Boolean).length || 1;
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const syllables = text
    .toLowerCase()
    .match(/[aeiouy]{1,2}/g)?.length || 1;
  const flesch = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Number(flesch.toFixed(2));
}

module.exports = { analyzeUrl };
