const OpenAI = require('openai');
const Activity = require('../models/Activity');
const Report = require('../models/Report');
const CoachChat = require('../models/CoachChat');
const Notification = require('../models/Notification');
const { analyzeActivity } = require('./analyticsService');
const { paceLabel } = require('./reportService');

const OPENAI_TIMEOUT_MS = 25 * 1000;
const MAX_MESSAGES_PER_HOUR = 15;
const MAX_MESSAGES_PER_DAY = 60;
const MAX_STORED_MESSAGES = 100;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_OPENAI_HISTORY_MESSAGES = 10;
const MAX_USER_MESSAGE_CHARS = 500;
const MAX_COMPLETION_TOKENS = 500;
const CACHE_TTL_MS = 30 * 60 * 1000;
const DEBOUNCE_MS = 10 * 1000;

const RULE_INTENT_PATTERN = /plan|7.?day|this week|tomorrow|next session|recommendation|how was|last (run|session)|effort|rpe|hard|improve|what should|report|weekly summary|how am i doing|training load|\bacwr\b|\bload\b/i;

const COACH_NOTIFICATION_TYPES = [
  'coach_nudge',
  'coach_session_ready',
  'weekly_report_ready'
];

const DEFAULT_SUGGESTED_PROMPTS = [
  'How was my last run?',
  "What's my next recommendation?",
  'Show my weekly report',
  "What's my training load?",
  'Explain my 7-day plan'
];

const EXEC_SUMMARY_MAX_CHARS = 300;

function buildLastSessionComment(analyzed) {
  if (!analyzed) {
    return 'No recent run data yet — sync from Strava to get personalized feedback.';
  }

  const parts = [];
  if (analyzed.splitProfile === 'negative') {
    parts.push('Strong second half — controlled start, finished well.');
  } else if (analyzed.splitProfile === 'positive') {
    parts.push('Pace faded in the second half — consider starting slightly easier next time.');
  } else {
    parts.push('Even effort, good control.');
  }

  if (analyzed.estimatedRpe) {
    parts.push(`Estimated RPE ${analyzed.estimatedRpe}/10 (${analyzed.intensityBucket || 'moderate'} effort).`);
  }

  if (analyzed.hrDriftBpm != null && analyzed.hrDriftBpm > 8) {
    parts.push(`HR drifted +${analyzed.hrDriftBpm} bpm in the second half.`);
  }

  return parts.join(' ');
}

function serializeLastSession(analyzed, activity) {
  if (!analyzed || !activity) {
    return null;
  }

  return {
    activityId: analyzed.activityId,
    name: analyzed.name || activity.name || 'Run',
    date: analyzed.date || activity.date,
    distanceKm: analyzed.distanceKm,
    pace: analyzed.avgPaceMinPerKm ? paceLabel(analyzed.avgPaceMinPerKm) : null,
    avgPaceMinPerKm: analyzed.avgPaceMinPerKm,
    avgHr: analyzed.avgHeartRate,
    estimatedRpe: analyzed.estimatedRpe,
    splitProfile: analyzed.splitProfile,
    intensityBucket: analyzed.intensityBucket,
    hrDriftBpm: analyzed.hrDriftBpm,
    comment: buildLastSessionComment(analyzed),
    splits: (analyzed.splits || []).slice(0, 12)
  };
}

async function loadLastActivityContext(userId, user) {
  const lastActivity = await Activity.findOne({ userId })
    .sort({ date: -1 })
    .lean();

  if (!lastActivity) {
    return { lastActivity: null, analyzed: null };
  }

  const recent = await Activity.find({ userId })
    .sort({ date: -1 })
    .limit(28)
    .lean();

  const paces = recent
    .map((a) => {
      const dk = Number(a.distance || 0) / 1000;
      const mins = Number(a.movingTime || a.duration || 0) / 60;
      if (Number.isFinite(Number(a.pace)) && Number(a.pace) > 0) {
        return Number(a.pace);
      }
      return dk > 0 && mins > 0 ? mins / dk : 0;
    })
    .filter((p) => p > 0);

  const avgPace = paces.length
    ? paces.reduce((sum, p) => sum + p, 0) / paces.length
    : 0;

  const baseline = {
    avgPace,
    maxHr: user?.age ? 220 - user.age : 190,
    restingHr: 55
  };

  const analyzed = analyzeActivity(lastActivity, baseline);
  return { lastActivity, analyzed };
}

async function loadLatestReport(userId) {
  return Report.findOne({ userId })
    .sort({ generatedAt: -1 })
    .lean();
}

function serializeWeeklyPlan(latestReport) {
  const plan = latestReport?.report?.weeklyPlan || [];
  return plan.slice(0, 7).map((day, index) => ({
    day: day.day ?? index + 1,
    title: day.title || `Day ${index + 1}`,
    sessionType: day.sessionType || 'easy_run',
    durationMinutes: day.durationMinutes ?? null,
    distanceKm: day.distanceKm ?? null,
    rpe: day.rpe ?? null
  }));
}

function buildKeyMetrics(analytics) {
  const volume = analytics?.volume || {};
  const load = analytics?.trainingLoad || {};
  const pace = analytics?.pace || {};

  return {
    totalDistanceKm: volume.totalDistanceKm ?? 0,
    runsPerWeek: volume.runsPerWeek ?? 0,
    acwr: load.acwr ?? 0,
    weeklyLoad: load.weeklyLoad ?? 0,
    avgPaceMinPerKm: pace.avgPaceMinPerKm ?? 0,
    intensityPct: analytics?.intensityDistribution || { easy: 0, tempo: 0, threshold: 0, vo2: 0 },
    monotony: load.monotony ?? 0
  };
}

function buildReportSummary(latestReport) {
  const executive = latestReport?.report?.executiveSummary;
  if (!executive) {
    return null;
  }

  const paragraph = String(executive.paragraph || '');
  const truncated = paragraph.length > EXEC_SUMMARY_MAX_CHARS
    ? `${paragraph.slice(0, EXEC_SUMMARY_MAX_CHARS - 1)}…`
    : paragraph;

  return {
    headline: executive.headline || '',
    readinessPhase: executive.readinessPhase || 'build',
    executiveParagraph: truncated,
    injuryRiskLevel: latestReport?.report?.riskAndRecovery?.injuryRiskLevel || 'low',
    reportGeneratedAt: latestReport?.generatedAt || latestReport?.report?.generatedAt || null
  };
}

function buildWeeklyLoadSeriesSlice(analytics, weeks = 4) {
  const series = analytics?.weeklyLoadSeries || [];
  return series.slice(-weeks).map((entry) => ({
    label: entry.label,
    load: entry.load ?? 0,
    totalDistanceKm: entry.totalDistanceKm ?? 0
  }));
}

async function countUnreadCoachNudges(userId) {
  return Notification.countDocuments({
    userId,
    readAt: null,
    type: { $in: COACH_NOTIFICATION_TYPES }
  });
}

async function buildChatContext(userId, user = {}) {
  const [{ lastActivity, analyzed }, latestReport, hasUnreadCoachNudge] = await Promise.all([
    loadLastActivityContext(userId, user),
    loadLatestReport(userId),
    countUnreadCoachNudges(userId)
  ]);

  const lastSession = serializeLastSession(analyzed, lastActivity);
  const nextSession = latestReport?.report?.nextSessionDetail || null;
  const trainingLoad = latestReport?.analytics?.trainingLoad || null;
  const weeklyPlan = serializeWeeklyPlan(latestReport);
  const keyMetrics = buildKeyMetrics(latestReport?.analytics);
  const reportSummary = buildReportSummary(latestReport);
  const weeklyLoadSeries = buildWeeklyLoadSeriesSlice(latestReport?.analytics);

  const suggestedPrompts = [...DEFAULT_SUGGESTED_PROMPTS];
  if (nextSession?.title) {
    suggestedPrompts.push(`Tell me about my next session: ${nextSession.title}`);
  }

  return {
    lastSession,
    userProfile: {
      name: user.name || null,
      runningGoal: user.runningGoal || null,
      experience: user.experience || null,
      goalPaceMinPerKm: user.goalPaceMinPerKm || null,
      weeklyTrainingLoadKm: user.weeklyTrainingLoadKm || null
    },
    nextSession,
    weeklyPlan,
    keyMetrics,
    reportSummary,
    weeklyLoadSeries,
    trainingLoad,
    suggestedPrompts,
    hasUnreadCoachNudge: hasUnreadCoachNudge > 0,
    reportId: latestReport?._id || null,
    lastSyncAt: lastActivity?.date || lastSession?.date || null
  };
}

async function getChatHistory(userId, limit = DEFAULT_HISTORY_LIMIT) {
  const doc = await CoachChat.findOne({ userId }).lean();
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_HISTORY_LIMIT, 1), 50);
  const messages = doc?.messages || [];
  return messages.slice(-safeLimit).map((m) => ({
    id: m._id,
    role: m.role,
    content: m.content,
    richContent: m.richContent || undefined,
    createdAt: m.createdAt
  }));
}

function countRecentUserMessages(messages, windowMs = 60 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  return messages.filter(
    (m) => m.role === 'user' && new Date(m.createdAt).getTime() >= cutoff
  ).length;
}

function truncateForOpenAI(text, maxLen = MAX_USER_MESSAGE_CHARS) {
  const s = String(text || '').trim();
  if (s.length <= maxLen) {
    return s;
  }
  return `${s.slice(0, maxLen - 1)}…`;
}

function buildChatContextForOpenAI(context) {
  const { lastSession, userProfile, nextSession, weeklyPlan, keyMetrics } = context;

  return {
    lastSession: lastSession
      ? {
          name: lastSession.name,
          date: lastSession.date,
          distanceKm: lastSession.distanceKm,
          avgPaceMinPerKm: lastSession.avgPaceMinPerKm,
          estimatedRpe: lastSession.estimatedRpe,
          splitProfile: lastSession.splitProfile,
          intensityBucket: lastSession.intensityBucket,
          ...(lastSession.hrDriftBpm != null ? { hrDriftBpm: lastSession.hrDriftBpm } : {}),
          comment: lastSession.comment
        }
      : null,
    userProfile: {
      runningGoal: userProfile?.runningGoal || null,
      experience: userProfile?.experience || null
    },
    nextSession: nextSession
      ? {
          title: nextSession.title,
          durationMinutes: nextSession.durationMinutes,
          objective: nextSession.objective || null
        }
      : null,
    weeklyPlan: (weeklyPlan || []).slice(0, 7).map((day) => {
      const dist = day.distanceKm != null ? `${day.distanceKm} km` : '';
      const dur = day.durationMinutes != null ? `${day.durationMinutes} min` : '';
      const meta = [dur, dist].filter(Boolean).join(', ');
      return meta ? `${day.title} (${meta})` : day.title;
    }),
    keyMetrics: keyMetrics
      ? {
          acwr: keyMetrics.acwr,
          weeklyLoad: keyMetrics.weeklyLoad,
          totalDistanceKm: keyMetrics.totalDistanceKm
        }
      : null
  };
}

function buildSystemPrompt(context) {
  const compact = buildChatContextForOpenAI(context);

  return `You are an experienced running coach for RunAdvisor.

RULES:
- Use ONLY the stats in ATHLETE_CONTEXT. Never invent pace, distance, HR, or RPE.
- If data is missing, say so and give general guidance.
- Reference the next planned session when relevant.
- Keep replies concise (2-4 short paragraphs). Encouraging, plain language. Address the athlete as "you".

ATHLETE_CONTEXT:
${JSON.stringify(compact)}`;
}

function prepareChatHistoryForOpenAI(messages, maxMessages = MAX_OPENAI_HISTORY_MESSAGES) {
  return messages.slice(-maxMessages).map((m) => ({
    role: m.role,
    content: truncateForOpenAI(m.content)
  }));
}

function estimateTokenBudget(systemPrompt, chatMessages) {
  const historyChars = chatMessages.reduce((sum, m) => sum + String(m.content || '').length, 0);
  const totalChars = String(systemPrompt || '').length + historyChars;
  return {
    totalChars,
    estimatedTokens: Math.ceil(totalChars / 4),
    systemTokens: Math.ceil(String(systemPrompt || '').length / 4),
    historyTokens: Math.ceil(historyChars / 4)
  };
}

function isDuplicateWithinDebounce(messages, message) {
  const normalized = String(message || '').trim();
  const cutoff = Date.now() - DEBOUNCE_MS;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m.role !== 'user') {
      continue;
    }
    if (String(m.content).trim() !== normalized) {
      return false;
    }
    return new Date(m.createdAt).getTime() >= cutoff;
  }

  return false;
}

function findCachedReply(doc, message, activityId) {
  if (!activityId || !doc?.contextSnapshot?.lastActivityId) {
    return null;
  }
  if (String(doc.contextSnapshot.lastActivityId) !== String(activityId)) {
    return null;
  }

  const normalized = String(message || '').trim();
  const cutoff = Date.now() - CACHE_TTL_MS;
  const messages = doc.messages || [];

  for (let i = messages.length - 1; i >= 1; i -= 1) {
    const assistant = messages[i];
    const user = messages[i - 1];
    if (user.role !== 'user' || assistant.role !== 'assistant') {
      continue;
    }
    if (String(user.content).trim() !== normalized) {
      continue;
    }
    if (new Date(assistant.createdAt).getTime() < cutoff) {
      break;
    }
    return assistant.content;
  }

  return null;
}

function shouldUseRuleBasedFirst(message) {
  const msg = String(message || '').trim();
  return msg.length < 80 && RULE_INTENT_PATTERN.test(msg);
}

const RULES_OFFLINE_NOTE = '(AI coach offline — showing analysis from your training data.)';

const INTENSITY_DESCRIPTIONS = {
  easy: 'easy aerobic work — you should be able to hold a conversation.',
  moderate: 'moderate aerobic effort — breathing is steady but not relaxed.',
  tempo: 'tempo territory — comfortably hard, short phrases only.',
  threshold: 'threshold intensity — sustained, race-pace effort.',
  vo2: 'high intensity — very hard, suitable for intervals or short bursts.'
};

function buildLastRunSummary(lastSession) {
  const parts = [];
  const name = lastSession.name || 'Your last run';
  const dist = lastSession.distanceKm != null ? `${lastSession.distanceKm} km` : null;
  const pace = lastSession.pace
    || (lastSession.avgPaceMinPerKm ? paceLabel(lastSession.avgPaceMinPerKm) : null);

  if (dist && pace) {
    parts.push(`${name} covered ${dist} at ${pace}.`);
  } else if (dist) {
    parts.push(`${name} covered ${dist}.`);
  } else {
    parts.push(`${name} is your most recent session.`);
  }

  if (lastSession.estimatedRpe) {
    parts.push(
      `Estimated effort was RPE ${lastSession.estimatedRpe}/10 (${lastSession.intensityBucket || 'moderate'} intensity).`
    );
  }

  if (lastSession.splitProfile === 'negative') {
    parts.push('You ran a negative split — controlled start, stronger finish.');
  } else if (lastSession.splitProfile === 'positive') {
    parts.push('Pace faded in the second half — consider starting slightly easier next time.');
  } else {
    parts.push('Pacing was even throughout — good control.');
  }

  if (lastSession.hrDriftBpm != null && lastSession.hrDriftBpm > 8) {
    parts.push(
      `Heart rate drifted +${lastSession.hrDriftBpm} bpm in the second half, suggesting early effort was a bit high.`
    );
  }

  if (lastSession.splitProfile === 'negative') {
    parts.push('Finishing strong is a habit worth keeping — build on that controlled progression.');
  } else if (lastSession.splitProfile === 'positive') {
    parts.push('Try holding back the first 2–3 km so you have room to maintain pace late in the run.');
  } else if (lastSession.estimatedRpe >= 8) {
    parts.push('If this felt harder than intended, add an easy recovery day before the next quality session.');
  } else {
    parts.push('Keep protecting easy days so quality sessions stay sharp.');
  }

  return parts.join(' ');
}

function buildImprovementSuggestions(lastSession, trainingLoad) {
  const tips = [];

  if (lastSession.splitProfile === 'positive') {
    tips.push(
      'Your second half was slower than the first — start 5–10 sec/km easier and settle into rhythm before pushing.'
    );
  } else if (lastSession.splitProfile === 'negative') {
    tips.push('Negative splits are a strength — use the first half as a controlled warm-up, then press when you feel ready.');
  } else {
    tips.push('Even splits show good discipline — on tempo days, you can push the middle km once easy days feel truly easy.');
  }

  if (lastSession.estimatedRpe >= 8) {
    tips.push(
      `RPE ${lastSession.estimatedRpe}/10 was high — keep the next 48 hours to easy running or rest before stacking intensity.`
    );
  } else if (lastSession.estimatedRpe && lastSession.estimatedRpe <= 4) {
    tips.push('Effort was low — if that was recovery, great; if you meant to push, schedule one quality session this week.');
  }

  const acwr = trainingLoad?.acwr;
  if (acwr && acwr > 1.5) {
    tips.push(`ACWR is ${acwr} — workload is elevated, so prioritize recovery and avoid back-to-back hard sessions.`);
  } else if (acwr && acwr > 0 && acwr < 0.8) {
    tips.push(`ACWR is ${acwr} — you have room to gradually add volume or one quality session this week.`);
  }

  return tips.slice(0, 3).join(' ');
}

function buildEffortExplanation(lastSession) {
  const parts = [];
  const bucket = lastSession.intensityBucket || 'moderate';
  const bucketText = INTENSITY_DESCRIPTIONS[bucket] || 'sustainable, purposeful training.';

  if (lastSession.estimatedRpe) {
    parts.push(
      `Based on pace, heart rate, and duration, I estimate your last run at RPE ${lastSession.estimatedRpe}/10.`
    );
  } else {
    parts.push('I could not estimate RPE precisely for this session from the available data.');
  }

  parts.push(`That classifies as ${bucket} intensity — ${bucketText}`);

  if (lastSession.avgHr) {
    parts.push(`Average heart rate was ${lastSession.avgHr} bpm during the run.`);
  }

  if (lastSession.splitProfile === 'positive' && lastSession.estimatedRpe >= 7) {
    parts.push('The fade in pace plus elevated effort suggests you may have started too fast — ease into the first third next time.');
  }

  return parts.join(' ');
}

function buildNextSessionSummary(nextSession) {
  if (!nextSession) {
    return 'No planned session is on file yet — generate a weekly report to get a structured plan.';
  }

  const parts = [`Your next session is "${nextSession.title}".`];

  if (nextSession.durationMinutes) {
    parts.push(`Plan for about ${nextSession.durationMinutes} minutes total.`);
  }

  if (nextSession.objective) {
    parts.push(nextSession.objective);
  }

  const blocks = [
    ['Warm-up', nextSession.warmup],
    ['Main set', nextSession.mainSet],
    ['Cool-down', nextSession.cooldown]
  ];

  for (const [label, block] of blocks) {
    if (block?.description) {
      const paceNote = block.targetPace?.label ? ` Target pace ${block.targetPace.label}.` : '';
      parts.push(`${label}: ${block.description}${paceNote}`);
    }
  }

  return parts.join(' ');
}

function buildDefaultCoachReply(lastSession, nextSession) {
  const dist = lastSession.distanceKm != null ? `${lastSession.distanceKm} km` : null;
  const pace = lastSession.pace
    || (lastSession.avgPaceMinPerKm ? paceLabel(lastSession.avgPaceMinPerKm) : null);
  let reply = dist && pace
    ? `Your last run was ${lastSession.name || 'your most recent session'} — ${dist} at ${pace}.`
    : `Your last session was ${lastSession.name || 'your most recent run'}.`;

  if (nextSession?.title) {
    reply += ` Coming up: ${nextSession.title}.`;
  }

  reply += ' Ask me about pace, effort level, or what to improve next.';
  return reply;
}

function detectRichContentIntent(message) {
  const msg = String(message || '').trim().toLowerCase();

  if (/\brecommendations\b/.test(msg)) {
    return 'recommendations';
  }
  if (/recommendation|next session|what should i do|what's my next/.test(msg)) {
    return 'next_session';
  }
  if (/show my weekly report|\breport\b|weekly summary|how am i doing/.test(msg)) {
    return 'report_summary';
  }
  if (/\bplan\b|7.?day|seven day|this week|explain my 7/.test(msg)) {
    return 'weekly_plan';
  }
  if (/\bload\b|\bacwr\b|training load/.test(msg)) {
    return 'metrics';
  }

  return 'none';
}

function buildRichContent(intent, context) {
  const {
    weeklyPlan = [],
    keyMetrics,
    reportSummary,
    nextSession,
    weeklyLoadSeries = []
  } = context;

  switch (intent) {
    case 'metrics':
      return {
        type: 'metrics',
        data: {
          keyMetrics: keyMetrics || {},
          weeklyLoadSeries
        }
      };
    case 'weekly_plan':
      return {
        type: 'weekly_plan',
        data: { days: weeklyPlan }
      };
    case 'report_summary':
      return {
        type: 'report_summary',
        data: reportSummary || {
          headline: 'No weekly report yet',
          readinessPhase: 'build',
          executiveParagraph: 'Generate a training report to unlock executive summary insights.',
          injuryRiskLevel: 'low',
          reportGeneratedAt: null
        }
      };
    case 'next_session':
      return {
        type: 'next_session',
        data: {
          session: nextSession,
          firstPlanDay: weeklyPlan[0] || null
        }
      };
    case 'recommendations':
      return {
        type: 'weekly_plan',
        data: {
          days: weeklyPlan,
          highlightNextSession: nextSession
        }
      };
    default:
      return { type: 'none', data: null };
  }
}

function attachRichContent(result, message, context) {
  const intent = detectRichContentIntent(message);
  const richContent = buildRichContent(intent, context);
  return {
    ...result,
    richContent: richContent.type === 'none' ? { type: 'none', data: null } : richContent
  };
}

function buildTrainingLoadSummary(keyMetrics) {
  if (!keyMetrics) {
    return 'No training load data yet — sync runs and generate a report to see ACWR and weekly load.';
  }

  const {
    acwr = 0,
    weeklyLoad = 0,
    monotony = 0,
    totalDistanceKm = 0,
    runsPerWeek = 0
  } = keyMetrics;

  const parts = [
    `Weekly load is ${weeklyLoad} TRIMP-style units over the report window (${totalDistanceKm} km total, ~${runsPerWeek} runs/week).`
  ];

  if (acwr > 0) {
    let acwrNote = 'in a healthy progression zone';
    if (acwr > 1.5) {
      acwrNote = 'elevated — prioritize recovery and avoid stacking hard days';
    } else if (acwr < 0.8) {
      acwrNote = 'conservative — you have room to build gradually';
    }
    parts.push(`ACWR (acute:chronic workload ratio) is ${acwr}, which is ${acwrNote}.`);
  }

  if (monotony > 0) {
    parts.push(
      monotony > 2
        ? `Monotony is ${monotony} — load is spread too uniformly; add a true rest day.`
        : `Monotony is ${monotony}, which looks sustainable.`
    );
  }

  return parts.join(' ');
}

function buildReportSummaryReply(reportSummary, keyMetrics) {
  if (!reportSummary) {
    return 'No weekly report on file yet. Generate a training report from the dashboard to unlock executive summary and metrics.';
  }

  const parts = [
    reportSummary.headline,
    reportSummary.executiveParagraph,
    `Readiness phase: ${reportSummary.readinessPhase}. Injury risk: ${reportSummary.injuryRiskLevel}.`
  ];

  if (keyMetrics) {
    parts.push(
      `Key numbers — ${keyMetrics.totalDistanceKm} km total, ACWR ${keyMetrics.acwr}, weekly load ${keyMetrics.weeklyLoad}.`
    );
  }

  return parts.filter(Boolean).join('\n\n');
}

function buildWeeklyPlanListReply(weeklyPlan, nextSession) {
  if (!weeklyPlan?.length) {
    return nextSession
      ? buildNextSessionSummary(nextSession)
      : 'No 7-day plan yet — generate a weekly report to get structured sessions.';
  }

  const lines = weeklyPlan.map((day, index) => {
    const type = day.sessionType ? day.sessionType.replace(/_/g, ' ') : 'session';
    const dur = day.durationMinutes ? `${day.durationMinutes} min` : '—';
    const dist = day.distanceKm != null ? `${day.distanceKm} km` : '—';
    return `${index + 1}. ${day.title} — ${type}, ${dur}, ${dist}`;
  });

  let reply = `Your 7-day plan:\n${lines.join('\n')}`;
  if (nextSession?.title) {
    reply += `\n\nNext up: ${nextSession.title}.`;
  }
  return reply;
}

function buildRecommendationsReply(weeklyPlan, nextSession) {
  const planIntro = weeklyPlan?.length
    ? `This week includes ${weeklyPlan.length} planned sessions — mix of easy, quality, and recovery days.`
    : 'Generate a report to unlock your full weekly recommendations.';

  const nextPart = nextSession?.title
    ? `Your immediate next session is "${nextSession.title}"${nextSession.durationMinutes ? ` (~${nextSession.durationMinutes} min)` : ''}.`
    : '';

  return [planIntro, nextPart, buildWeeklyPlanListReply(weeklyPlan, null)].filter(Boolean).join('\n\n');
}

function buildNextSessionRichReply(nextSession, weeklyPlan) {
  const sessionPart = buildNextSessionSummary(nextSession);
  const dayOne = weeklyPlan?.[0];
  if (dayOne?.title && dayOne.title !== nextSession?.title) {
    return `${sessionPart}\n\nDay 1 of your plan: ${dayOne.title}${dayOne.durationMinutes ? ` (${dayOne.durationMinutes} min)` : ''}.`;
  }
  return sessionPart;
}

function buildRuleBasedCoachReply(message, context, options = {}) {
  const msg = String(message || '').trim().toLowerCase();
  const {
    lastSession,
    nextSession,
    trainingLoad,
    keyMetrics,
    weeklyPlan,
    reportSummary
  } = context;

  const intent = detectRichContentIntent(message);
  let richContent = buildRichContent(intent, context);

  const dataOnlyIntent = intent !== 'none';
  if (!lastSession && !dataOnlyIntent) {
    return {
      reply: 'Sync a run from Strava first, then I can discuss your training.',
      source: 'rules',
      richContent: { type: 'none', data: null }
    };
  }

  let reply;

  if (/\bload\b|\bacwr\b|training load/.test(msg)) {
    reply = buildTrainingLoadSummary(keyMetrics || trainingLoad);
  } else if (/show my weekly report|\breport\b|weekly summary|how am i doing/.test(msg)) {
    reply = buildReportSummaryReply(reportSummary, keyMetrics);
  } else if (/\bplan\b|7.?day|seven day|this week|explain my 7/.test(msg)) {
    reply = buildWeeklyPlanListReply(weeklyPlan, nextSession);
  } else if (/\brecommendations\b/.test(msg)) {
    reply = buildRecommendationsReply(weeklyPlan, nextSession);
  } else if (/recommendation|next session|what should i do|what's my next/.test(msg)) {
    reply = buildNextSessionRichReply(nextSession, weeklyPlan);
  } else if (/plan|tomorrow|next session/.test(msg)) {
    reply = buildNextSessionRichReply(nextSession, weeklyPlan);
  } else if (/how was|last (run|session)/.test(msg)) {
    reply = buildLastRunSummary(lastSession);
    richContent = { type: 'none', data: null };
  } else if (/effort|rpe|hard/.test(msg)) {
    reply = buildEffortExplanation(lastSession);
    richContent = { type: 'none', data: null };
  } else if (/improve|what should/.test(msg)) {
    reply = buildImprovementSuggestions(lastSession, trainingLoad || keyMetrics);
    richContent = { type: 'none', data: null };
  } else if (!lastSession) {
    reply = 'Sync a run from Strava first, then I can discuss your training.';
    richContent = { type: 'none', data: null };
  } else {
    reply = buildDefaultCoachReply(lastSession, nextSession);
    richContent = { type: 'none', data: null };
  }

  if (options.openAiFailed) {
    reply += `\n\n${RULES_OFFLINE_NOTE}`;
  }

  return { reply, source: 'rules', richContent };
}

async function callOpenAI(systemPrompt, chatMessages) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: OPENAI_TIMEOUT_MS });
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (process.env.NODE_ENV !== 'production') {
    const budget = estimateTokenBudget(systemPrompt, chatMessages);
    console.log(
      `[coach-chat] OpenAI request ~${budget.estimatedTokens} input tokens`
      + ` (system ~${budget.systemTokens}, history ~${budget.historyTokens})`
    );
  }

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    max_tokens: MAX_COMPLETION_TOKENS,
    messages: [
      { role: 'system', content: systemPrompt },
      ...chatMessages
    ]
  });

  const reply = completion.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error('empty_content');
  }

  return { reply, source: 'openai', model };
}

function matchesSuggestedPrompt(message, suggestedPrompts = []) {
  const normalized = String(message || '').trim().toLowerCase();
  return suggestedPrompts.some((prompt) => String(prompt).trim().toLowerCase() === normalized);
}

async function generateCoachReply(message, context, systemPrompt, chatMessages) {
  const apiKey = process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim();

  let result;

  if (matchesSuggestedPrompt(message, context.suggestedPrompts)) {
    result = buildRuleBasedCoachReply(message, context);
  } else if (shouldUseRuleBasedFirst(message)) {
    result = buildRuleBasedCoachReply(message, context);
  } else if (!apiKey) {
    result = buildRuleBasedCoachReply(message, context);
  } else {
    try {
      result = await callOpenAI(systemPrompt, chatMessages);
      result = attachRichContent(result, message, context);
    } catch (error) {
      console.error('Coach chat OpenAI failed:', error.message || error);
      result = buildRuleBasedCoachReply(message, context, { openAiFailed: true });
    }
  }

  if (!result.richContent) {
    result = attachRichContent(result, message, context);
  }

  return result;
}

async function sendChatMessage(userId, user, message) {
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    const err = new Error('Message is required');
    err.status = 400;
    throw err;
  }

  if (trimmed.length > 2000) {
    const err = new Error('Message is too long (max 2000 characters)');
    err.status = 400;
    throw err;
  }

  let doc = await CoachChat.findOne({ userId });
  if (!doc) {
    doc = new CoachChat({ userId, messages: [] });
  }

  if (isDuplicateWithinDebounce(doc.messages, trimmed)) {
    const err = new Error('Please wait a few seconds before sending the same message again.');
    err.status = 429;
    err.retryAfter = 10;
    throw err;
  }

  const hourlyCount = countRecentUserMessages(doc.messages);
  if (hourlyCount >= MAX_MESSAGES_PER_HOUR) {
    const err = new Error(`Rate limit exceeded — max ${MAX_MESSAGES_PER_HOUR} messages per hour. Please try again later.`);
    err.status = 429;
    err.retryAfter = 3600;
    throw err;
  }

  const dailyCount = countRecentUserMessages(doc.messages, 24 * 60 * 60 * 1000);
  if (dailyCount >= MAX_MESSAGES_PER_DAY) {
    const err = new Error(`Daily limit exceeded — max ${MAX_MESSAGES_PER_DAY} messages per day. Please try again tomorrow.`);
    err.status = 429;
    err.retryAfter = 86400;
    throw err;
  }

  const context = await buildChatContext(userId, user);
  const activityId = context.lastSession?.activityId || null;
  const cachedReply = findCachedReply(doc, trimmed, activityId);

  const userMsg = { role: 'user', content: trimmed, createdAt: new Date() };
  doc.messages.push(userMsg);

  let reply;
  let source;
  let richContent = { type: 'none', data: null };

  if (cachedReply) {
    reply = cachedReply;
    source = 'cache';
    richContent = buildRichContent(detectRichContentIntent(trimmed), context);
    if (richContent.type === 'none') {
      richContent = { type: 'none', data: null };
    }
  } else {
    const systemPrompt = buildSystemPrompt(context);
    const historyForAi = prepareChatHistoryForOpenAI(doc.messages);
    ({ reply, source, richContent } = await generateCoachReply(trimmed, context, systemPrompt, historyForAi));
  }

  const assistantMsg = {
    role: 'assistant',
    content: reply,
    richContent: richContent?.type && richContent.type !== 'none' ? richContent : undefined,
    createdAt: new Date()
  };
  doc.messages.push(assistantMsg);

  if (doc.messages.length > MAX_STORED_MESSAGES) {
    doc.messages = doc.messages.slice(-MAX_STORED_MESSAGES);
  }

  doc.contextSnapshot = {
    lastActivityId: context.lastSession?.activityId || null,
    lastActivitySummary: context.lastSession,
    reportId: context.reportId,
    generatedAt: new Date()
  };

  await doc.save();

  const recentMessages = doc.messages.slice(-DEFAULT_HISTORY_LIMIT).map((m) => ({
    id: m._id,
    role: m.role,
    content: m.content,
    richContent: m.richContent || undefined,
    createdAt: m.createdAt
  }));

  return {
    reply,
    source,
    richContent: richContent?.type && richContent.type !== 'none' ? richContent : { type: 'none', data: null },
    messages: recentMessages
  };
}

module.exports = {
  COACH_NOTIFICATION_TYPES,
  DEFAULT_SUGGESTED_PROMPTS,
  buildLastSessionComment,
  buildRuleBasedCoachReply,
  buildChatContext,
  buildChatContextForOpenAI,
  buildSystemPrompt,
  buildRichContent,
  detectRichContentIntent,
  getChatHistory,
  sendChatMessage,
  countRecentUserMessages,
  findCachedReply,
  shouldUseRuleBasedFirst,
  MAX_MESSAGES_PER_HOUR,
  MAX_MESSAGES_PER_DAY,
  MAX_OPENAI_HISTORY_MESSAGES,
  MAX_COMPLETION_TOKENS
};
