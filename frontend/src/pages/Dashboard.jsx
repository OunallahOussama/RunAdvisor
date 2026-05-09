import React, { useState, useEffect } from 'react';
import { activitiesApi } from '../services/api';
import StatsCard from '../components/StatsCard';

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklySummary();
  }, []);

  const fetchWeeklySummary = async () => {
    try {
      setLoading(true);
      const response = await activitiesApi.getWeeklySummary();
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <section className="section-card mb-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <div>
            <h1 className="section-heading">Welcome to RunAdvisor</h1>
            <p className="section-subtitle">Your personal AI-powered running coach for race prep, pace planning, and recovery management.</p>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-6 text-slate-300">
            <p className="font-semibold text-slate-100">Race-ready UX</p>
            <p className="mt-3 text-sm leading-6">Sync Strava, add race targets, and get an action plan for every run.</p>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="section-card">
          <p>Loading your weekly stats...</p>
        </section>
      ) : summary ? (
        <section className="grid gap-6 lg:grid-cols-3">
          <StatsCard title="Total Distance" value={`${summary.totalDistance.toFixed(1)} km`} icon="📏" />
          <StatsCard title="Total Time" value={`${(summary.totalDuration / 60).toFixed(1)} hrs`} icon="⏱️" />
          <StatsCard title="Activities" value={summary.activityCount} icon="🏃" />
          <StatsCard title="Avg Pace" value={`${summary.avgPace.toFixed(1)} min/km`} icon="⚡" />
          <StatsCard title="Elevation Gain" value={`${summary.totalElevation.toFixed(0)} m`} icon="⛰️" />
          <StatsCard title="Avg HR" value={`${summary.avgHeartRate.toFixed(0)} bpm`} icon="❤️" />
        </section>
      ) : (
        <section className="section-card">
          <p>No activities this week. Start by adding activities or connecting Strava!</p>
        </section>
      )}

      <section className="mt-8 section-card">
        <h2 className="text-2xl font-semibold text-white">Quick actions</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <a href="/strava-connect" className="btn-secondary">Connect Strava</a>
          <a href="/activities" className="btn-secondary">Log Activity</a>
          <a href="/recommendations" className="btn-secondary">Race Plan</a>
          <a href="/recommendations" className="btn-secondary">Find Similar Runs</a>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
