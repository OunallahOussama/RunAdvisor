const Activity = require('../models/Activity');

function buildReportKey({ reportId, generatedAt } = {}) {
  const at = generatedAt ? new Date(generatedAt).toISOString() : '';
  const id = reportId ? String(reportId) : '';
  return `${id}:${at}`;
}

function serializeCommitment(user) {
  const raw = user?.weeklyPlanCommitment;
  if (!raw || !raw.reportKey) {
    return null;
  }

  return {
    reportKey: raw.reportKey,
    reportGeneratedAt: raw.reportGeneratedAt || null,
    status: raw.status || 'pending',
    decidedAt: raw.decidedAt || null,
    appliedCheckAt: raw.appliedCheckAt || null,
    appliedScore: raw.appliedScore ?? null,
    appliedNote: raw.appliedNote || ''
  };
}

function commitmentNeedsDecision(commitment, reportKey) {
  if (!reportKey) {
    return false;
  }
  if (!commitment || !commitment.reportKey) {
    return true;
  }
  if (commitment.reportKey !== reportKey) {
    return true;
  }
  return commitment.status === 'pending';
}

/**
 * Adherence for a rolling 7-day plan: day 1–7 from plan creation (report generatedAt),
 * not a Mon–Sun calendar week.
 */
async function evaluatePlanApplied(userId, weeklyPlan = [], planStartDate) {
  const days = Array.isArray(weeklyPlan) ? weeklyPlan.slice(0, 7) : [];
  const runDays = days
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => day?.sessionType && day.sessionType !== 'rest_or_xt');

  if (!runDays.length) {
    return {
      appliedScore: null,
      appliedNote: 'No run sessions in this plan to compare.',
      matchedSessions: 0,
      plannedRunSessions: 0
    };
  }

  const start = planStartDate ? new Date(planStartDate) : new Date();
  if (Number.isNaN(start.getTime())) {
    start.setHours(0, 0, 0, 0);
  }

  const rangeStart = new Date(start);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(start);
  rangeEnd.setDate(rangeEnd.getDate() + 7);
  rangeEnd.setHours(23, 59, 59, 999);

  const activities = await Activity.find({
    userId,
    date: { $gte: rangeStart, $lt: rangeEnd }
  }).select('date distance duration type').lean();

  let matched = 0;

  runDays.forEach(({ index }) => {
    const dayStart = new Date(start);
    dayStart.setDate(dayStart.getDate() + index);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const hasActivity = activities.some((a) => {
      const d = new Date(a.date);
      return d >= dayStart && d < dayEnd;
    });

    if (hasActivity) {
      matched += 1;
    }
  });

  const planned = runDays.length;
  const score = planned ? Math.round((matched / planned) * 100) : null;
  let appliedNote;

  if (matched === 0) {
    appliedNote = 'No Strava runs yet on planned run days — log a session when you train.';
  } else if (matched >= planned) {
    appliedNote = `All ${planned} planned run day(s) have a logged activity — great adherence.`;
  } else {
    appliedNote = `${matched} of ${planned} planned run day(s) logged so far.`;
  }

  return {
    appliedScore: score,
    appliedNote,
    matchedSessions: matched,
    plannedRunSessions: planned
  };
}

async function getWeeklyPlanCommitmentState(user, { reportId, generatedAt, weeklyPlan } = {}) {
  const reportKey = buildReportKey({ reportId, generatedAt });
  const commitment = serializeCommitment(user);
  const needsDecision = commitmentNeedsDecision(commitment, reportKey);

  let adherence = null;
  if (commitment?.status === 'following' && commitment.reportKey === reportKey) {
    adherence = await evaluatePlanApplied(user._id, weeklyPlan, generatedAt);
  } else if (commitment?.reportKey && commitment.reportKey !== reportKey) {
    adherence = await evaluatePlanApplied(
      user._id,
      weeklyPlan,
      commitment.reportGeneratedAt || generatedAt
    );
  }

  return {
    reportKey,
    commitment,
    needsDecision,
    adherence
  };
}

async function updateWeeklyPlanCommitment(userId, { reportId, generatedAt, status }) {
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const allowed = new Set(['following', 'declined', 'pending']);
  if (!allowed.has(status)) {
    const err = new Error('Invalid plan commitment status');
    err.status = 400;
    throw err;
  }

  const reportKey = buildReportKey({ reportId, generatedAt });
  if (!reportKey || reportKey === ':') {
    const err = new Error('reportId and generatedAt are required');
    err.status = 400;
    throw err;
  }

  user.weeklyPlanCommitment = {
    reportKey,
    reportGeneratedAt: generatedAt ? new Date(generatedAt) : new Date(),
    status,
    decidedAt: status === 'pending' ? null : new Date(),
    appliedCheckAt: null,
    appliedScore: null,
    appliedNote: ''
  };

  user.updatedAt = new Date();
  await user.save();

  return serializeCommitment(user);
}

module.exports = {
  buildReportKey,
  serializeCommitment,
  commitmentNeedsDecision,
  evaluatePlanApplied,
  getWeeklyPlanCommitmentState,
  updateWeeklyPlanCommitment
};
