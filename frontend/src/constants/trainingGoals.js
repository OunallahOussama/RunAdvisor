export const TRAINING_GOAL_CHOICES = [
  {
    value: '5k',
    label: '5K',
    subtitle: 'Speed & consistency',
    description: 'Sharpen speed over 6–10 weeks with 3–4 runs per week and one quality session.',
    weeklyKm: '20–35 km'
  },
  {
    value: '10k',
    label: '10K',
    subtitle: 'Endurance base',
    description: 'Build aerobic capacity with tempo work and a steady long run most weeks.',
    weeklyKm: '30–50 km'
  },
  {
    value: 'half',
    label: 'Half marathon',
    subtitle: 'Race-ready volume',
    description: 'Progressive long runs and controlled tempo blocks toward race day.',
    weeklyKm: '40–65 km'
  },
  {
    value: 'marathon',
    label: 'Marathon',
    subtitle: 'Long-haul build',
    description: 'Patient mileage build, fueling practice, and taper planning in the final weeks.',
    weeklyKm: '50–90 km'
  },
  {
    value: 'general_fitness',
    label: 'General fitness',
    subtitle: 'Stay healthy',
    description: 'Flexible structure focused on consistency, recovery, and how you feel day to day.',
    weeklyKm: 'Your pace'
  }
];

export function getTrainingGoalMeta(value) {
  return TRAINING_GOAL_CHOICES.find((g) => g.value === value) || TRAINING_GOAL_CHOICES[4];
}
