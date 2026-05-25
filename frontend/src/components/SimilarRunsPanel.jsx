import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { activitiesApi } from '../services/api';
import { formatNumber, formatPaceLabel, formatPercent } from '../utils/format';
import { TrendIcon } from './icons';

function SimilarityRow({ label, name, date, similarity, to }) {
  const dateLabel = date ? new Date(date).toLocaleDateString() : '';

  return (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        display: 'block',
        p: 1.5,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'action.hover',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': { borderColor: 'primary.main' }
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
            {dateLabel ? ` · ${dateLabel}` : ''}
          </Typography>
        </Box>
        <Chip color="primary" label={formatPercent(similarity * 100)} size="small" variant="outlined" />
      </Stack>
    </Box>
  );
}

function SimilarRunsPanel({ activityId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!activityId) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await activitiesApi.getSimilarActivities(activityId);
        if (!cancelled) {
          setData(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Could not load similar runs.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  if (loading) {
    return (
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={22} />
          <Typography variant="body2" color="text.secondary">
            Finding similar runs…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const hasSimilar = data?.similarActivities?.length > 0 || data?.segmentMatches?.length > 0;

  if (!hasSimilar) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Log or sync a few more runs to compare pacing, terrain, and volume patterns.
      </Alert>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TrendIcon size={20} />
          <Typography variant="h6" fontWeight={600}>
            Similar runs
          </Typography>
        </Stack>

        {data.insight?.summary && (
          <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
            {data.insight.highlights?.length > 0 && (
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                {data.insight.highlights.map((tag) => (
                  <Chip key={tag} label={tag} size="small" color="primary" variant="outlined" />
                ))}
              </Stack>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              {data.insight.summary}
            </Typography>
          </Box>
        )}

        {data.similarActivities?.length > 0 && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Whole-run match (90-day window)
            </Typography>
            {data.similarActivities.map((run) => (
              <SimilarityRow
                key={run.activityId}
                date={run.date}
                label={`${formatNumber(run.distanceKm)} km · ${run.pace ? formatPaceLabel(run.pace) : 'pace n/a'}`}
                name={run.name}
                similarity={run.similarity}
                to={`/activities/${run.activityId}`}
              />
            ))}
          </Stack>
        )}

        {data.segmentMatches?.length > 0 && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Segment patterns (pace · volume · terrain)
            </Typography>
            {data.segmentMatches.map((match) => (
              <SimilarityRow
                key={`${match.segmentKey}-${match.similarActivity.id}`}
                date={match.similarActivity.date}
                label={`${match.segmentLabel} ↔ ${match.similarActivity.name}`}
                name={match.similarActivity.name}
                similarity={match.similarity}
                to={`/activities/${match.similarActivity.id}`}
              />
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default SimilarRunsPanel;
