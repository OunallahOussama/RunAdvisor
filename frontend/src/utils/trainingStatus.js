/** Garmin Connect–style training status from load + coach phase. */
export function getTrainingStatus({ acwr, readinessPhase } = {}) {
  const phase = String(readinessPhase || '').toLowerCase();
  const v = Number(acwr) || 0;

  if (phase === 'recover' || v > 1.5) {
    return {
      label: 'Recovery needed',
      detail: 'Ease off intensity and prioritize sleep and easy miles.',
      color: 'warning'
    };
  }

  if (phase === 'taper') {
    return {
      label: 'Taper',
      detail: 'Volume is winding down — trust the plan and stay fresh.',
      color: 'info'
    };
  }

  if (phase === 'peak') {
    return {
      label: 'Race ready',
      detail: 'Fitness is high — focus on sharpness, not volume.',
      color: 'success'
    };
  }

  if (v > 1.3) {
    return {
      label: 'High load',
      detail: 'Building fitness — watch fatigue and keep easy days easy.',
      color: 'warning'
    };
  }

  if (v > 0 && v < 0.8) {
    return {
      label: 'Maintaining',
      detail: 'Load is conservative — room to add volume if you feel good.',
      color: 'default'
    };
  }

  if (v >= 0.8 && v <= 1.3) {
    return {
      label: 'Productive',
      detail: 'Training load is in the sweet spot for steady progress.',
      color: 'success'
    };
  }

  return {
    label: phase === 'build' ? 'Building' : 'Getting started',
    detail: 'Log a few runs to unlock load and readiness insights.',
    color: 'default'
  };
}
