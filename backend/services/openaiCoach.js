const OpenAI = require('openai');

function buildFallbackWeeklySummary({ user, activities, progress, coachReview }) {
  const count = activities.length;
  const distanceKm = activities.reduce((sum, a) => sum + Number(a.distance || 0) / 1000, 0);
  const headline = coachReview?.headline || 'Keep building consistency this week.';
  const focus = coachReview?.nextFocus?.[0] || 'Protect one easy day before your next quality session.';

  return {
    source: 'rules',
    headline,
    summary: `You logged ${count} run(s) (~${distanceKm.toFixed(1)} km). ${headline} Next focus: ${focus}`,
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

async function generateWeeklyCoachSummary(context) {
  const { user, activities, progress, coachReview } = context;

  if (!process.env.OPENAI_API_KEY) {
    return buildFallbackWeeklySummary(context);
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const payload = {
      runner: {
        experience: user.experience,
        goalPaceMinPerKm: user.goalPaceMinPerKm,
        weeklyTrainingLoadKm: user.weeklyTrainingLoadKm,
        goalRace: user.goalRaceName,
        goalRaceDate: user.goalRaceDate
      },
      week: {
        activityCount: activities.length,
        totalDistanceKm: activities.reduce((sum, a) => sum + Number(a.distance || 0) / 1000, 0),
        progress
      },
      coachReview
    };

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are RunAdvisor, a friendly running coach. Write concise, practical guidance. No hype. 3-5 sentences max in summary. Return JSON with keys: headline, summary, bullets (array of strings).'
        },
        {
          role: 'user',
          content: JSON.stringify(payload)
        }
      ],
      response_format: { type: 'json_object' }
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);

    return {
      source: 'openai',
      headline: parsed.headline || 'Your week in review',
      summary: parsed.summary || buildFallbackWeeklySummary(context).summary,
      bullets: Array.isArray(parsed.bullets) ? parsed.bullets : []
    };
  } catch (error) {
    console.error('OpenAI coach summary failed:', error.message);
    return buildFallbackWeeklySummary(context);
  }
}

module.exports = {
  generateWeeklyCoachSummary,
  buildFallbackWeeklySummary
};
