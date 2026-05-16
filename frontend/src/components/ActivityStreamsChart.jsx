import React, { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { stravaApi } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

function ActivityStreamsChart({ activityId }) {
  const [streams, setStreams] = useState(null);
  const [loading, setLoading] = useState(false);
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
        const response = await stravaApi.getActivityStreams(activityId);
        if (!cancelled) {
          setStreams(response.data.streams);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Streams unavailable for this activity.');
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

  const chartData = useMemo(() => {
    if (!streams?.paceMinPerKm?.length) {
      return null;
    }

    const labels = streams.paceMinPerKm.map((_, index) => `${index + 1}`);

    return {
      labels,
      datasets: [
        {
          label: 'Pace (min/km)',
          data: streams.paceMinPerKm,
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.12)',
          yAxisID: 'y',
          tension: 0.3,
          pointRadius: 0
        },
        ...(streams.heartrate?.length
          ? [{
              label: 'Heart rate',
              data: streams.heartrate,
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              yAxisID: 'y1',
              tension: 0.3,
              pointRadius: 0
            }]
          : [])
      ]
    };
  }, [streams]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">Loading activity streams…</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="info">{error}</Alert>;
  }

  if (!chartData) {
    return null;
  }

  return (
    <Box sx={{ mt: 2, height: 280 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        Pace & heart rate streams
      </Typography>
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: { position: 'left', title: { display: true, text: 'min/km' } },
            y1: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'bpm' } }
          }
        }}
      />
    </Box>
  );
}

export default ActivityStreamsChart;
