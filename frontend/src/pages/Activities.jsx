import React, { useState, useEffect } from 'react';
import { activitiesApi } from '../services/api';
import ActivityCard from '../components/ActivityCard';
import {
  ActivityIcon,
  CalendarIcon,
  DistanceIcon,
  ElevationIcon,
  HeartIcon,
  PaceIcon,
  TrailIcon
} from '../components/icons';
import { formatSnapshotTimestamp, loadSnapshot, saveSnapshot } from '../utils/offlineCache';

const ACTIVITIES_CACHE_KEY = 'activities-feed';

function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'run',
    distance: '',
    duration: '',
    date: new Date().toISOString().split('T')[0],
    elevationGain: '',
    avgHeartRate: '',
    notes: ''
  });

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await activitiesApi.getActivities(50);
      setActivities(response.data.activities);
      saveSnapshot(ACTIVITIES_CACHE_KEY, response.data.activities);
      setStatusMessage('');
    } catch (error) {
      console.error('Error fetching activities:', error);
      const cachedActivities = loadSnapshot(ACTIVITIES_CACHE_KEY);

      if (cachedActivities?.data) {
        setActivities(cachedActivities.data);
        setStatusMessage(`Showing your saved activity feed from ${formatSnapshotTimestamp(cachedActivities.savedAt)} while offline.`);
      } else {
        setStatusMessage('Unable to load activities right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  const runActivities = activities.filter((activity) => activity.type?.toLowerCase().includes('run'));
  const paceValues = runActivities.filter((activity) => activity.pace).map((activity) => activity.pace);
  const averagePace = paceValues.length ? (paceValues.reduce((sum, pace) => sum + pace, 0) / paceValues.length).toFixed(1) : null;
  const totalDistance = runActivities.length ? (runActivities.reduce((sum, activity) => sum + (activity.distance || 0), 0) / 1000).toFixed(1) : '0.0';
  const longestRun = runActivities.length ? (Math.max(...runActivities.map((activity) => activity.distance || 0)) / 1000).toFixed(1) : '0.0';
  const totalElevation = runActivities.reduce((sum, activity) => sum + (activity.elevationGain || 0), 0);

  const handleAddActivity = async (e) => {
    e.preventDefault();
    try {
      const activityData = {
        ...newActivity,
        distance: parseFloat(newActivity.distance),
        duration: parseInt(newActivity.duration),
        elevationGain: newActivity.elevationGain ? parseInt(newActivity.elevationGain) : 0,
        avgHeartRate: newActivity.avgHeartRate ? parseInt(newActivity.avgHeartRate) : null
      };

      await activitiesApi.createActivity(activityData);
      setNewActivity({
        name: '',
        type: 'run',
        distance: '',
        duration: '',
        date: new Date().toISOString().split('T')[0],
        elevationGain: '',
        avgHeartRate: '',
        notes: ''
      });
      setStatusMessage('Activity saved. Your training log and offline snapshot were refreshed.');
      fetchActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
      setStatusMessage('Unable to save this activity right now.');
    }
  };

  const handleDeleteActivity = async (id) => {
    try {
      await activitiesApi.deleteActivity(id);
      setStatusMessage('Activity removed from your log.');
      fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
      setStatusMessage('Unable to delete that activity right now.');
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <section className="mb-8 section-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Run log</p>
            <h1 className="section-heading">Run Log & Training Dashboard</h1>
            <p className="section-subtitle">A mobile-first racing and run tracking experience with pace, distance, and recovery insights.</p>
          </div>
          <div className="metric-panel max-w-sm">
            <p className="metric-title">Mobile tip</p>
            <p className="mt-2 text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>Tap "View details" on any activity card to expand notes, pace insights, and recovery cues.</p>
          </div>
        </div>
      </section>

      {statusMessage && (
        <section className="mb-8">
          <div className="page-banner">{statusMessage}</div>
        </section>
      )}

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="space-y-6">
          <div className="section-card">
            <div className="flex items-center gap-3">
              <span className="icon-shell">
                <ActivityIcon size={18} />
              </span>
              <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Manual run log</h2>
            </div>
            <form onSubmit={handleAddActivity} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                <span>Activity name</span>
                <input
                  type="text"
                  placeholder="Morning run, long run, recovery jog"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                  required
                  className="input-shell"
                />
              </label>
              <label className="field-label">
                <span>Activity type</span>
                <select
                  value={newActivity.type}
                  onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                  className="select-shell"
                >
                  <option value="run">Run</option>
                  <option value="walk">Walk</option>
                  <option value="trail run">Trail Run</option>
                </select>
              </label>
              <label className="field-label">
                <span>Distance (km)</span>
                <input
                  type="number"
                  placeholder="8.5"
                  value={newActivity.distance}
                  onChange={(e) => setNewActivity({ ...newActivity, distance: e.target.value })}
                  required
                  className="input-shell"
                />
              </label>
              <label className="field-label">
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  placeholder="52"
                  value={newActivity.duration}
                  onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
                  required
                  className="input-shell"
                />
              </label>
              <label className="field-label">
                <span>Date</span>
                <input
                  type="date"
                  value={newActivity.date}
                  onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                  required
                  className="input-shell"
                />
              </label>
              <label className="field-label">
                <span>Elevation gain (m)</span>
                <input
                  type="number"
                  placeholder="120"
                  value={newActivity.elevationGain}
                  onChange={(e) => setNewActivity({ ...newActivity, elevationGain: e.target.value })}
                  className="input-shell"
                />
              </label>
              <label className="field-label">
                <span>Avg Heart Rate (bpm)</span>
                <input
                  type="number"
                  placeholder="148"
                  value={newActivity.avgHeartRate}
                  onChange={(e) => setNewActivity({ ...newActivity, avgHeartRate: e.target.value })}
                  className="input-shell"
                />
              </label>
              <label className="field-label col-span-full">
                <span>Notes</span>
                <textarea
                  placeholder="How did it feel? Any pacing notes, terrain, or recovery reminders?"
                  value={newActivity.notes}
                  onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                  className="textarea-shell"
                  rows={3}
                />
              </label>
              <button type="submit" className="btn-primary col-span-full">
                <ActivityIcon size={16} />
                Add activity
              </button>
            </form>
          </div>

          <div className="section-card">
            <div className="flex items-center gap-3">
              <span className="icon-shell icon-shell-soft">
                <CalendarIcon size={18} />
              </span>
              <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Upcoming race preview</h2>
            </div>
            <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Use Coach Review to attach these activities to your next race and see readiness, risk, and pacing suggestions.</p>
          </div>
        </div>

        <div className="section-card space-y-4 xl:sticky xl:top-6">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Run summary</h3>
            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>Your recent training metrics for goal pacing and race readiness.</p>
          </div>
          <div className="activity-metric-grid text-sm">
            <div className="activity-metric">
              <p className="activity-metric-label"><ActivityIcon size={14} /> Runs logged</p>
              <p className="activity-metric-value">{runActivities.length}</p>
            </div>
            <div className="activity-metric">
              <p className="activity-metric-label"><PaceIcon size={14} /> Average pace</p>
              <p className="activity-metric-value">{averagePace ? `${averagePace} min/km` : 'N/A'}</p>
            </div>
            <div className="activity-metric">
              <p className="activity-metric-label"><DistanceIcon size={14} /> Distance</p>
              <p className="activity-metric-value">{totalDistance} km</p>
            </div>
            <div className="activity-metric">
              <p className="activity-metric-label"><TrailIcon size={14} /> Longest run</p>
              <p className="activity-metric-value">{longestRun} km</p>
            </div>
            <div className="activity-metric">
              <p className="activity-metric-label"><ElevationIcon size={14} /> Elevation</p>
              <p className="activity-metric-value">{totalElevation} m</p>
            </div>
            <div className="activity-metric">
              <p className="activity-metric-label"><HeartIcon size={14} /> Recovery check</p>
              <p className="activity-metric-value">{runActivities.length ? 'Ready for review' : 'Add data first'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        {loading ? (
          <div className="section-card">
            <p className="empty-state">Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="section-card">
            <p className="empty-state">No activities found. Start by syncing with Strava or adding a manual activity.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {activities.map((activity) => (
              <ActivityCard key={activity._id} activity={activity} onDelete={handleDeleteActivity} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default Activities;
