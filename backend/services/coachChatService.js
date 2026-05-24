const OpenAI = require('openai');
const Activity = require('../models/Activity');
const Report = require('../models/Report');
const CoachChat = require('../models/CoachChat');
const Notification = require('../models/Notification');
const { analyzeActivity } = require('./analyticsService');
const { paceLabel } = require('./reportService');

const TIMEOUT_MS = 45 * 1000;
const MAX_MESSAGES_PER_HOUR = 20;
const MAX_STORED_MESSAGES = 100;
const DEFAULT_HISTORY_LIMIT = 20;

const COACH_NOTIFICATION_TYPES = [
  'coach_nudge',
  'coach_session_ready',
  'weekly_report_ready'
];

const DEFAULT_SUGGESTED_PROMPTS = [
  'How was my last run?',
  'What should I improve?',
  'Explain my effort level'
];

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
    suggestedPrompts,
    hasUnreadCoachNudge: hasUnreadCoachNudge > 0,
    reportId: latestReport?._id || null
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
    createdAt: m.createdAt
  }));
}

function countRecentUserMessages(messages) {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  return messages.filter(
    (m) => m.role === 'user' && new Date(m.createdAt).getTime() >= oneHourAgo
  ).length;
}

function buildSystemPrompt(context) {
  const { lastSession, userProfile, nextSession } = context;

  return `You are an experienced running coach for RunAdvisor. The athlete is asking about their training.

RULES:
- ONLY use the session stats provided below. NEVER invent pace, distance, heart rate, or RPE numbers.
- If data is missing, say so honestly and give general guidance.
- Discuss last session effort, pacing, and 1-2 concrete improvements.
- Reference the next planned session when relevant.
- Keep replies concise (2-4 short paragraphs max). Use plain, encouraging language.
- Address the athlete as "you".

Athlete profile:
${JSON.stringify(userProfile, null, 2)}

Last session:
${lastSession ? JSON.stringify(lastSession, null, 2) : 'No recent run synced yet.'}

Next planned session:
${nextSession ? JSON.stringify(nextSession, null, 2) : 'No weekly plan / next session on file yet.'}`;
}

async function callOpenAI(systemPrompt, chatMessages) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      reply: 'Connect OpenAI or try again later — chat is unavailable without an API key configured on the server.',
      source: 'fallback'
    };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: TIMEOUT_MS });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatMessages.map((m) => ({ role: m.role, content: m.content }))
      ]
    });

    const reply = completion.choices?.[0]?.message?.content?.trim()
      || 'I had trouble forming a response. Please try again.';

    return { reply, source: 'openai', model };
  } catch (error) {
    console.error('Coach chat OpenAI failed:', error.message || error);
    return {
      reply: 'Something went wrong reaching the coach. Please try again in a moment.',
      source: 'fallback_error'
    };
  }
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

  const recentCount = countRecentUserMessages(doc.messages);
  if (recentCount >= MAX_MESSAGES_PER_HOUR) {
    const err = new Error('Rate limit exceeded — max 20 messages per hour. Please try again later.');
    err.status = 429;
    err.retryAfter = 3600;
    throw err;
  }

  const context = await buildChatContext(userId, user);
  const systemPrompt = buildSystemPrompt(context);

  const userMsg = { role: 'user', content: trimmed, createdAt: new Date() };
  doc.messages.push(userMsg);

  const historyForAi = doc.messages.slice(-12).map((m) => ({
    role: m.role,
    content: m.content
  }));

  const { reply } = await callOpenAI(systemPrompt, historyForAi);

  const assistantMsg = { role: 'assistant', content: reply, createdAt: new Date() };
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
    createdAt: m.createdAt
  }));

  return { reply, messages: recentMessages };
}

module.exports = {
  COACH_NOTIFICATION_TYPES,
  DEFAULT_SUGGESTED_PROMPTS,
  buildLastSessionComment,
  buildChatContext,
  getChatHistory,
  sendChatMessage,
  countRecentUserMessages,
  MAX_MESSAGES_PER_HOUR
};
