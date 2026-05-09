import React, { useState, useEffect } from 'react';
import { activitiesApi } from '../services/api';
import ActivityCard from '../components/ActivityCard';

function Activities() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
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
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const runActivities = activities.filter((activity) => activity.type?.toLowerCase().includes('run'));
  const paceValues = runActivities.filter((activity) => activity.pace).map((activity) => activity.pace);
  const averagePace = paceValues.length ? (paceValues.reduce((sum, pace) => sum + pace, 0) / paceValues.length).toFixed(1) : null;
  const totalDistance = runActivities.length ? (runActivities.reduce((sum, activity) => sum + (activity.distance || 0), 0) / 1000).toFixed(1) : '0.0';

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
      fetchActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const handleDeleteActivity = async (id) => {
    try {
      await activitiesApi.deleteActivity(id);
      fetchActivities();
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <section className="mb-8 section-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="section-heading">Run Log & Training Dashboard</h1>
            <p className="section-subtitle">A mobile-first racing and run tracking experience with pace, distance, and recovery insights.</p>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4 text-slate-300">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Tips</p>
            <p className="mt-2 text-sm leading-6">Tap "View details" on any activity card to expand notes, pace insights, and recovery cues.</p>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="space-y-6">
          <div className="section-card">
            <h2 className="text-2xl font-semibold text-white">Manual run log</h2>
            <form onSubmit={handleAddActivity} className="mt-5 grid gap-4 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Activity name"
                value={newActivity.name}
                onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                required
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
              <select
                value={newActivity.type}
                onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              >
                <option value="run">Run</option>
                <option value="walk">Walk</option>
                <option value="trail run">Trail Run</option>
              </select>
              <input
                type="number"
                placeholder="Distance (km)"
                value={newActivity.distance}
                onChange={(e) => setNewActivity({ ...newActivity, distance: e.target.value })}
                required
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
              <input
                type="number"
                placeholder="Duration (minutes)"
                value={newActivity.duration}
                onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
                required
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
              <input
                type="date"
                value={newActivity.date}
                onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                required
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
              <input
                type="number"
                placeholder="Elevation gain (m)"
                value={newActivity.elevationGain}
                onChange={(e) => setNewActivity({ ...newActivity, elevationGain: e.target.value })}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
              <input
                type="number"
                placeholder="Avg Heart Rate (bpm)"
                value={newActivity.avgHeartRate}
                onChange={(e) => setNewActivity({ ...newActivity, avgHeartRate: e.target.value })}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
              <textarea
                placeholder="Notes"
                value={newActivity.notes}
                onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                className="col-span-full rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
                rows={3}
              />
              <button type="submit" className="btn-primary col-span-full">
                Add Activity
              </button>
            </form>
          </div>

          <div className="section-card">
            <h2 className="text-2xl font-semibold text-white">Upcoming race preview</h2>
            <p className="mt-3 text-slate-300">Add your next race to keep your activity planning aligned with race goals and recovery.</p>
          </div>
        </div>

        <div className="section-card space-y-4 xl:sticky xl:top-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Run summary</h3>
            <p className="mt-2 text-slate-300">Your recent training metrics for goal pacing and race readiness.</p>
          </div>
          <div className="grid gap-3 text-sm text-slate-200">
            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-slate-400">Total run activities</p>
              <p className="mt-2 text-3xl font-semibold text-white">{runActivities.length}</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-slate-400">Average pace</p>
              <p className="mt-2 text-3xl font-semibold text-white">{averagePace ? `${averagePace} min/km` : 'N/A'}</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-950/70 p-4">
              <p className="text-slate-400">Weekly distance</p>
              <p className="mt-2 text-3xl font-semibold text-white">{totalDistance} km</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        {loading ? (
          <div className="section-card">
            <p>Loading activities...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="section-card">
            <p>No activities found. Start by syncing with Strava or adding a manual activity.</p>
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
