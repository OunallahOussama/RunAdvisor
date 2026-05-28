export const CHALLENGE_TEMPLATES = [
  {
    kind: 'monthly_km',
    title: 'Monthly km goal',
    targetKm: 120,
    description: 'Hit a distance target before month end.'
  },
  {
    kind: 'yearly_km',
    title: 'Year km goal',
    targetKm: 800,
    description: 'Year-to-date distance challenge.'
  },
  {
    kind: 'weekly_km',
    title: 'Weekly volume',
    targetKm: 40,
    description: 'Seven-day rolling distance.'
  },
  {
    kind: 'pace_cap',
    title: 'Pace goal',
    targetPaceMinPerKm: 5.5,
    description: 'Keep month average pace at or faster than target.'
  },
  {
    kind: 'pr_longest_km',
    title: 'Longest run PR',
    targetKm: 21,
    description: 'Beat your all-time longest run distance.'
  },
  {
    kind: 'pr_fastest_pace',
    title: 'Fastest pace PR',
    targetPaceMinPerKm: 5,
    description: 'Best pace on a run of 3 km or more.'
  },
  {
    kind: 'pr_elevation',
    title: 'Climb PR',
    targetKm: 500,
    description: 'Target elevation gain in meters (stored as targetKm).'
  },
  {
    kind: 'race_prediction',
    title: 'Race pace prediction',
    raceDistanceKm: 10,
    targetPaceMinPerKm: 5.2,
    description: 'Compare projected race pace from recent training.'
  }
];

export function challengeKindLabel(kind) {
  const t = CHALLENGE_TEMPLATES.find((item) => item.kind === kind);
  return t?.title || kind;
}
