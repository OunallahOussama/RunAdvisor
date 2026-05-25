import {
  formatNumber,
  formatPaceLabel,
  formatPercent,
  formatMetric,
  formatChartTooltipValue,
  formatDeltaPercent,
  formatPaceDeltaSec,
  decimalPaceToMinSec,
  minSecToDecimalPace,
  formatRelativeTime,
  getRaceCountdown
} from '../utils/format';

describe('formatNumber', () => {
  it('rounds to two decimal places by default', () => {
    expect(formatNumber(5.156)).toBe('5.16');
    expect(formatNumber(5.1)).toBe('5.1');
    expect(formatNumber(5)).toBe('5');
  });

  it('never shows more than two decimal places', () => {
    expect(formatNumber(1.999, { digits: 3 })).toBe('2');
    expect(formatNumber(3.14159)).toBe('3.14');
  });

  it('supports integer formatting', () => {
    expect(formatNumber(42.7, { digits: 0 })).toBe('43');
  });

  it('returns em dash for invalid values', () => {
    expect(formatNumber(null)).toBe('—');
    expect(formatNumber('abc')).toBe('—');
  });

  it('appends suffix when provided', () => {
    expect(formatNumber(8.5, { suffix: ' km' })).toBe('8.5 km');
  });
});

describe('formatPaceLabel', () => {
  it('formats decimal pace as min:sec /km', () => {
    expect(formatPaceLabel(5.75)).toBe('5:45 /km');
    expect(formatPaceLabel(5.6)).toBe('5:36 /km');
  });
});

describe('formatPercent', () => {
  it('formats percentages with optional sign', () => {
    expect(formatPercent(88.4)).toBe('88%');
    expect(formatPercent(12.5, { signed: true, digits: 1 })).toBe('+12.5%');
  });
});

describe('formatMetric', () => {
  it('formats distance and pace types', () => {
    expect(formatMetric(10.456, 'km')).toBe('10.46 km');
    expect(formatMetric(5.5, 'pace')).toBe('5:30 /km');
  });
});

describe('formatChartTooltipValue', () => {
  it('uses pace labels for pace kind', () => {
    expect(formatChartTooltipValue('Avg pace', 5.5, { kind: 'pace' })).toBe('Avg pace: 5:30 /km');
  });
});

describe('formatDeltaPercent', () => {
  it('formats signed percent deltas', () => {
    expect(formatDeltaPercent(8)).toBe('+8%');
    expect(formatDeltaPercent(-3)).toBe('-3%');
  });
});

describe('formatPaceDeltaSec', () => {
  it('formats pace change in sec/km', () => {
    expect(formatPaceDeltaSec(-12)).toBe('-12s/km vs last week');
    expect(formatPaceDeltaSec(0)).toBe('same pace');
  });
});

describe('pace min/sec helpers', () => {
  it('converts decimal pace to min/sec and back', () => {
    expect(decimalPaceToMinSec(5.75)).toEqual({ minutes: '5', seconds: '45' });
    expect(minSecToDecimalPace('5', '45')).toBe(5.75);
  });
});

describe('formatRelativeTime', () => {
  it('formats recent activity times', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });
});

describe('getRaceCountdown', () => {
  it('returns weeks for distant races', () => {
    const in21Days = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRaceCountdown(in21Days)?.label).toMatch(/weeks to go/);
  });
});
