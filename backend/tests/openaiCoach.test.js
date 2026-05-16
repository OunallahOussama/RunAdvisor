const { buildFallbackWeeklySummary } = require('../services/openaiCoach');

describe('openaiCoach fallback', () => {
  it('returns structured summary without OpenAI', () => {
    const summary = buildFallbackWeeklySummary({
      user: { goalPaceMinPerKm: 5.5, weeklyTrainingLoadKm: 35 },
      activities: [
        { distance: 10000 },
        { distance: 8000 }
      ],
      progress: { loadProgressPct: 80, weeklyLoadTargetKm: 35 },
      coachReview: {
        headline: 'Solid week.',
        nextFocus: ['Keep easy days easy.']
      }
    });

    expect(summary.source).toBe('rules');
    expect(summary.headline).toBe('Solid week.');
    expect(summary.summary).toMatch(/2 run/);
    expect(summary.bullets.length).toBeGreaterThan(0);
  });
});
