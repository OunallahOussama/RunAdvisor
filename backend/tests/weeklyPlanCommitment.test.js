const {
  buildReportKey,
  commitmentNeedsDecision,
  evaluatePlanApplied
} = require('../services/weeklyPlanCommitment');

describe('weeklyPlanCommitment', () => {
  it('buildReportKey combines id and generatedAt', () => {
    const key = buildReportKey({ reportId: 'abc', generatedAt: '2026-05-01T12:00:00.000Z' });
    expect(key).toContain('abc');
    expect(key).toContain('2026-05-01');
  });

  it('needs decision when report key differs', () => {
    expect(
      commitmentNeedsDecision({ reportKey: 'old:date', status: 'following' }, 'new:date')
    ).toBe(true);
    expect(commitmentNeedsDecision(null, 'new:date')).toBe(true);
    expect(
      commitmentNeedsDecision({ reportKey: 'same:date', status: 'following' }, 'same:date')
    ).toBe(false);
  });

  it('evaluatePlanApplied counts matched run days', async () => {
    const userId = '507f1f77bcf86cd799439011';
    const planStart = new Date('2026-05-20T08:00:00.000Z');
    const weeklyPlan = [
      { day: 1, sessionType: 'easy_run', title: 'Easy' },
      { day: 2, sessionType: 'rest_or_xt', title: 'Rest' },
      { day: 3, sessionType: 'tempo', title: 'Tempo' }
    ];

    const Activity = require('../models/Activity');
    jest.spyOn(Activity, 'find').mockReturnValue({
      select: () => ({
        lean: async () => [
          { date: new Date('2026-05-20T10:00:00.000Z') },
          { date: new Date('2026-05-22T10:00:00.000Z') }
        ]
      })
    });

    const result = await evaluatePlanApplied(userId, weeklyPlan, planStart);
    expect(result.plannedRunSessions).toBe(2);
    expect(result.matchedSessions).toBe(2);
    expect(result.appliedScore).toBe(100);

    Activity.find.mockRestore();
  });
});
