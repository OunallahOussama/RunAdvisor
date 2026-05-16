const {
  buildSemanticVector,
  searchActivitiesSemantically,
  tokenize
} = require('../services/semanticSearch');

describe('semanticSearch', () => {
  it('tokenize removes stop words', () => {
    expect(tokenize('the long hilly run')).toContain('long');
    expect(tokenize('the long hilly run')).not.toContain('the');
  });

  it('buildSemanticVector returns normalized vector', () => {
    const vector = buildSemanticVector({
      name: 'Morning tempo',
      type: 'run',
      pace: 5.2,
      distance: 10000,
      elevationGain: 120
    });

    expect(vector).toHaveLength(32);
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 5);
  });

  it('searchActivitiesSemantically ranks relevant activities higher', () => {
    const activities = [
      {
        _id: '1',
        name: 'Flat easy recovery',
        type: 'run',
        pace: 6.5,
        distance: 5000,
        semanticVector: buildSemanticVector({ name: 'easy recovery flat', type: 'run', pace: 6.5, distance: 5000 })
      },
      {
        _id: '2',
        name: 'Steep hill repeats',
        type: 'trail run',
        pace: 5.8,
        distance: 8000,
        notes: 'hilly tempo climb',
        semanticVector: buildSemanticVector({
          name: 'Steep hill repeats',
          type: 'trail run',
          notes: 'hilly tempo climb',
          pace: 5.8,
          distance: 8000
        })
      }
    ];

    const results = searchActivitiesSemantically(activities, 'hilly tempo trail', 5);
    expect(results[0].activityId).toBe('2');
    expect(results[0].score).toBeGreaterThan(results[1]?.score || 0);
  });
});
