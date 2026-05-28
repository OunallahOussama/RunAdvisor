const { buildPlanPeriod } = require('../services/planPeriod');

describe('planPeriod', () => {
  it('builds rolling 7-day window from report generatedAt', () => {
    const start = '2026-05-20T12:00:00.000Z';
    const period = buildPlanPeriod(start, 7);
    expect(period.startsAt).toBe(start);
    expect(period.basedOnLastDays).toBe(7);
    expect(period.rollingDays).toBe(7);
    const end = new Date(period.endsAt).getTime();
    const begin = new Date(period.startsAt).getTime();
    expect(end - begin).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
