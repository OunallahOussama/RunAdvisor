import React, { useState, useEffect } from 'react';
import { recommendationsApi } from '../services/api';

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [raceName, setRaceName] = useState('');
  const [raceDistance, setRaceDistance] = useState('10');
  const [raceDate, setRaceDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, [days]);

  const raceDays = raceDate ? Math.max(0, Math.ceil((new Date(raceDate) - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  const fetchRecommendations = async (options = {}) => {
    try {
      setLoading(true);
      const response = await recommendationsApi.getRecommendations({
        days,
        raceName: options.raceName ?? raceName,
        raceDistance: options.raceDistance ?? parseFloat(raceDistance),
        raceDate: options.raceDate ?? raceDate
      });
      setRecommendations(response.data.recommendations || []);
      setMessage(response.data.message || 'Your recommendations are ready.');
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setMessage('Unable to load recommendations right now.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationFeedback = async (id, status) => {
    if (!id) {
      console.error('Recommendation ID is missing for feedback update');
      return;
    }

    try {
      await recommendationsApi.updateRecommendation(id, status, '');
      fetchRecommendations();
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  const handleRaceSubmit = async (event) => {
    event.preventDefault();
    fetchRecommendations({
      raceName,
      raceDistance: parseFloat(raceDistance),
      raceDate
    });
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <section className="section-card mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="section-heading">Run-ready Recommendations</h1>
            <p className="section-subtitle">Race-driven training guidance with pace, taper, and recovery advice for every run.</p>
          </div>
          <div className="text-slate-300 text-sm">
            <p className="font-semibold text-slate-100">Tip</p>
            <p>Load your next race and let the app shape your run schedule around it.</p>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="section-card">
          <h2 className="text-2xl font-semibold text-white">Next race details</h2>
          <form onSubmit={handleRaceSubmit} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Next race name</span>
              <input
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="City Marathon, 10k, Trail Race"
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Race distance (km)</span>
              <input
                type="number"
                min="1"
                value={raceDistance}
                onChange={(e) => setRaceDistance(e.target.value)}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Race date</span>
              <input
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                className="rounded-3xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-orange-400"
              />
            </label>
            <button type="submit" className="btn-primary w-full">
              Refresh recommendations
            </button>
          </form>
        </div>

        <div className="section-card sticky top-6">
          <h3 className="text-xl font-semibold text-white">Race preparation sprint</h3>
          <p className="mt-3 text-slate-300">A tailored run plan helps you peak on the right day and avoid overtraining.</p>
          <div className="mt-6 grid gap-3">
            <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="text-slate-400">Race distance</p>
              <p className="mt-2 text-2xl font-semibold text-white">{raceDistance} km</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="text-slate-400">Race date</p>
              <p className="mt-2 text-2xl font-semibold text-white">{raceDate}</p>
            </div>
            <div className="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <p className="text-slate-400">Days until race</p>
              <p className="mt-2 text-2xl font-semibold text-white">{raceDays ?? 'TBA'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="rounded-3xl border border-slate-700 bg-slate-900/95 p-6 shadow-xl shadow-black/20">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Status</p>
          <p className="mt-3 text-lg text-slate-200">{message}</p>
        </div>

        {loading ? (
          <div className="section-card">
            <p>Generating recommendations...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="section-card">
            <p>No recommendations available yet. Add more activities to get personalized recommendations.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {recommendations.map((rec, index) => {
              const recommendationId = rec._id || rec.id;

              return (
                <div key={recommendationId || index} className="rounded-3xl border border-slate-700 bg-slate-900/95 p-6 shadow-xl shadow-black/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{rec.title}</h3>
                      <p className="mt-2 text-slate-300">{rec.description}</p>
                    </div>
                    <span className="badge bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">{rec.type}</span>
                  </div>

                  {rec.reasoning && <p className="mt-4 text-slate-300">💡 {rec.reasoning}</p>}

                  <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-200">
                    {rec.recommendedDistance && <span className="detail-badge">Distance: {rec.recommendedDistance.toFixed(1)} km</span>}
                    {rec.recommendedPace && <span className="detail-badge">Pace: {rec.recommendedPace.toFixed(1)} min/km</span>}
                    {rec.recommendedDuration && <span className="detail-badge">Duration: {rec.recommendedDuration} mins</span>}
                  </div>

                  {recommendationId ? (
                    <div className="button-row mt-6">
                      <button
                        onClick={() => handleRecommendationFeedback(recommendationId, 'accepted')}
                        className="btn-primary"
                        type="button"
                      >
                        ✓ Accept
                      </button>
                      <button
                        onClick={() => handleRecommendationFeedback(recommendationId, 'rejected')}
                        className="rounded-full bg-slate-700 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-600"
                        type="button"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 text-slate-400">Recommendation ID unavailable.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default Recommendations;
