import React, { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TrainingTrendChart from '../components/TrainingTrendChart';
import TrainingMetricsCharts from '../components/TrainingMetricsCharts';
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

function getReadinessChipColor(readiness = '') {
  const normalized = readiness.toLowerCase();

  if (normalized.includes('ready') || normalized.includes('strong')) {
    return 'success';
  }

  if (normalized.includes('caution') || normalized.includes('watch')) {
    return 'warning';
  }

  return undefined;
}

function MetricStat({ icon: Icon, label, value, emphasize }) {
  return (
    <Card variant="outlined" sx={{ bgcolor: emphasize ? 'action.hover' : 'background.paper' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText'
            }}
          >
            <Icon size={18} />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function InsightPanel({ title, items, empty, icon: Icon }) {
  const list = Array.isArray(items) ? items : [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Icon size={18} />
        <Typography fontWeight={600}>{title}</Typography>
      </Stack>
      <List dense disablePadding>
        {list.length === 0 ? (
          <ListItem disableGutters>
            <ListItemText primary={empty} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} />
          </ListItem>
        ) : (
          list.map((item) => (
            <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                <Icon size={16} />
              </ListItemIcon>
              <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          ))
        )}
      </List>
    </Paper>
  );
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
  const [racePacePrediction, setRacePacePrediction] = useState(null);
  const [lastWeekSummary, setLastWeekSummary] = useState(null);
  const [dailyMetrics, setDailyMetrics] = useState([]);
  const [weeklyRacePaceProjection, setWeeklyRacePaceProjection] = useState([]);

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
        setRacePacePrediction(coachReviewData.racePacePrediction || null);
        setLastWeekSummary(coachReviewData.lastWeekSummary || null);
        setDailyMetrics(coachReviewData.dailyMetrics || []);
        setWeeklyRacePaceProjection(coachReviewData.weeklyRacePaceProjection || []);
        setReviewMessage(coachReviewData.message || 'Coach review ready.');
      } else {
        console.error('Error fetching coach review:', coachReviewResult.reason);
        setCoachReview(null);
        setSummary(null);
        setTrend([]);
        setRacePacePrediction(null);
        setLastWeekSummary(null);
        setDailyMetrics([]);
        setWeeklyRacePaceProjection([]);
        setReviewMessage('Unable to load your coach review right now.');
      }

      if (recommendationData || coachReviewData) {
        saveSnapshot(RECOMMENDATIONS_CACHE_KEY, {
          coachReview: coachReviewData?.coachReview || null,
          dailyMetrics: coachReviewData?.dailyMetrics || [],
          lastWeekSummary: coachReviewData?.lastWeekSummary || null,
          message: recommendationData?.message || 'Your recommendations are ready.',
          racePacePrediction: coachReviewData?.racePacePrediction || null,
          recommendations: recommendationData?.recommendations || [],
          request,
          reviewMessage: coachReviewData?.message || 'Coach review ready.',
          summary: coachReviewData?.summary || null,
          trend: coachReviewData?.trend || [],
          weeklyRacePaceProjection: coachReviewData?.weeklyRacePaceProjection || []
        });
        setOfflineMessage('');
      } else {
        const cachedInsights = loadSnapshot(RECOMMENDATIONS_CACHE_KEY);

        if (cachedInsights?.data) {
          setRecommendations(cachedInsights.data.recommendations || []);
          setCoachReview(cachedInsights.data.coachReview || null);
          setSummary(cachedInsights.data.summary || null);
          setTrend(cachedInsights.data.trend || []);
          setRacePacePrediction(cachedInsights.data.racePacePrediction || null);
          setLastWeekSummary(cachedInsights.data.lastWeekSummary || null);
          setDailyMetrics(cachedInsights.data.dailyMetrics || []);
          setWeeklyRacePaceProjection(cachedInsights.data.weeklyRacePaceProjection || []);
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
    <Box component="main">
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ sm: 'flex-start' }}>
            <Box>
              <Typography variant="overline" color="primary" fontWeight={700}>
                Coach workspace
              </Typography>
              <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
                Coach Review & Recommendations
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 640 }}>
                A recent-training review that turns your Strava sync and manual logs into trend-aware coaching guidance.
              </Typography>
            </Box>
            <TextField
              label="Review window"
              onChange={(event) => setDays(parseInt(event.target.value, 10))}
              select
              sx={{ minWidth: 180 }}
              value={days}
            >
              <MenuItem value={14}>Last 14 days</MenuItem>
              <MenuItem value={28}>Last 28 days</MenuItem>
              <MenuItem value={42}>Last 42 days</MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      {offlineMessage && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info">{offlineMessage}</Alert>
        </Box>
      )}

      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} sx={{ mb: 3 }} alignItems="stretch">
        <Card variant="outlined" sx={{ flex: 1 }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText'
                }}
              >
                <TargetIcon size={18} />
              </Box>
              <Typography variant="h5" fontWeight={600}>
                Next race details
              </Typography>
            </Stack>
            <Box component="form" onSubmit={handleRaceSubmit}>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Next race name"
                  onChange={(e) => setRaceName(e.target.value)}
                  placeholder="City Marathon, 10K, Trail Race"
                  value={raceName}
                />
                <TextField
                  fullWidth
                  label="Race distance (km)"
                  inputProps={{ min: 1 }}
                  onChange={(e) => setRaceDistance(e.target.value)}
                  type="number"
                  value={raceDistance}
                />
                <TextField
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  label="Race date"
                  onChange={(e) => setRaceDate(e.target.value)}
                  type="date"
                  value={raceDate}
                />
                <Button startIcon={<TrendIcon size={16} />} type="submit" variant="contained">
                  Refresh coach review
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ width: { xl: 320 }, flexShrink: 0, position: { xl: 'sticky' }, top: { xl: 16 } }}>
          <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.selected'
                }}
              >
                <CalendarIcon size={18} />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Race readiness
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" paragraph>
              Use the same race inputs for both the coach review and the action plan below.
            </Typography>
            <Stack spacing={2}>
              <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Race distance
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                    {raceDistance} km
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Days until race
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                    {raceDays ?? 'TBA'}
                  </Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    Coach mode
                  </Typography>
                  <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                    {coachReview ? capitalizeLabel(coachReview.readiness) : 'Pending'}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="overline" color="primary" fontWeight={700}>
              Recommendations status
            </Typography>
            <Typography variant="h6" sx={{ mt: 1 }}>
              {message}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {reviewMessage}
            </Typography>
          </CardContent>
        </Card>

        {loading ? (
          <Card variant="outlined">
            <CardContent>
              <Typography color="text.secondary">Generating coach review...</Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            {summary ? (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }
                  }}
                >
                  <MetricStat icon={DistanceIcon} label="Total distance" value={`${summary.totalDistanceKm.toFixed(1)} km`} emphasize />
                  <MetricStat icon={ActivityIcon} label="Active days" value={summary.activeDays} />
                  <MetricStat icon={PaceIcon} label="Average pace" value={formatPace(summary.avgPace)} emphasize />
                  <MetricStat icon={BoltIcon} label="Longest run" value={`${summary.longestRunKm.toFixed(1)} km`} />
                </Box>

                <Stack spacing={2} sx={{ mt: 2 }}>
                  {lastWeekSummary && lastWeekSummary.activityCount > 0 && (
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="overline" color="text.secondary">
                          Last 7 days (runs)
                        </Typography>
                        <Box
                          sx={{
                            display: 'grid',
                            gap: 2,
                            mt: 1,
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }
                          }}
                        >
                          <MetricStat icon={DistanceIcon} label="Distance" value={`${Number(lastWeekSummary.totalDistanceKm).toFixed(1)} km`} />
                          <MetricStat icon={ActivityIcon} label="Runs" value={lastWeekSummary.activityCount} />
                          <MetricStat icon={PaceIcon} label="Avg pace" value={formatPace(lastWeekSummary.avgPace)} />
                          <MetricStat icon={BoltIcon} label="Longest" value={`${Number(lastWeekSummary.longestRunKm).toFixed(1)} km`} />
                        </Box>
                      </CardContent>
                    </Card>
                  )}

                  {racePacePrediction && (
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'flex-start' }}>
                          <Box>
                            <Typography variant="overline" color="text.secondary">
                              Race pace outlook
                            </Typography>
                            {racePacePrediction.predictedPaceMinPerKm ? (
                              <>
                                <Typography variant="h4" fontWeight={600} sx={{ mt: 0.5 }}>
                                  ~{formatPace(racePacePrediction.predictedPaceMinPerKm)}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                  Finish about {racePacePrediction.predictedFinishTimeLabel || '—'} at{' '}
                                  {racePacePrediction.raceDistanceKm} km, based on the past week of training.
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="body1" sx={{ mt: 1 }}>
                                {racePacePrediction.explanation || 'Set a race distance to see a pace outlook.'}
                              </Typography>
                            )}
                          </Box>
                          {racePacePrediction.predictedPaceMinPerKm && racePacePrediction.confidence && (
                            <Chip label={capitalizeLabel(racePacePrediction.confidence)} size="small" variant="outlined" />
                          )}
                        </Stack>
                        {racePacePrediction.predictedPaceMinPerKm && racePacePrediction.explanation && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            {racePacePrediction.explanation}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <TrainingMetricsCharts
                    dailyMetrics={dailyMetrics}
                    trend={trend}
                    weeklyRacePaceProjection={weeklyRacePaceProjection}
                  />
                </Stack>
              </>
            ) : (
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary">
                    No recent activities are available for coach review yet. Sync Strava or add manual logs first.
                  </Typography>
                </CardContent>
              </Card>
            )}

            {(coachReview || trend.length > 0) && (
              <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} alignItems="stretch">
                <Card variant="outlined" sx={{ flex: 1 }}>
                  <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'flex-start' }}>
                      <Box>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 2,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText'
                            }}
                          >
                            <CoachIcon size={18} />
                          </Box>
                          <Typography variant="h5" fontWeight={600}>
                            Coach review
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          {coachReview?.headline || 'Recent training review unavailable.'}
                        </Typography>
                      </Box>
                      {coachReview && (
                        <Chip
                          {...(getReadinessChipColor(coachReview.readiness)
                            ? { color: getReadinessChipColor(coachReview.readiness) }
                            : {})}
                          label={capitalizeLabel(coachReview.readiness)}
                          size="small"
                        />
                      )}
                    </Stack>

                    <Stack spacing={2} sx={{ mt: 3 }}>
                      <InsightPanel
                        icon={CheckIcon}
                        items={coachReview?.positives}
                        title="What is going well"
                        empty="More data is needed before the coach can call out strong positives."
                      />
                      <InsightPanel
                        icon={WarningIcon}
                        items={coachReview?.risks}
                        title="Watchouts"
                        empty="Nothing major stands out right now."
                      />
                      <InsightPanel
                        icon={TargetIcon}
                        items={coachReview?.nextFocus}
                        title="Next focus"
                        empty="No next-step focus has been generated yet."
                      />
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ flex: 1 }}>
                  <CardContent>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                      <Box>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              borderRadius: 2,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText'
                            }}
                          >
                            <TrendIcon size={18} />
                          </Box>
                          <Typography variant="h5" fontWeight={600}>
                            Recent training trends
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          Distance and pace over the past several weeks.
                        </Typography>
                      </Box>
                      {summary && summary.weeklyDistanceDeltaPct != null && (
                        <Chip
                          icon={<DistanceIcon size={14} />}
                          label={`Weekly distance change: ${summary.weeklyDistanceDeltaPct}%`}
                          variant="outlined"
                        />
                      )}
                    </Stack>

                    {trend.length > 0 ? (
                      <Box sx={{ mt: 3, height: 288 }}>
                        <TrainingTrendChart trend={trend} />
                      </Box>
                    ) : (
                      <Typography color="text.secondary" sx={{ mt: 3 }}>
                        No trend data available yet.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            )}

            {recommendations.length === 0 ? (
              <Card variant="outlined">
                <CardContent>
                  <Typography color="text.secondary">
                    No recommendations available yet. Add more activities to get personalized recommendations.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Stack spacing={2}>
                {recommendations.map((rec, index) => {
                  const recommendationId = rec._id || rec.id;
                  const RecommendationIcon = getRecommendationIcon(rec);

                  return (
                    <Card key={recommendationId || index} variant="outlined">
                      <CardContent>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ sm: 'flex-start' }}>
                          <Stack direction="row" spacing={1.5} alignItems="flex-start">
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: 2,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                flexShrink: 0
                              }}
                            >
                              <RecommendationIcon size={18} />
                            </Box>
                            <Box>
                              <Typography variant="h6">{rec.title}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                {rec.description}
                              </Typography>
                            </Box>
                          </Stack>
                          <Stack direction="row" flexWrap="wrap" gap={1}>
                            {rec.type && <Chip label={rec.type} size="small" variant="outlined" />}
                            {rec.priority && <Chip color="primary" label={`Priority: ${rec.priority}`} size="small" />}
                            {rec.confidence && <Chip label={`Confidence: ${rec.confidence}`} size="small" variant="outlined" />}
                          </Stack>
                        </Stack>

                        {rec.reasoning && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            Coach note: {rec.reasoning}
                          </Typography>
                        )}
                        {rec.whyNow && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                            Why now: {rec.whyNow}
                          </Typography>
                        )}

                        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
                          {rec.focusArea && (
                            <Chip icon={<CoachIcon size={14} />} label={`Focus: ${capitalizeLabel(rec.focusArea)}`} size="small" variant="outlined" />
                          )}
                          {rec.timeHorizon && (
                            <Chip icon={<CalendarIcon size={14} />} label={`Window: ${rec.timeHorizon}`} size="small" variant="outlined" />
                          )}
                          {rec.recommendedType && (
                            <Chip icon={<ActivityIcon size={14} />} label={`Session: ${rec.recommendedType}`} size="small" variant="outlined" />
                          )}
                          {rec.recommendedDistance && (
                            <Chip icon={<DistanceIcon size={14} />} label={`Distance: ${formatDistance(rec.recommendedDistance)}`} size="small" variant="outlined" />
                          )}
                          {rec.recommendedPace && (
                            <Chip icon={<PaceIcon size={14} />} label={`Pace: ${formatPace(rec.recommendedPace)}`} size="small" variant="outlined" />
                          )}
                          {rec.recommendedDuration && (
                            <Chip icon={<ClockIcon size={14} />} label={`Duration: ${formatDuration(rec.recommendedDuration)}`} size="small" variant="outlined" />
                          )}
                        </Stack>

                        {(rec.actionItems || []).length > 0 && (
                          <Paper variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'action.hover' }}>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                              <CheckIcon size={16} />
                              <Typography fontWeight={600}>Action steps</Typography>
                            </Stack>
                            <List dense disablePadding>
                              {rec.actionItems.map((item) => (
                                <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start' }}>
                                  <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                                    <CheckIcon size={16} />
                                  </ListItemIcon>
                                  <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                              ))}
                            </List>
                          </Paper>
                        )}

                        {rec.watchOut && (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            Watch out: {rec.watchOut}
                          </Alert>
                        )}

                        {recommendationId ? (
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                            <Button
                              startIcon={<CheckIcon size={16} />}
                              variant="contained"
                              onClick={() => handleRecommendationFeedback(recommendationId, 'accepted')}
                            >
                              Accept
                            </Button>
                            <Button
                              color="inherit"
                              startIcon={<WarningIcon size={16} />}
                              variant="outlined"
                              onClick={() => handleRecommendationFeedback(recommendationId, 'rejected')}
                            >
                              Reject
                            </Button>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }} display="block">
                            Recommendation ID unavailable.
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}

export default Recommendations;
