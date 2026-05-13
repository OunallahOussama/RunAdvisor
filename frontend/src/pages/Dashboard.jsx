import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { activitiesApi } from '../services/api';
import StatsCard from '../components/StatsCard';
import {
  ActivityIcon,
  ClockIcon,
  CoachIcon,
  DistanceIcon,
  ElevationIcon,
  HeartIcon,
  PaceIcon,
  SyncIcon,
  TargetIcon,
  TrendIcon
} from '../components/icons';
import { formatSnapshotTimestamp, loadSnapshot, saveSnapshot } from '../utils/offlineCache';

const DASHBOARD_CACHE_KEY = 'dashboard-summary';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchWeeklySummary();
  }, []);

  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      const response = await activitiesApi.getWeeklySummary();
      setSummary(response.data.summary);
      saveSnapshot(DASHBOARD_CACHE_KEY, response.data.summary);
      setStatusMessage('');
    } catch (error) {
      console.error('Error fetching summary:', error);
      const cachedSummary = loadSnapshot(DASHBOARD_CACHE_KEY);

      if (cachedSummary?.data) {
        setSummary(cachedSummary.data);
        setStatusMessage(`Showing your last saved weekly snapshot from ${formatSnapshotTimestamp(cachedSummary.savedAt)}.`);
      } else {
        setStatusMessage('Unable to load your dashboard right now. Sync or log a run once you are back online.');
      }
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      description: 'Connect Strava, refresh recent workouts, and keep your mobile activity history current.',
      icon: SyncIcon,
      title: 'Sync recent runs',
      to: '/strava-connect'
    },
    {
      description: 'Log a session with distance, duration, heart rate, and notes built for touch entry.',
      icon: ActivityIcon,
      title: 'Add a manual activity',
      to: '/activities'
    },
    {
      description: 'Review readiness, risk, and next focus with richer training context.',
      icon: CoachIcon,
      title: 'Open coach review',
      to: '/recommendations'
    },
    {
      description: 'Turn your recent data into a sharper race plan and pacing recommendation.',
      icon: TargetIcon,
      title: 'Plan the next race',
      to: '/recommendations'
    }
  ];

  const statCards = summary ? [
    {
      hint: 'Total distance recorded this week.',
      icon: DistanceIcon,
      title: 'Total Distance',
      value: `${summary.totalDistance.toFixed(1)} km`
    },
    {
      hint: 'Time spent moving across all sessions.',
      icon: ClockIcon,
      title: 'Total Time',
      value: `${(summary.totalDuration / 60).toFixed(1)} hrs`
    },
    {
      hint: 'How many sessions fueled your week.',
      icon: ActivityIcon,
      title: 'Activities',
      value: summary.activityCount
    },
    {
      hint: 'Average rhythm across your logged runs.',
      icon: PaceIcon,
      title: 'Avg Pace',
      value: `${summary.avgPace.toFixed(1)} min/km`
    },
    {
      hint: 'Climbing load across the week.',
      icon: ElevationIcon,
      title: 'Elevation Gain',
      value: `${summary.totalElevation.toFixed(0)} m`
    },
    {
      hint: 'Heart rate trend for aerobic control.',
      icon: HeartIcon,
      title: 'Avg HR',
      value: `${summary.avgHeartRate.toFixed(0)} bpm`
    }
  ] : [];

  const totalHours = summary ? (summary.totalDuration / 60).toFixed(1) : null;
  const dataStatusLabel = summary ? 'Weekly data loaded' : 'Awaiting first sync';
  const weeklyFocusTitle = summary
    ? `${summary.activityCount} sessions logged`
    : 'Build this week’s baseline';
  const weeklyFocusDescription = summary
    ? `You have ${summary.totalDistance.toFixed(1)} km across ${totalHours} hours this week. Review coach guidance to turn that load into pacing, recovery, and race-day decisions.`
    : 'Sync Strava or add a manual activity to unlock weekly load, pacing, and recovery guidance across the app.';
  const overviewMetrics = [
    {
      label: 'This week',
      supporting: summary ? `${summary.activityCount} sessions logged` : 'Sync Strava or add a run',
      value: summary ? `${summary.totalDistance.toFixed(1)} km` : 'No data yet'
    },
    {
      label: 'Training time',
      supporting: summary ? `${summary.totalElevation.toFixed(0)} m elevation gain` : 'Duration and elevation appear here',
      value: summary ? `${totalHours} hrs` : 'Ready to track'
    },
    {
      label: 'Coach review',
      supporting: summary ? 'Readiness, pacing, and recovery insights' : 'Unlock guidance after your first sync',
      value: summary ? 'Available now' : 'Pending data'
    }
  ];

  return (
    <main className="dashboard-page mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <section className="dashboard-overview-shell section-card mb-8">
        <div className="dashboard-overview-header">
          <div className="dashboard-overview-copy">
            <div className="dashboard-overview-meta">
              <span className="card-tag">Dashboard</span>
              <span className={summary ? 'status-pill status-pill-success' : 'status-pill'}>
                <SyncIcon size={14} />
                {dataStatusLabel}
              </span>
            </div>
            <h1 className="dashboard-page-title">Weekly training overview</h1>
            <p className="dashboard-page-subtitle">
              Monitor weekly load, keep your training data current, and move quickly between
              logging, syncing, and coach review.
            </p>
          </div>
          <div className="dashboard-header-actions">
            <Link to="/recommendations" className="btn-primary">
              <CoachIcon size={18} />
              Open coach review
            </Link>
            <Link to="/activities" className="btn-secondary">
              <ActivityIcon size={18} />
              Log activity
            </Link>
          </div>
        </div>
        <div className="dashboard-overview-grid">
          {overviewMetrics.map((metric) => (
            <div key={metric.label} className="dashboard-overview-metric">
              <p className="dashboard-overview-label">{metric.label}</p>
              <p className="dashboard-overview-value">{metric.value}</p>
              <p className="dashboard-overview-supporting">{metric.supporting}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-focus-grid mb-8">
        <div className="dashboard-focus-card">
          <div className="dashboard-focus-badges">
            <span className="detail-badge detail-badge-accent">
              <TargetIcon size={14} />
              Weekly focus
            </span>
            <span className={summary ? 'status-pill status-pill-success' : 'status-pill'}>
              <SyncIcon size={14} />
              {summary ? 'Current week loaded' : 'Ready for first sync'}
            </span>
          </div>
          <h2 className="dashboard-focus-title">{weeklyFocusTitle}</h2>
          <p className="dashboard-focus-copy">{weeklyFocusDescription}</p>
          <div className="inline-list">
            <span className="detail-badge">
              <DistanceIcon size={14} />
              {summary ? `${summary.totalDistance.toFixed(1)} km this week` : 'Weekly load tracking'}
            </span>
            <span className="detail-badge">
              <ClockIcon size={14} />
              {summary ? `${totalHours} hours logged` : 'Training time overview'}
            </span>
            <span className="detail-badge">
              <TrendIcon size={14} />
              Trend-aware coaching
            </span>
          </div>
        </div>
        <div className="dashboard-support-grid">
          <Link to="/recommendations" className="dashboard-support-card">
            <span className="icon-shell" aria-hidden="true">
              <CoachIcon size={18} />
            </span>
            <div>
              <p className="metric-title">Coach review</p>
              <p className="dashboard-support-title">
                {summary ? 'Review this training week' : 'Open when your data is ready'}
              </p>
              <p className="dashboard-support-copy">
                Readiness, risk, and next workout guidance in one focused workflow.
              </p>
            </div>
          </Link>
          <Link to="/strava-connect" className="dashboard-support-card">
            <span className="icon-shell" aria-hidden="true">
              <SyncIcon size={18} />
            </span>
            <div>
              <p className="metric-title">Data sync</p>
              <p className="dashboard-support-title">Keep workouts current</p>
              <p className="dashboard-support-copy">
                Refresh Strava and keep your mobile activity history accurate.
              </p>
            </div>
          </Link>
          <Link to="/activities" className="dashboard-support-card">
            <span className="icon-shell" aria-hidden="true">
              <ActivityIcon size={18} />
            </span>
            <div>
              <p className="metric-title">Run log</p>
              <p className="dashboard-support-title">Add a session fast</p>
              <p className="dashboard-support-copy">
                Capture distance, duration, heart rate, and notes without leaving the dashboard flow.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <section className="mb-8">
        <div className="dashboard-section-header">
          <div>
            <p className="eyebrow">Weekly metrics</p>
            <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
              Current training snapshot
            </h2>
          </div>
          <p className="dashboard-section-copy">
            Volume, pace, elevation, and heart-rate trends for the current week.
          </p>
        </div>
      </section>

      {statusMessage && (
        <section className="mb-8">
          <div className="page-banner">{statusMessage}</div>
        </section>
      )}

      {loading ? (
        <section className="section-card">
          <p className="empty-state">Loading your weekly stats...</p>
        </section>
      ) : summary ? (
        <section className="grid gap-6 lg:grid-cols-3">
          {statCards.map((card) => (
            <StatsCard
              key={card.title}
              hint={card.hint}
              icon={card.icon}
              title={card.title}
              value={card.value}
            />
          ))}
        </section>
      ) : (
        <section className="section-card">
          <p className="empty-state">No activities this week. Start by adding activities or connecting Strava.</p>
        </section>
      )}

      <section className="mt-8 section-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Workflows</p>
            <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Common training actions</h2>
          </div>
          <p className="m-0 max-w-xl text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
            Jump straight into the actions you are most likely to need during the week, with larger touch targets and clearer entry points.
          </p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map(({ description, icon: Icon, title, to }) => (
            <Link key={title} to={to} className="quick-action-card">
              <span className="icon-shell" aria-hidden="true">
                <Icon size={18} />
              </span>
              <strong>{title}</strong>
              <p>{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
