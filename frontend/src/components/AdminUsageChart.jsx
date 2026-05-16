import React from 'react';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Legend, Tooltip);

function AdminUsageChart({ dailySeries = [] }) {
  const isLightTheme = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light';
  const textColor = isLightTheme ? '#475569' : '#cbd5e1';
  const gridColor = isLightTheme ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.12)';

  if (!dailySeries.length) {
    return null;
  }

  const chartData = {
    labels: dailySeries.map((row) => row.date),
    datasets: [
      {
        label: 'Requests',
        data: dailySeries.map((row) => row.requests),
        backgroundColor: 'rgba(249, 115, 22, 0.75)',
        borderRadius: 6,
        stack: 'traffic'
      },
      {
        label: 'Errors (4xx/5xx)',
        data: dailySeries.map((row) => row.errors),
        backgroundColor: 'rgba(239, 68, 68, 0.85)',
        borderRadius: 6,
        stack: 'traffic'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: textColor }
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        stacked: true,
        ticks: { color: textColor, maxRotation: 0 },
        grid: { color: gridColor }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { color: textColor, precision: 0 },
        grid: { color: gridColor }
      }
    }
  };

  return (
    <Bar data={chartData} options={options} />
  );
}

export default AdminUsageChart;
