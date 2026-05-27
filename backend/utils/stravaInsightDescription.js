const RUNADVISOR_MARKER = '🏃 RunAdvisor';
const RUNADVISOR_LEGACY_MARKER = '--- RunAdvisor';

function defaultSiteUrl() {
  return String(
    process.env.FRONTEND_URL ||
    process.env.REACT_APP_SITE_URL ||
    'https://runadvisor.fit'
  ).replace(/\/$/, '');
}

function descriptionHasRunAdvisorInsight(description) {
  const text = String(description || '');
  return (
    text.includes(RUNADVISOR_MARKER)
    || text.includes(RUNADVISOR_LEGACY_MARKER)
    || /RunAdvisor:\s*https?:\/\//i.test(text)
    || /\brunadvisor\.fit\b/i.test(text)
  );
}

function stripRunAdvisorBlock(description) {
  const text = String(description || '').trim();
  if (!text) {
    return '';
  }

  const divider = text.indexOf('\n---\n');
  if (divider >= 0) {
    const head = text.slice(0, divider);
    if (descriptionHasRunAdvisorInsight(head)) {
      return text.slice(divider + 5).trim();
    }
    return text;
  }

  if (descriptionHasRunAdvisorInsight(text)) {
    return '';
  }

  return text;
}

/**
 * Strava activity description: exactly two lines + optional athlete notes below.
 * Line 1: text-only activity summary (no metrics)
 * Line 2: RunAdvisor site name and URL
 */
function buildActivitySummaryLine(insight) {
  let line = (insight?.tldr || insight?.summary || 'Solid run — insights on RunAdvisor.')
    .replace(/^TL;DR:\s*/i, '')
    .trim();

  // Drop embedded metric fragments if the narrative still contains them
  line = line
    .replace(/\d+(\.\d+)?\s*km/gi, '')
    .replace(/\d+:\d{2}\s*\/\s*km/gi, '')
    .replace(/\d+(\.\d+)?\s*min/gi, '')
    .replace(/\s*·\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!line || line.length < 8) {
    const highlight = insight?.highlights?.[0];
    line = highlight
      ? `${highlight} — see RunAdvisor for pacing and load details.`
      : 'Good effort — open RunAdvisor for pacing and recovery context.';
  }

  if (line.length > 160) {
    return `${line.slice(0, 157).trim()}…`;
  }

  return line.endsWith('.') ? line : `${line}.`;
}

function buildSiteLine(siteUrl) {
  const site = (siteUrl || defaultSiteUrl()).replace(/\/$/, '');
  return `RunAdvisor · ${site}`;
}

function buildStravaInsightDescription(insight, existingDescription = '', siteUrl) {
  const original = stripRunAdvisorBlock(existingDescription);
  const line1 = buildActivitySummaryLine(insight);
  const line2 = buildSiteLine(siteUrl);
  const block = `${line1}\n${line2}`;

  if (original) {
    return `${block}\n\n---\n${original}`;
  }

  return block;
}

module.exports = {
  RUNADVISOR_MARKER,
  defaultSiteUrl,
  descriptionHasRunAdvisorInsight,
  stripRunAdvisorBlock,
  buildStravaInsightDescription,
  buildActivitySummaryLine,
  buildSiteLine
};
