import { getTrainingStatus } from '../utils/trainingStatus';

describe('getTrainingStatus', () => {
  it('returns productive for healthy ACWR', () => {
    expect(getTrainingStatus({ acwr: 1.1, readinessPhase: 'build' }).label).toBe('Productive');
  });

  it('returns recovery when ACWR is high', () => {
    expect(getTrainingStatus({ acwr: 1.6 }).label).toBe('Recovery needed');
  });

  it('returns taper from phase', () => {
    expect(getTrainingStatus({ acwr: 1.0, readinessPhase: 'taper' }).label).toBe('Taper');
  });
});
