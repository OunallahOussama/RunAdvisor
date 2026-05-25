import React from 'react';
import { formatMetric, formatNumber } from '../utils/format';

/**
 * Consistent numeric display with unit — distance, pace, elevation, etc.
 * Use `type="pace"` for min:sec pace labels.
 */
function MetricValue({ value, unit, type, digits, fallback = '—', suffix = '' }) {
  if (type === 'pace') {
    return formatMetric(value, 'pace', { fallback });
  }
  if (value == null || value === '') {
    return fallback;
  }
  return `${formatNumber(value, { digits })}${suffix}${unit ? ` ${unit}` : ''}`.trim();
}

export default MetricValue;
