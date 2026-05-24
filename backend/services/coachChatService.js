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

const RULE_INTENT_PATTERN = /plan|tomorrow|next session|how was|last (run|session)|effort|rpe|hard|improve|what should|\bnext\b/i;

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
    trainingLoad,
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
  const { lastSession, userProfile, nextSession } = context;

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

function buildRuleBasedCoachReply(message, context, options = {}) {
  const msg = String(message || '').trim().toLowerCase();
  const { lastSession, nextSession, trainingLoad } = context;

  if (!lastSession) {
    return {
      reply: 'Sync a run from Strava first, then I can discuss your training.',
      source: 'rules'
    };
  }

  let reply;

  if (/plan|tomorrow|next session/.test(msg)) {
    reply = buildNextSessionSummary(nextSession);
  } else if (/how was|last (run|session)/.test(msg)) {
    reply = buildLastRunSummary(lastSession);
  } else if (/effort|rpe|hard/.test(msg)) {
    reply = buildEffortExplanation(lastSession);
  } else if (/improve|what should|\bnext\b/.test(msg)) {
    reply = buildImprovementSuggestions(lastSession, trainingLoad);
  } else {
    reply = buildDefaultCoachReply(lastSession, nextSession);
  }

  if (options.openAiFailed) {
    reply += `\n\n${RULES_OFFLINE_NOTE}`;
  }

  return { reply, source: 'rules' };
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

  if (matchesSuggestedPrompt(message, context.suggestedPrompts)) {
    return buildRuleBasedCoachReply(message, context);
  }

  if (shouldUseRuleBasedFirst(message)) {
    return buildRuleBasedCoachReply(message, context);
  }

  if (!apiKey) {
    return buildRuleBasedCoachReply(message, context);
  }

  try {
    return await callOpenAI(systemPrompt, chatMessages);
  } catch (error) {
    console.error('Coach chat OpenAI failed:', error.message || error);
    return buildRuleBasedCoachReply(message, context, { openAiFailed: true });
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

  if (cachedReply) {
    reply = cachedReply;
    source = 'cache';
  } else {
    const systemPrompt = buildSystemPrompt(context);
    const historyForAi = prepareChatHistoryForOpenAI(doc.messages);
    ({ reply, source } = await generateCoachReply(trimmed, context, systemPrompt, historyForAi));
  }

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

  return { reply, source, messages: recentMessages };
}

module.exports = {
  COACH_NOTIFICATION_TYPES,
  DEFAULT_SUGGESTED_PROMPTS,
  buildLastSessionComment,
  buildRuleBasedCoachReply,
  buildChatContext,
  buildChatContextForOpenAI,
  buildSystemPrompt,
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
