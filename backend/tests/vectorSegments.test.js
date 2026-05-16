const {
  findSimilarActivitiesForId,
  findSimilarRunSegments,
  compareSplitProfiles
} = require('../services/vectorSegments');

describe('vectorSegments', () => {
  const activities = [
    {
      _id: 'a1',
      name: 'Tempo A',
      date: new Date(),
      distance: 10000,
      pace: 5.0,
      performanceVector: [1, 0.5, 0.4, 0.1, 0.7, 0.6]
    },
    {
      _id: 'a2',
      name: 'Tempo B',
      date: new Date(),
      distance: 10200,
      pace: 5.1,
      performanceVector: [0.95, 0.52, 0.41, 0.12, 0.68, 0.58]
    },
    {
      _id: 'a3',
      name: 'Easy jog',
      date: new Date(),
      distance: 5000,
      pace: 6.8,
      performanceVector: [0.5, 0.3, 0.2, 0.05, 0.5, 0.5]
    }
  ];

  it('findSimilarActivitiesForId excludes base activity', () => {
    const similar = findSimilarActivitiesForId(activities, 'a1', 5);
    expect(similar.every((item) => item.activityId !== 'a1')).toBe(true);
    expect(similar[0].similarity).toBeGreaterThan(0.5);
  });

  it('findSimilarRunSegments returns segment matches', () => {
    const segments = findSimilarRunSegments(activities, { activityId: 'a1', limit: 5 });
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0]).toHaveProperty('segmentLabel');
  });

  it('compareSplitProfiles scores similar pace profiles', () => {
    const splitsA = [
      { distance: 1000, moving_time: 300 },
      { distance: 1000, moving_time: 305 }
    ];
    const splitsB = [
      { distance: 1000, moving_time: 302 },
      { distance: 1000, moving_time: 308 }
    ];

    const score = compareSplitProfiles(splitsA, splitsB);
    expect(score).toBeGreaterThan(0.9);
  });
});
