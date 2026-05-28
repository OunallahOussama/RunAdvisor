const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Rolling training plan window: starts at report creation, runs 7 days forward.
 * Built from analytics over the prior `basedOnLastDays` (default 7).
 */
function buildPlanPeriod(generatedAt, basedOnLastDays = 7) {
  const start = generatedAt ? new Date(generatedAt) : new Date();
  if (Number.isNaN(start.getTime())) {
    start.setTime(Date.now());
  }

  const end = new Date(start.getTime() + 7 * DAY_MS);

  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    basedOnLastDays,
    rollingDays: 7
  };
}

module.exports = { buildPlanPeriod, DAY_MS };
