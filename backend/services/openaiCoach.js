/**
 * openaiCoach
 *
 * Smart weekly summary pipeline. Historically this file talked to
 * OpenAI directly to produce a short text blurb. It now routes through
 * the shared `reportService` so the weekly card and the full Training
 * Report page use the exact same analytics + report machinery (and
 * therefore the exact same OpenAI prompt / fallback).
 *
 * The legacy `buildFallbackWeeklySummary` helper is kept for backward
 * compatibility with older callers / tests.
 *
 * `getOrCreateWeeklySummary` exposes a TTL-cached wrapper that the
 * `/api/coach/weekly-summary` route uses so we don't burn OpenAI calls
 * on every dashboard mount.
 */

const Report = require('../models/Report');
const { buildAnalytics } = require('./analyticsService');
const { generateReport } = require('./reportService');
const { createNotification } = require('./notificationService');

const WEEKLY_SUMMARY_CACHE_TTL_MS = 30 * 60 * 1000;
const WEEKLY_SUMMARY_DEFAULT_WINDOW_DAYS = 7;
const WEEKLY_SUMMARY_MIN_WINDOW_DAYS = 7;
const WEEKLY_SUMMARY_MAX_WINDOW_DAYS = 84;

function clampWindowDays(value, fallback = WEEKLY_SUMMARY_DEFAULT_WINDOW_DAYS) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(
    WEEKLY_SUMMARY_MAX_WINDOW_DAYS,
    Math.max(WEEKLY_SUMMARY_MIN_WINDOW_DAYS, parsed)
  );
}

/**
 * Deterministic short summary used by older callers and tests when the
 * full report pipeline isn't desired. Kept stable on purpose.
 */
function buildFallbackWeeklySummary({ user = {}, activities = [], progress = {}, coachReview = {} } = {}) {
  const count = activities.length;
  const distanceKm = activities.reduce((sum, a) => sum + Number(a.distance || 0) / 1000, 0);
  const headline = coachReview?.headline || 'Keep building consistency this week.';
  const focus = coachReview?.nextFocus?.[0] || 'Protect one easy day before your next quality session.';

  return {
    source: 'rules',
    headline,
    summary: `You logged ${count} run(s) (~${distanceKm.toFixed(2)} km). ${headline} Next focus: ${focus}`,
    bullets: [
      progress?.loadProgressPct != null
        ? `Weekly load: ${progress.loadProgressPct}% of your ${progress.weeklyLoadTargetKm} km target.`
        : 'Set a weekly load target in your training profile.',
      user.goalPaceMinPerKm
        ? `Goal pace: ${user.goalPaceMinPerKm} min/km.`
        : 'Add a goal pace in your profile for sharper guidance.'
    ]
  };
}

/**
 * Convert the structured report into a flat legacy `{ headline,
 * summary, bullets }` payload so older clients keep rendering.
 */
function summarizeReportLegacy(report, analytics) {
  const exec = report?.executiveSummary || {};
  const flags = Array.isArray(report?.workloadAnalysis?.flags)
    ? report.workloadAnalysis.flags
    : [];
  const intensity = analytics?.intensityDistribution || {};
  const load = analytics?.trainingLoad || {};
  const next = report?.nextSessionDetail;

  const bullets = [];
  if (analytics?.volume?.totalDistanceKm != null) {
    bullets.push(
      `Logged ${analytics.window?.activityCount || 0} run(s) for ${analytics.volume.totalDistanceKm} km in the last ${analytics.window?.days || 0} day(s).`
    );
  }
  if (load.acwr) {
    bullets.push(`ACWR ${load.acwr} · weekly load ${load.weeklyLoad || 0}.`);
  }
  if (intensity.easy != null) {
    bullets.push(`Intensity mix: easy ${intensity.easy || 0}% · tempo ${intensity.tempo || 0}% · threshold ${intensity.threshold || 0}% · VO2 ${intensity.vo2 || 0}%.`);
  }
  if (next?.title) {
    bullets.push(`Next session: ${next.title}${next.durationMinutes ? ` (~${next.durationMinutes} min)` : ''}.`);
  }
  if (flags.length) {
    bullets.push(`Watch out: ${flags.join('; ')}.`);
  }

  return {
    headline: exec.headline || 'Your week in review',
    summary: exec.paragraph || buildFallbackWeeklySummary({}).summary,
    bullets
  };
}

/**
 * Build a fresh weekly summary by running the same analytics + report
 * pipeline as the Training Report page. Always returns the full
 * structured payload (analytics + report) plus a legacy text summary.
 */
async function generateWeeklySummaryReport({ userId, user = {}, windowDays = WEEKLY_SUMMARY_DEFAULT_WINDOW_DAYS } = {}) {
  if (!userId && !Array.isArray(user.__activities)) {
    throw new Error('generateWeeklySummaryReport requires a userId');
  }

  const safeWindow = clampWindowDays(windowDays);
  const analytics = await buildAnalytics(userId, { windowDays: safeWindow, user });
  const report = await generateReport(analytics, user || {}, {});
  const legacy = summarizeReportLegacy(report, analytics);

  return {
    windowDays: safeWindow,
    analytics,
    report,
    headline: legacy.headline,
    summary: legacy.summary,
    bullets: legacy.bullets,
    source: report?.source || 'fallback'
  };
}

/**
 * TTL-cached wrapper. Looks up the most recent persisted Report for
 * the same user + windowDays. If it was generated within the cache TTL
 * and `force` is false, returns it untouched. Otherwise computes a
 * fresh report, persists it, and returns it.
 */
async function getOrCreateWeeklySummary({
  userId,
  user = {},
  windowDays = WEEKLY_SUMMARY_DEFAULT_WINDOW_DAYS,
  force = false,
  cacheTtlMs = WEEKLY_SUMMARY_CACHE_TTL_MS
} = {}) {
  if (!userId) {
    throw new Error('getOrCreateWeeklySummary requires a userId');
  }

  const safeWindow = clampWindowDays(windowDays);

  if (!force) {
    try {
      const cached = await Report.findOne({
        userId,
        windowDays: safeWindow,
        generatedAt: { $gte: new Date(Date.now() - cacheTtlMs) }
      })
        .sort({ generatedAt: -1 })
        .lean();

      if (cached && cached.report) {
        const legacy = summarizeReportLegacy(cached.report, cached.analytics);
        return {
          id: cached._id,
          fromCache: true,
          windowDays: cached.windowDays || safeWindow,
          generatedAt: cached.generatedAt,
          source: cached.source || cached.report?.source || 'fallback',
          analytics: cached.analytics,
          report: cached.report,
          headline: legacy.headline,
          summary: legacy.summary,
          bullets: legacy.bullets
        };
      }
    } catch (error) {
      console.error('Weekly summary cache lookup failed:', error.message || error);
    }
  }

  const generated = await generateWeeklySummaryReport({ userId, user, windowDays: safeWindow });

  let saved = null;
  try {
    saved = await Report.create({
      userId,
      windowDays: generated.windowDays,
      source: generated.source,
      model: generated.report?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      report: generated.report,
      analytics: generated.analytics,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Failed to persist weekly summary report:', error.message || error);
  }

  // Emit a notification for the freshly-generated (non-cached) report,
  // respecting the user's weekly-report notification preference.
  try {
    const weeklyReportAllowed = user?.consent?.notifications?.weeklyReport !== false;
    if (weeklyReportAllowed && generated.report) {
      await createNotification(userId, {
        type: 'weekly_report_ready',
        title: 'Your weekly report is ready',
        body: generated.headline || 'Open RunAdvisor to view this week\u2019s coach summary.',
        severity: 'success',
        data: {
          windowDays: generated.windowDays,
          source: generated.source,
          reportId: saved?._id || null,
          route: '/'
        }
      });
    }

    const coachNudgesAllowed = user?.consent?.notifications?.recommendations !== false;
    if (coachNudgesAllowed && generated.report) {
      await createNotification(userId, {
        type: 'coach_nudge',
        title: 'Ask about your training plan',
        body: 'Your coach is ready to discuss this week\u2019s report and next steps.',
        severity: 'info',
        data: {
          windowDays: generated.windowDays,
          reportId: saved?._id || null,
          route: '/'
        }
      });
    }
  } catch (notifyError) {
    console.error('Weekly summary notification failed:', notifyError.message || notifyError);
  }

  return {
    id: saved?._id || null,
    fromCache: false,
    windowDays: generated.windowDays,
    generatedAt: saved?.generatedAt || new Date(),
    source: generated.source,
    analytics: generated.analytics,
    report: generated.report,
    headline: generated.headline,
    summary: generated.summary,
    bullets: generated.bullets
  };
}

/**
 * Legacy entry point preserved for backward compatibility. Old callers
 * passed `{ user, activities, progress, coachReview }`. The new
 * pipeline needs a user id, so if a userId is provided we route
 * through the new generator; otherwise we fall back to the rule-based
 * summary so the function never blows up.
 */
async function generateWeeklyCoachSummary(context = {}) {
  const { userId, user, windowDays } = context;

  if (userId) {
    try {
      const result = await generateWeeklySummaryReport({ userId, user, windowDays });
      return {
        source: result.source,
        headline: result.headline,
        summary: result.summary,
        bullets: result.bullets
      };
    } catch (error) {
      console.error('Weekly summary generation failed:', error.message || error);
    }
  }

  return buildFallbackWeeklySummary(context);
}

module.exports = {
  buildFallbackWeeklySummary,
  generateWeeklyCoachSummary,
  generateWeeklySummaryReport,
  getOrCreateWeeklySummary,
  summarizeReportLegacy,
  clampWindowDays,
  WEEKLY_SUMMARY_CACHE_TTL_MS,
  WEEKLY_SUMMARY_DEFAULT_WINDOW_DAYS,
  WEEKLY_SUMMARY_MIN_WINDOW_DAYS,
  WEEKLY_SUMMARY_MAX_WINDOW_DAYS
};
