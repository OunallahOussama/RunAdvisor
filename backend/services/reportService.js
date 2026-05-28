/**
 * reportService
 *
 * Builds the professional "Training Report" object. Input is the
 * analytics snapshot produced by analyticsService; output is a strict
 * JSON document with sections that the frontend renders.
 *
 * If OPENAI_API_KEY is present the structured copy comes from an
 * OpenAI Chat Completions call configured for JSON-only output. If
 * the key is missing or OpenAI fails, a deterministic rule-based
 * fallback is used so the endpoint stays usable in dev/test.
 *
 * The model is instructed to use the provided numbers only — it must
 * not invent stats. All numeric metric placeholders in the returned
 * document are sourced from the analytics input.
 */

const OpenAI = require('openai');
const { buildPlanPeriod } = require('./planPeriod');

const TIMEOUT_MS = 60 * 1000;

function attachPlanPeriod(report, analytics) {
  const basedOn = analytics?.window?.days || 7;
  return {
    ...report,
    planPeriod: buildPlanPeriod(report.generatedAt, basedOn)
  };
}

function paceLabel(minPerKm) {
  if (!Number.isFinite(Number(minPerKm)) || Number(minPerKm) <= 0) {
    return 'n/a';
  }
  const mins = Math.floor(Number(minPerKm));
  const secs = Math.round((Number(minPerKm) - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} min/km`;
}

function paceBand(minPerKm, spread = 0.3) {
  if (!Number.isFinite(Number(minPerKm)) || Number(minPerKm) <= 0) {
    return null;
  }
  const center = Number(minPerKm);
  return {
    centerMinPerKm: Number(center.toFixed(2)),
    lowerMinPerKm: Number((center - spread).toFixed(2)),
    upperMinPerKm: Number((center + spread).toFixed(2)),
    label: `${paceLabel(center - spread)} – ${paceLabel(center + spread)}`
  };
}

function safeIso(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return d.toISOString();
  } catch (e) {
    return null;
  }
}

function fallbackKeyMetrics(analytics) {
  return {
    windowDays: analytics.window?.days || 0,
    activityCount: analytics.window?.activityCount || 0,
    totalDistanceKm: analytics.volume?.totalDistanceKm || 0,
    totalMovingMinutes: analytics.volume?.totalMovingMinutes || 0,
    runsPerWeek: analytics.volume?.runsPerWeek || 0,
    avgPaceMinPerKm: analytics.pace?.avgPaceMinPerKm || 0,
    avgHeartRate: analytics.heartRate?.avgHeartRate || 0,
    longestRunKm: analytics.volume?.longestRunKm || 0,
    totalElevationM: analytics.volume?.totalElevationM || 0,
    acwr: analytics.trainingLoad?.acwr || 0,
    weeklyLoad: analytics.trainingLoad?.weeklyLoad || 0,
    monotony: analytics.trainingLoad?.monotony || 0,
    strain: analytics.trainingLoad?.strain || 0,
    intensityPct: analytics.intensityDistribution || { easy: 0, tempo: 0, threshold: 0, vo2: 0 },
    distanceDeltaPctWoW: analytics.trends?.distanceDeltaPctWoW ?? null,
    distanceDeltaPct28d: analytics.trends?.distanceDeltaPct28d ?? null
  };
}

function buildFallbackReport(analytics, user = {}, options = {}) {
  const { acwr = 0, monotony = 0 } = analytics.trainingLoad || {};
  const easyPct = analytics.intensityDistribution?.easy ?? 0;
  const avgPace = analytics.pace?.avgPaceMinPerKm || 0;
  const longestRunKm = analytics.volume?.longestRunKm || 0;

  let phase = 'build';
  if (acwr > 1.5 || monotony > 2.0) {
    phase = 'recover';
  } else if (analytics.window?.activityCount < 3) {
    phase = 'rebuild';
  }

  const easyPace = avgPace ? avgPace + 0.8 : 6.2;
  const tempoPace = avgPace ? Math.max(3.5, avgPace - 0.4) : 5.0;
  const thresholdPace = avgPace ? Math.max(3.3, avgPace - 0.7) : 4.6;
  const goalRace = options.raceName || user.goalRaceName || null;

  const weeklyPlan = [];
  const dayTemplates = [
    {
      day: 1,
      sessionType: 'easy_run',
      title: 'Easy aerobic run',
      durationMinutes: 45,
      distanceKm: Math.max(5, Number(((analytics.volume?.avgDistanceKm || 6) * 0.85).toFixed(2))),
      targetPace: paceBand(easyPace, 0.3),
      rpe: 4,
      description: 'Conversational pace from start to finish. Nose-breathing-ish effort.'
    },
    {
      day: 2,
      sessionType: 'rest_or_xt',
      title: 'Full rest or 30 min easy cross-training',
      durationMinutes: 30,
      distanceKm: 0,
      targetPace: null,
      rpe: 2,
      description: 'Sleep, hydration, mobility. Optional easy bike/swim.'
    },
    {
      day: 3,
      sessionType: 'tempo',
      title: 'Tempo intervals',
      durationMinutes: 50,
      distanceKm: 8,
      targetPace: paceBand(tempoPace, 0.15),
      rpe: 7,
      description: '15 min easy WU + 3 × 8 min @ tempo / 2 min jog + 10 min CD.'
    },
    {
      day: 4,
      sessionType: 'easy_run',
      title: 'Recovery jog',
      durationMinutes: 35,
      distanceKm: Math.max(4, Number(((analytics.volume?.avgDistanceKm || 6) * 0.6).toFixed(2))),
      targetPace: paceBand(easyPace + 0.4, 0.4),
      rpe: 3,
      description: 'Slow shake-out, focus on cadence and posture.'
    },
    {
      day: 5,
      sessionType: 'threshold',
      title: 'Threshold session',
      durationMinutes: 55,
      distanceKm: 9,
      targetPace: paceBand(thresholdPace, 0.15),
      rpe: 8,
      description: '15 min WU + 4 × 1 km @ threshold / 90 s jog + 10 min CD.'
    },
    {
      day: 6,
      sessionType: 'easy_run',
      title: 'Easy run with strides',
      durationMinutes: 40,
      distanceKm: Math.max(5, Number(((analytics.volume?.avgDistanceKm || 6) * 0.75).toFixed(2))),
      targetPace: paceBand(easyPace, 0.3),
      rpe: 4,
      description: 'Add 6 × 20 s strides in the last 10 minutes.'
    },
    {
      day: 7,
      sessionType: 'long_run',
      title: 'Long run',
      durationMinutes: 90,
      distanceKm: Math.max(longestRunKm * 1.05, (analytics.volume?.avgDistanceKm || 6) + 4),
      targetPace: paceBand(easyPace + 0.1, 0.35),
      rpe: 5,
      description: 'Steady aerobic effort, finish strong but controlled in the final 15 min.'
    }
  ];

  for (let i = 0; i < 7; i += 1) {
    weeklyPlan.push(dayTemplates[i]);
  }

  const fourWeekOutlook = [
    { week: 1, focus: 'Stabilize current load', volumeKm: analytics.volume?.totalDistanceKm / 4 || 30, qualitySessions: 2, notes: 'Hold weekly volume, sharpen aerobic base.' },
    { week: 2, focus: 'Progressive build', volumeKm: (analytics.volume?.totalDistanceKm / 4 || 30) * 1.08, qualitySessions: 2, notes: 'Add a controlled tempo and one progressive long run.' },
    { week: 3, focus: 'Peak quality', volumeKm: (analytics.volume?.totalDistanceKm / 4 || 30) * 1.12, qualitySessions: 2, notes: 'Hardest quality week. Protect sleep, monitor HR drift.' },
    { week: 4, focus: 'Down / consolidation', volumeKm: (analytics.volume?.totalDistanceKm / 4 || 30) * 0.85, qualitySessions: 1, notes: 'Reduce volume ~15%. Keep one short race-pace session.' }
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    windowDays: analytics.window?.days || 0,
    source: 'fallback',
    executiveSummary: {
      headline: phase === 'recover'
        ? 'Recent load looks aggressive — the next two weeks should absorb work before adding more.'
        : phase === 'rebuild'
        ? 'Limited recent data — rebuild consistency before chasing intensity.'
        : 'Training is progressing in a healthy build phase — keep the structure tight.',
      readinessPhase: phase,
      paragraph: `Over the last ${analytics.window?.days || 0} day(s) you ran ${analytics.window?.activityCount || 0} time(s) for ${analytics.volume?.totalDistanceKm || 0} km. Average pace was ${paceLabel(avgPace)}; ACWR is ${acwr} and monotony is ${monotony}. Easy running accounts for ${easyPct}% of total time.`,
      goalRace: goalRace
    },
    workloadAnalysis: {
      paragraph: `Weekly load (TRIMP-style proxy) is ${analytics.trainingLoad?.weeklyLoad || 0} units. ACWR ${acwr} ${acwr > 1.5 ? 'suggests an overload risk' : acwr < 0.8 ? 'is conservative — you have room to build' : 'is in a healthy progression zone'}. Monotony ${monotony} ${monotony > 2 ? 'is elevated, meaning load is spread too uniformly across days' : 'looks sustainable'}.`,
      flags: [
        acwr > 1.5 ? 'High ACWR — back off this week' : null,
        monotony > 2 ? 'Monotony elevated — add a true rest day' : null,
        analytics.trends?.distanceDeltaPctWoW && analytics.trends.distanceDeltaPctWoW > 25 ? 'Week-over-week jump >25%' : null
      ].filter(Boolean),
      acwr,
      monotony,
      strain: analytics.trainingLoad?.strain || 0
    },
    paceEffortAnalysis: {
      paragraph: `Average pace ${paceLabel(avgPace)} with fastest day at ${paceLabel(analytics.pace?.fastestPaceMinPerKm)}. Easy/tempo/threshold/VO2 split is ${analytics.intensityDistribution?.easy || 0}/${analytics.intensityDistribution?.tempo || 0}/${analytics.intensityDistribution?.threshold || 0}/${analytics.intensityDistribution?.vo2 || 0}%.`,
      intensityComment: easyPct < 65
        ? 'You may be running too many sessions in the moderate zone. Aim for 70-80% true easy.'
        : 'Easy/hard split looks well distributed.'
    },
    splitAnalysis: {
      paragraph: analytics.perActivity?.length
        ? `Across the ${analytics.perActivity.length} most recent runs, pacing profile is mixed: ${analytics.perActivity.filter((a) => a.splitProfile === 'negative').length} negative split(s), ${analytics.perActivity.filter((a) => a.splitProfile === 'positive').length} positive split(s).`
        : 'Not enough split data yet — sync a few more runs to enable per-km commentary.',
      activities: (analytics.perActivity || []).map((a) => ({
        activityId: a.activityId,
        name: a.name,
        date: safeIso(a.date),
        distanceKm: a.distanceKm,
        avgPaceMinPerKm: a.avgPaceMinPerKm,
        splitProfile: a.splitProfile,
        fastestKm: a.fastestKilometer,
        slowestKm: a.slowestKilometer,
        hrDriftBpm: a.hrDriftBpm,
        estimatedRpe: a.estimatedRpe,
        comment: a.splitProfile === 'negative'
          ? 'Strong second half — controlled start, finished well.'
          : a.splitProfile === 'positive'
          ? 'Pace faded in the second half — consider starting slightly easier next time.'
          : 'Even effort, good control.'
      }))
    },
    riskAndRecovery: {
      paragraph: phase === 'recover'
        ? 'Workload is elevated. Prioritize sleep, easy days, and avoid stacking quality sessions back-to-back.'
        : 'No major red flags. Keep an eye on HR drift in long runs and protect easy-day intensity.',
      injuryRiskLevel: acwr > 1.5 ? 'high' : acwr > 1.2 ? 'moderate' : 'low',
      recoveryActions: [
        'Sleep 7-9 h and prioritize protein within 30 min after key sessions.',
        'Use one full rest day each week.',
        'Foam-roll calves/quads after long runs.'
      ]
    },
    nextSessionDetail: {
      title: 'Tempo intervals',
      objective: 'Boost lactate threshold without crossing into VO2 work.',
      durationMinutes: 50,
      warmup: {
        durationMinutes: 15,
        description: 'Easy jog with 4 × 20 s strides at the end.',
        targetPace: paceBand(easyPace, 0.3),
        hrZone: 'Z2'
      },
      mainSet: {
        durationMinutes: 25,
        description: '3 × 8 min @ tempo / 2 min easy jog recovery.',
        targetPace: paceBand(tempoPace, 0.15),
        hrZone: 'Z3-Z4',
        rpe: 7
      },
      cooldown: {
        durationMinutes: 10,
        description: 'Easy jog back to rest HR.',
        targetPace: paceBand(easyPace + 0.4, 0.4),
        hrZone: 'Z1-Z2'
      }
    },
    weeklyPlan,
    fourWeekOutlook,
    keyMetrics: fallbackKeyMetrics(analytics)
  };

  return attachPlanPeriod(report, analytics);
}

function buildOpenAiPrompt(analytics, user, options) {
  const goalRace = options.raceName || user.goalRaceName || null;
  const goalRaceDistance = options.raceDistance || user.goalRaceDistanceKm || null;
  const goalRaceDate = options.raceDate || user.goalRaceDate || null;

  return {
    runner: {
      experience: user.experience || null,
      goalPaceMinPerKm: user.goalPaceMinPerKm || null,
      weeklyTrainingLoadKm: user.weeklyTrainingLoadKm || null,
      goalRace,
      goalRaceDate: safeIso(goalRaceDate),
      goalRaceDistanceKm: goalRaceDistance
    },
    analytics
  };
}

const SYSTEM_PROMPT = `You are RunAdvisor — an experienced running coach and applied sports scientist.
You produce concise, evidence-based, professional training reports based ONLY on the numeric statistics you are given.
Do NOT invent metrics. Do NOT contradict the input numbers. If a metric is missing, acknowledge it and proceed.

Return STRICT JSON with exactly the following top-level keys (no extra keys, no markdown):
{
  "executiveSummary": {
    "headline": string,
    "readinessPhase": "build" | "recover" | "rebuild" | "taper" | "peak",
    "paragraph": string,                       // 3-5 sentence narrative
    "goalRace": string | null
  },
  "workloadAnalysis": {
    "paragraph": string,                        // 3-5 sentences
    "flags": string[],
    "acwr": number,
    "monotony": number,
    "strain": number
  },
  "paceEffortAnalysis": {
    "paragraph": string,                        // 3-5 sentences
    "intensityComment": string
  },
  "splitAnalysis": {
    "paragraph": string,
    "activities": [
      {
        "activityId": string,
        "name": string,
        "date": string | null,                  // ISO
        "distanceKm": number,
        "avgPaceMinPerKm": number,
        "splitProfile": "negative" | "positive" | "even",
        "fastestKm": { "km": number, "pace": number } | null,
        "slowestKm": { "km": number, "pace": number } | null,
        "hrDriftBpm": number | null,
        "estimatedRpe": number,
        "comment": string                        // 1-2 sentences per activity
      }
    ]
  },
  "riskAndRecovery": {
    "paragraph": string,
    "injuryRiskLevel": "low" | "moderate" | "high",
    "recoveryActions": string[]
  },
  "nextSessionDetail": {
    "title": string,
    "objective": string,
    "durationMinutes": number,
    "warmup":   { "durationMinutes": number, "description": string, "targetPace": { "centerMinPerKm": number, "lowerMinPerKm": number, "upperMinPerKm": number, "label": string } | null, "hrZone": string },
    "mainSet":  { "durationMinutes": number, "description": string, "targetPace": { "centerMinPerKm": number, "lowerMinPerKm": number, "upperMinPerKm": number, "label": string } | null, "hrZone": string, "rpe": number },
    "cooldown": { "durationMinutes": number, "description": string, "targetPace": { "centerMinPerKm": number, "lowerMinPerKm": number, "upperMinPerKm": number, "label": string } | null, "hrZone": string }
  },
  "weeklyPlan": [
    {
      "day": 1..7,
      "sessionType": "easy_run" | "long_run" | "tempo" | "threshold" | "intervals" | "rest_or_xt" | "race_pace" | "fartlek",
      "title": string,
      "durationMinutes": number,
      "distanceKm": number,
      "targetPace": { "centerMinPerKm": number, "lowerMinPerKm": number, "upperMinPerKm": number, "label": string } | null,
      "rpe": number,
      "description": string
    }
  ],
  "fourWeekOutlook": [
    { "week": 1..4, "focus": string, "volumeKm": number, "qualitySessions": number, "notes": string }
  ],
  "keyMetrics": object                          // pass the numeric inputs back here
}

Tone: confident but honest. Use plural-runner vocabulary ("you"). Prefer specific numbers over vague phrases.
Always include exactly 7 entries in weeklyPlan (day 1 through 7).
Always include exactly 4 entries in fourWeekOutlook.
keyMetrics MUST reflect the input numbers; do not invent values.`;

async function generateReport(analytics, user = {}, options = {}) {
  const fallback = () => buildFallbackReport(analytics, user, options);

  if (!process.env.OPENAI_API_KEY) {
    return attachPlanPeriod({ ...fallback(), source: 'fallback' }, analytics);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: TIMEOUT_MS });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const promptPayload = buildOpenAiPrompt(analytics, user, options);

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.35,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(promptPayload) }
      ],
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    const report = {
      generatedAt: new Date().toISOString(),
      windowDays: analytics.window?.days || 0,
      source: 'openai',
      model,
      executiveSummary: parsed.executiveSummary || fallback().executiveSummary,
      workloadAnalysis: parsed.workloadAnalysis || fallback().workloadAnalysis,
      paceEffortAnalysis: parsed.paceEffortAnalysis || fallback().paceEffortAnalysis,
      splitAnalysis: parsed.splitAnalysis || fallback().splitAnalysis,
      riskAndRecovery: parsed.riskAndRecovery || fallback().riskAndRecovery,
      nextSessionDetail: parsed.nextSessionDetail || fallback().nextSessionDetail,
      weeklyPlan: Array.isArray(parsed.weeklyPlan) && parsed.weeklyPlan.length
        ? parsed.weeklyPlan
        : fallback().weeklyPlan,
      fourWeekOutlook: Array.isArray(parsed.fourWeekOutlook) && parsed.fourWeekOutlook.length
        ? parsed.fourWeekOutlook
        : fallback().fourWeekOutlook,
      // keyMetrics always sourced from analytics — never trust the model
      keyMetrics: fallbackKeyMetrics(analytics)
    };
    return attachPlanPeriod(report, analytics);
  } catch (error) {
    console.error('OpenAI training report failed:', error.message || error);
    return attachPlanPeriod(
      { ...fallback(), source: 'fallback_error', error: error.message || 'unknown' },
      analytics
    );
  }
}

module.exports = {
  generateReport,
  buildFallbackReport,
  buildOpenAiPrompt,
  fallbackKeyMetrics,
  paceLabel,
  paceBand,
  SYSTEM_PROMPT
};
