const MAX_DECIMALS = 2;

function clampDecimals(decimals) {
  return Math.min(Math.max(0, Math.floor(Number(decimals) || 0)), MAX_DECIMALS);
}

function round(value, decimals = MAX_DECIMALS) {
  if (!Number.isFinite(Number(value))) {
    return 0;
  }

  const safeDecimals = clampDecimals(decimals);
  const factor = 10 ** safeDecimals;
  return Math.round(Number(value) * factor) / factor;
}

function formatPaceMinPerKm(minPerKm) {
  const value = Number(minPerKm);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  const mins = Math.floor(value);
  const secs = Math.round((value - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

module.exports = {
  MAX_DECIMALS,
  round,
  formatPaceMinPerKm
};
