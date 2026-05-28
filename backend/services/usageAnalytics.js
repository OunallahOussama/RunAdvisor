const User = require('../models/User');
const Activity = require('../models/Activity');
const UsageEvent = require('../models/UsageEvent');

async function countSince(model, filter, since) {
  return model.countDocuments({
    ...filter,
    createdAt: { $gte: since }
  });
}

async function aggregateUsageByEvent(since) {
  return UsageEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 },
        avgDurationMs: { $avg: '$durationMs' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        event: '$_id',
        count: 1,
        avgDurationMs: { $round: ['$avgDurationMs', 0] },
        uniqueUsers: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { count: -1 } }
  ]);
}

async function dailyUsageSeries(since, days = 7) {
  return UsageEvent.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        requests: { $sum: 1 },
        errors: {
          $sum: {
            $cond: [{ $gte: ['$statusCode', 400] }, 1, 0]
          }
        }
      }
    },
    { $sort: { _id: 1 } },
    { $limit: days }
  ]);
}

async function buildAdminOverview(days = 7) {
  const windowDays = Math.min(Math.max(Number(days) || 7, 1), 90);
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const since24h = new Date(now - dayMs);
  const sinceWindow = new Date(now - windowDays * dayMs);

  const [
    totalUsers,
    stravaConnected,
    totalActivities,
    activeUsers7d,
    requests24h,
    requests7d,
    usageByEvent,
    dailySeries
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ stravaId: { $exists: true, $ne: null } }),
    Activity.countDocuments(),
    UsageEvent.distinct('userId', { createdAt: { $gte: sinceWindow }, userId: { $ne: null } }),
    UsageEvent.countDocuments({ createdAt: { $gte: since24h } }),
    UsageEvent.countDocuments({ createdAt: { $gte: sinceWindow } }),
    aggregateUsageByEvent(sinceWindow),
    dailyUsageSeries(sinceWindow, Math.min(windowDays, 30))
  ]);

  const newUsersWindow = await countSince(User, {}, sinceWindow);
  const newActivitiesWindow = await Activity.countDocuments({ createdAt: { $gte: sinceWindow } });
  const clientErrorsWindow = await UsageEvent.countDocuments({
    createdAt: { $gte: sinceWindow },
    statusCode: { $gte: 400, $lt: 500 }
  });
  const serverErrorsWindow = await UsageEvent.countDocuments({
    createdAt: { $gte: sinceWindow },
    statusCode: { $gte: 500 }
  });

  return {
    totals: {
      users: totalUsers,
      activities: totalActivities,
      stravaConnected
    },
    windowDays,
    activity: {
      activeUsers: activeUsers7d.length,
      newUsers: newUsersWindow,
      newActivities: newActivitiesWindow,
      requests24h,
      requestsWindow: requests7d,
      clientErrors: clientErrorsWindow,
      serverErrors: serverErrorsWindow,
      errorRatePct: requests7d
        ? Math.round(((clientErrorsWindow + serverErrorsWindow) / requests7d) * 1000) / 10
        : 0
    },
    usageByEvent,
    dailySeries: dailySeries.map((row) => ({
      date: row._id,
      requests: row.requests,
      errors: row.errors
    })),
    generatedAt: new Date().toISOString()
  };
}

async function buildApplicationInsights(days = 7) {
  const windowDays = Math.min(Math.max(Number(days) || 7, 1), 90);
  const since7d = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [slowRequests, errorEvents, topPaths] = await Promise.all([
    UsageEvent.find({
      createdAt: { $gte: since7d },
      durationMs: { $gte: 2000 }
    })
      .sort({ durationMs: -1 })
      .limit(10)
      .select('path method durationMs statusCode createdAt event')
      .lean(),
    UsageEvent.countDocuments({
      createdAt: { $gte: since7d },
      statusCode: { $gte: 500 }
    }),
    UsageEvent.aggregate([
      { $match: { createdAt: { $gte: since7d } } },
      { $group: { _id: '$path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ])
  ]);

  const [avgLatency, statusBreakdown] = await Promise.all([
    UsageEvent.aggregate([
      { $match: { createdAt: { $gte: since7d }, durationMs: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$durationMs' }, max: { $max: '$durationMs' } } }
    ]),
    UsageEvent.aggregate([
      { $match: { createdAt: { $gte: since7d }, statusCode: { $exists: true } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$statusCode', 400] }, then: '2xx' },
                { case: { $lt: ['$statusCode', 500] }, then: '4xx' },
                { case: { $gte: ['$statusCode', 500] }, then: '5xx' }
              ],
              default: 'other'
            }
          },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return {
    windowDays,
    slowRequests,
    serverErrors7d: errorEvents,
    topPaths: topPaths.map((row) => ({ path: row._id, count: row.count })),
    statusBreakdown: statusBreakdown.map((row) => ({ bucket: row._id, count: row.count })),
    latency: {
      avgMs: Math.round(avgLatency[0]?.avg || 0),
      maxMs: Math.round(avgLatency[0]?.max || 0)
    }
  };
}

async function buildAdminUsersDirectory(days = 30, limit = 200) {
  const windowDays = Math.min(Math.max(Number(days) || 30, 1), 90);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const cap = Math.min(Math.max(Number(limit) || 200, 1), 500);

  const [totalUsers, users] = await Promise.all([
    User.countDocuments(),
    User.find({})
      .sort({ lastActiveAt: -1, lastLoginAt: -1, updatedAt: -1 })
      .limit(cap)
      .select(
        'name email picture role stravaId discoverable createdAt updatedAt lastLoginAt lastActiveAt'
      )
      .lean()
  ]);

  const userIds = users.map((u) => u._id);

  const [activityStats, usageStats] = await Promise.all([
    Activity.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: '$userId',
          totalActivities: { $sum: 1 },
          recentActivities: {
            $sum: { $cond: [{ $gte: ['$createdAt', since] }, 1, 0] }
          }
        }
      }
    ]),
    UsageEvent.aggregate([
      { $match: { userId: { $in: userIds }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$userId',
          requests: { $sum: 1 },
          lastRequestAt: { $max: '$createdAt' }
        }
      }
    ])
  ]);

  const activityByUser = new Map(activityStats.map((row) => [String(row._id), row]));
  const usageByUser = new Map(usageStats.map((row) => [String(row._id), row]));

  const directory = users.map((user) => {
    const id = String(user._id);
    const activity = activityByUser.get(id);
    const usage = usageByUser.get(id);

    return {
      id,
      name: user.name || 'Runner',
      email: user.email || null,
      picture: user.picture || null,
      role: user.role || 'user',
      stravaConnected: Boolean(user.stravaId),
      discoverable: user.discoverable !== false,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || null,
      lastActiveAt: user.lastActiveAt || user.updatedAt || null,
      totalActivities: activity?.totalActivities || 0,
      recentActivities: activity?.recentActivities || 0,
      requestsWindow: usage?.requests || 0,
      lastRequestAt: usage?.lastRequestAt || null
    };
  });

  return {
    windowDays,
    totalUsers,
    listed: directory.length,
    users: directory,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  buildAdminOverview,
  buildApplicationInsights,
  buildAdminUsersDirectory,
  aggregateUsageByEvent,
  dailyUsageSeries
};
