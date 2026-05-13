import React, { useCallback, useEffect, useState } from 'react';
import TrainingTrendChart from '../components/TrainingTrendChart';
import {
  ActivityIcon,
  BoltIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CoachIcon,
  DistanceIcon,
  PaceIcon,
  RecoveryIcon,
  TargetIcon,
  TrendIcon,
  WarningIcon
} from '../components/icons';
import { recommendationsApi } from '../services/api';
import { formatSnapshotTimestamp, loadSnapshot, saveSnapshot } from '../utils/offlineCache';

const RECOMMENDATIONS_CACHE_KEY = 'recommendations-insights';

function formatPace(value) {
  return value ? `${value.toFixed(1)} min/km` : 'N/A';
}

function formatDistance(value) {
  return value ? `${value.toFixed(1)} km` : 'N/A';
}

function formatDuration(value) {
  return value ? `${value} mins` : 'N/A';
}

function capitalizeLabel(value = '') {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getRecommendationIcon(rec) {
  const combinedValue = `${rec.type || ''} ${rec.focusArea || ''} ${rec.recommendedType || ''}`.toLowerCase();

  if (combinedValue.includes('recovery') || combinedValue.includes('rest')) {
    return RecoveryIcon;
  }

  if (combinedValue.includes('pace')) {
    return PaceIcon;
  }

  if (combinedValue.includes('distance') || combinedValue.includes('long') || combinedValue.includes('trail')) {
    return DistanceIcon;
  }

  if (combinedValue.includes('race') || combinedValue.includes('target')) {
    return TargetIcon;
  }

  return CoachIcon;
}

function getReadinessTone(readiness = '') {
  const normalized = readiness.toLowerCase();

  if (normalized.includes('ready') || normalized.includes('strong')) {
    return 'status-pill-success';
  }

  if (normalized.includes('caution') || normalized.includes('watch')) {
    return 'status-pill-warning';
  }

  return '';
}

function Recommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [coachReview, setCoachReview] = useState(null);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(28);
  const [raceName, setRaceName] = useState('');
  const [raceDistance, setRaceDistance] = useState('10');
  const [raceDate, setRaceDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [offlineMessage, setOfflineMessage] = useState('');

  const raceDays = raceDate ? Math.max(0, Math.ceil((new Date(raceDate) - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  const loadInsights = useCallback(async (overrides = {}) => {
    const request = {
      days: overrides.days ?? days,
      raceName: overrides.raceName ?? raceName,
      raceDistance: overrides.raceDistance ?? parseFloat(raceDistance),
      raceDate: overrides.raceDate ?? raceDate
    };

    try {
      setLoading(true);
      const [recommendationsResult, coachReviewResult] = await Promise.allSettled([
        recommendationsApi.getRecommendations(request),
        recommendationsApi.getCoachReview(request)
      ]);

      const recommendationData = recommendationsResult.status === 'fulfilled'
        ? recommendationsResult.value?.data || {}
        : null;
      const coachReviewData = coachReviewResult.status === 'fulfilled'
        ? coachReviewResult.value?.data || {}
        : null;

      if (recommendationData) {
        setRecommendations(recommendationData.recommendations || []);
        setMessage(recommendationData.message || 'Your recommendations are ready.');
      } else {
        console.error('Error fetching recommendations:', recommendationsResult.reason);
        setRecommendations([]);
        setMessage('Unable to load recommendations right now.');
      }

      if (coachReviewData) {
        setCoachReview(coachReviewData.coachReview || null);
        setSummary(coachReviewData.summary || null);
        setTrend(coachReviewData.trend || []);
        setReviewMessage(coachReviewData.message || 'Coach review ready.');
      } else {
        console.error('Error fetching coach review:', coachReviewResult.reason);
        setCoachReview(null);
        setSummary(null);
        setTrend([]);
        setReviewMessage('Unable to load your coach review right now.');
      }

      if (recommendationData || coachReviewData) {
        saveSnapshot(RECOMMENDATIONS_CACHE_KEY, {
          coachReview: coachReviewData?.coachReview || null,
          message: recommendationData?.message || 'Your recommendations are ready.',
          recommendations: recommendationData?.recommendations || [],
          request,
          reviewMessage: coachReviewData?.message || 'Coach review ready.',
          summary: coachReviewData?.summary || null,
          trend: coachReviewData?.trend || []
        });
        setOfflineMessage('');
      } else {
        const cachedInsights = loadSnapshot(RECOMMENDATIONS_CACHE_KEY);

        if (cachedInsights?.data) {
          setRecommendations(cachedInsights.data.recommendations || []);
          setCoachReview(cachedInsights.data.coachReview || null);
          setSummary(cachedInsights.data.summary || null);
          setTrend(cachedInsights.data.trend || []);
          setMessage(cachedInsights.data.message || 'Showing your last saved recommendations.');
          setReviewMessage(cachedInsights.data.reviewMessage || 'Showing your last saved coach review.');
          setOfflineMessage(`Using your saved coach review from ${formatSnapshotTimestamp(cachedInsights.savedAt)}.`);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [days, raceDate, raceDistance, raceName]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const handleRecommendationFeedback = async (id, status) => {
    if (!id) {
      console.error('Recommendation ID is missing for feedback update');
      return;
    }

    try {
      await recommendationsApi.updateRecommendation(id, status, '');
      loadInsights();
    } catch (error) {
      console.error('Error updating recommendation:', error);
    }
  };

  const handleRaceSubmit = async (event) => {
    event.preventDefault();
    loadInsights({
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
            <p className="eyebrow">Coach workspace</p>
            <h1 className="section-heading">Coach Review & Recommendations</h1>
            <p className="section-subtitle">A recent-training review that turns your Strava sync and manual logs into trend-aware coaching guidance.</p>
          </div>
          <div className="metric-panel max-w-xs">
            <p className="metric-title">Review window</p>
            <select
              value={days}
              onChange={(event) => setDays(parseInt(event.target.value, 10))}
              className="select-shell mt-3"
            >
              <option value={14}>Last 14 days</option>
              <option value={28}>Last 28 days</option>
              <option value={42}>Last 42 days</option>
            </select>
          </div>
        </div>
      </section>

      {offlineMessage && (
        <section className="mb-8">
          <div className="page-banner">{offlineMessage}</div>
        </section>
      )}

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="section-card">
          <div className="flex items-center gap-3">
            <span className="icon-shell">
              <TargetIcon size={18} />
            </span>
            <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Next race details</h2>
          </div>
          <form onSubmit={handleRaceSubmit} className="mt-5 grid gap-4">
            <label className="field-label">
              <span>Next race name</span>
              <input
                value={raceName}
                onChange={(e) => setRaceName(e.target.value)}
                placeholder="City Marathon, 10K, Trail Race"
                className="input-shell"
              />
            </label>
            <label className="field-label">
              <span>Race distance (km)</span>
              <input
                type="number"
                min="1"
                value={raceDistance}
                onChange={(e) => setRaceDistance(e.target.value)}
                className="input-shell"
              />
            </label>
            <label className="field-label">
              <span>Race date</span>
              <input
                type="date"
                value={raceDate}
                onChange={(e) => setRaceDate(e.target.value)}
                className="input-shell"
              />
            </label>
            <button type="submit" className="btn-primary w-full">
              <TrendIcon size={16} />
              Refresh coach review
            </button>
          </form>
        </div>

        <div className="section-card sticky top-6">
          <div className="flex items-center gap-3">
            <span className="icon-shell icon-shell-soft">
              <CalendarIcon size={18} />
            </span>
            <h3 className="m-0 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Race readiness</h3>
          </div>
          <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Use the same race inputs for both the coach review and the action plan below.</p>
          <div className="mt-6 grid gap-3">
            <div className="metric-panel">
              <p className="metric-title">Race distance</p>
              <p className="metric-emphasis">{raceDistance} km</p>
            </div>
            <div className="metric-panel">
              <p className="metric-title">Days until race</p>
              <p className="metric-emphasis">{raceDays ?? 'TBA'}</p>
            </div>
            <div className="metric-panel">
              <p className="metric-title">Coach mode</p>
              <p className="metric-emphasis">{coachReview ? capitalizeLabel(coachReview.readiness) : 'Pending'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6">
        <div className="section-card">
          <p className="eyebrow">Recommendations status</p>
          <p className="m-0 text-lg" style={{ color: 'var(--text-primary)' }}>{message}</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>{reviewMessage}</p>
        </div>

        {loading ? (
          <div className="section-card">
            <p className="empty-state">Generating coach review...</p>
          </div>
        ) : (
          <>
            {summary ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="stats-card">
                  <div className="stats-card-header">
                    <div>
                      <p className="stats-label">Total distance</p>
                      <p className="stats-value">{summary.totalDistanceKm.toFixed(1)} km</p>
                    </div>
                    <span className="icon-shell"><DistanceIcon size={18} /></span>
                  </div>
                </div>
                <div className="stats-card">
                  <div className="stats-card-header">
                    <div>
                      <p className="stats-label">Active days</p>
                      <p className="stats-value">{summary.activeDays}</p>
                    </div>
                    <span className="icon-shell icon-shell-soft"><ActivityIcon size={18} /></span>
                  </div>
                </div>
                <div className="stats-card">
                  <div className="stats-card-header">
                    <div>
                      <p className="stats-label">Average pace</p>
                      <p className="stats-value">{formatPace(summary.avgPace)}</p>
                    </div>
                    <span className="icon-shell"><PaceIcon size={18} /></span>
                  </div>
                </div>
                <div className="stats-card">
                  <div className="stats-card-header">
                    <div>
                      <p className="stats-label">Longest run</p>
                      <p className="stats-value">{summary.longestRunKm.toFixed(1)} km</p>
                    </div>
                    <span className="icon-shell icon-shell-soft"><BoltIcon size={18} /></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="section-card">
                <p className="empty-state">No recent activities are available for coach review yet. Sync Strava or add manual logs first.</p>
              </div>
            )}

            {(coachReview || trend.length > 0) && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="section-card">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="icon-shell">
                          <CoachIcon size={18} />
                        </span>
                        <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Coach review</h2>
                      </div>
                      <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>{coachReview?.headline || 'Recent training review unavailable.'}</p>
                    </div>
                    {coachReview && (
                      <span className={`status-pill ${getReadinessTone(coachReview.readiness)}`.trim()}>
                        {capitalizeLabel(coachReview.readiness)}
                      </span>
                    )}
                  </div>

                  <div className="mt-6 grid gap-4">
                    <div className="note-box">
                      <div className="flex items-center gap-3">
                        <span className="icon-shell icon-shell-success">
                          <CheckIcon size={16} />
                        </span>
                        <p className="m-0 font-semibold" style={{ color: 'var(--text-primary)' }}>What is going well</p>
                      </div>
                      <ul className="coach-list mt-4">
                        {(coachReview?.positives || []).length === 0 ? (
                          <li className="coach-list-item">More data is needed before the coach can call out strong positives.</li>
                        ) : (
                          coachReview.positives.map((item) => (
                            <li key={item} className="coach-list-item">
                              <CheckIcon size={16} />
                              <span>{item}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="note-box">
                      <div className="flex items-center gap-3">
                        <span className="icon-shell icon-shell-warning">
                          <WarningIcon size={16} />
                        </span>
                        <p className="m-0 font-semibold" style={{ color: 'var(--text-primary)' }}>Watchouts</p>
                      </div>
                      <ul className="coach-list mt-4">
                        {(coachReview?.risks || []).length === 0 ? (
                          <li className="coach-list-item">Nothing major stands out right now.</li>
                        ) : (
                          coachReview.risks.map((item) => (
                            <li key={item} className="coach-list-item">
                              <WarningIcon size={16} />
                              <span>{item}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>

                    <div className="note-box">
                      <div className="flex items-center gap-3">
                        <span className="icon-shell icon-shell-soft">
                          <TargetIcon size={16} />
                        </span>
                        <p className="m-0 font-semibold" style={{ color: 'var(--text-primary)' }}>Next focus</p>
                      </div>
                      <ul className="coach-list mt-4">
                        {(coachReview?.nextFocus || []).length === 0 ? (
                          <li className="coach-list-item">No next-step focus has been generated yet.</li>
                        ) : (
                          coachReview.nextFocus.map((item) => (
                            <li key={item} className="coach-list-item">
                              <TargetIcon size={16} />
                              <span>{item}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="section-card">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="icon-shell">
                          <TrendIcon size={18} />
                        </span>
                        <h2 className="m-0 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Recent training trends</h2>
                      </div>
                      <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>Distance and pace over the past several weeks.</p>
                    </div>
                    {summary && summary.weeklyDistanceDeltaPct != null && (
                      <div className="detail-badge">
                        <DistanceIcon size={14} />
                        Weekly distance change: <span style={{ color: 'var(--text-primary)' }}>{summary.weeklyDistanceDeltaPct}%</span>
                      </div>
                    )}
                  </div>

                  {trend.length > 0 ? (
                    <div className="mt-6">
                      <TrainingTrendChart trend={trend} />
                    </div>
                  ) : (
                    <p className="mt-6 empty-state">No trend data available yet.</p>
                  )}
                </div>
              </div>
            )}

            {recommendations.length === 0 ? (
              <div className="section-card">
                <p className="empty-state">No recommendations available yet. Add more activities to get personalized recommendations.</p>
              </div>
            ) : (
              <div className="grid gap-5">
                {recommendations.map((rec, index) => {
                  const recommendationId = rec._id || rec.id;
                  const RecommendationIcon = getRecommendationIcon(rec);

                  return (
                    <div key={recommendationId || index} className="section-card">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <span className="icon-shell">
                            <RecommendationIcon size={18} />
                          </span>
                          <div>
                            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{rec.title}</h3>
                            <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>{rec.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="detail-badge">{rec.type}</span>
                          {rec.priority && <span className="detail-badge detail-badge-accent">Priority: {rec.priority}</span>}
                          {rec.confidence && <span className="detail-badge">Confidence: {rec.confidence}</span>}
                        </div>
                      </div>

                      {rec.reasoning && <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Coach note: {rec.reasoning}</p>}
                      {rec.whyNow && <p className="mt-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>Why now: {rec.whyNow}</p>}

                      <div className="mt-5 flex flex-wrap gap-3 text-sm">
                        {rec.focusArea && <span className="detail-badge"><CoachIcon size={14} /> Focus: {capitalizeLabel(rec.focusArea)}</span>}
                        {rec.timeHorizon && <span className="detail-badge"><CalendarIcon size={14} /> Window: {rec.timeHorizon}</span>}
                        {rec.recommendedType && <span className="detail-badge"><ActivityIcon size={14} /> Session: {rec.recommendedType}</span>}
                        {rec.recommendedDistance && <span className="detail-badge"><DistanceIcon size={14} /> Distance: {formatDistance(rec.recommendedDistance)}</span>}
                        {rec.recommendedPace && <span className="detail-badge"><PaceIcon size={14} /> Pace: {formatPace(rec.recommendedPace)}</span>}
                        {rec.recommendedDuration && <span className="detail-badge"><ClockIcon size={14} /> Duration: {formatDuration(rec.recommendedDuration)}</span>}
                      </div>

                      {(rec.actionItems || []).length > 0 && (
                        <div className="mt-5 note-box">
                          <div className="flex items-center gap-3">
                            <span className="icon-shell icon-shell-success">
                              <CheckIcon size={16} />
                            </span>
                            <p className="m-0 font-semibold" style={{ color: 'var(--text-primary)' }}>Action steps</p>
                          </div>
                          <ul className="coach-list mt-4">
                            {rec.actionItems.map((item) => (
                              <li key={item} className="coach-list-item">
                                <CheckIcon size={16} />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rec.watchOut && (
                        <div className="mt-4 page-banner page-banner-warning">
                          <div className="flex items-start gap-3">
                            <WarningIcon size={16} />
                            <span>Watch out: {rec.watchOut}</span>
                          </div>
                        </div>
                      )}

                      {recommendationId ? (
                        <div className="button-row mt-6">
                          <button
                            onClick={() => handleRecommendationFeedback(recommendationId, 'accepted')}
                            className="btn-primary"
                            type="button"
                          >
                            <CheckIcon size={16} />
                            Accept
                          </button>
                          <button
                            onClick={() => handleRecommendationFeedback(recommendationId, 'rejected')}
                            className="btn-secondary"
                            type="button"
                          >
                            <WarningIcon size={16} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>Recommendation ID unavailable.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default Recommendations;
