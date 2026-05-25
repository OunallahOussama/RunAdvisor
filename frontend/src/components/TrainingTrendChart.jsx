import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Legend,
  Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { chartTooltipCallbacks } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Legend,
  Tooltip
);

function TrainingTrendChart({ trend = [] }) {
  const isLightTheme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';
  const textColor = isLightTheme ? '#475569' : '#cbd5e1';
  const mutedTextColor = isLightTheme ? '#64748b' : '#94a3b8';
  const gridColor = isLightTheme ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.12)';

  const chartData = {
    labels: trend.map((point) => point.label),
    datasets: [
      {
        label: 'Distance (km)',
        data: trend.map((point) => point.totalDistanceKm),
        borderColor: '#f97316',
        backgroundColor: 'rgba(249, 115, 22, 0.18)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 5,
        yAxisID: 'distance'
      },
      {
        label: 'Avg pace (min/km)',
        data: trend.map((point) => point.avgPace),
        borderColor: '#38bdf8',
        backgroundColor: '#38bdf8',
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 5,
        yAxisID: 'pace'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        labels: {
          color: textColor
        }
      },
      tooltip: {
        callbacks: chartTooltipCallbacks({ paceDatasetLabels: ['pace', 'Pace'] })
      }
    },
    scales: {
      x: {
        ticks: {
          color: mutedTextColor
        },
        grid: {
          color: gridColor
        }
      },
      distance: {
        position: 'left',
        ticks: {
          color: mutedTextColor
        },
        grid: {
          color: gridColor
        },
        title: {
          display: true,
          text: 'Distance (km)',
          color: textColor
        }
      },
      pace: {
        position: 'right',
        ticks: {
          color: mutedTextColor
        },
        grid: {
          drawOnChartArea: false
        },
        title: {
          display: true,
          text: 'Avg pace',
          color: textColor
        }
      }
    }
  };

  return (
    <div className="h-72">
      <Line data={chartData} options={options} />
    </div>
  );
}

export default TrainingTrendChart;
