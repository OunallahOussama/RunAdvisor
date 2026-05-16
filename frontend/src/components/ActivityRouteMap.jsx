import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import polyline from '@mapbox/polyline';

function buildSvgPath(points, width, height, padRatio = 0.06) {
  if (!points.length) {
    return '';
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  points.forEach(([lat, lng]) => {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  const latSpan = Math.max(maxLat - minLat, 1e-6);
  const lngSpan = Math.max(maxLng - minLng, 1e-6);
  const padLat = latSpan * padRatio;
  const padLng = lngSpan * padRatio;
  const edge = padRatio * Math.min(width, height);

  return points
    .map(([lat, lng]) => {
      const x = edge + ((lng - minLng + padLng) / (lngSpan + 2 * padLng)) * (width - 2 * edge);
      const y = edge + ((maxLat + padLat - lat) / (latSpan + 2 * padLat)) * (height - 2 * edge);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/**
 * Strava-style route preview from encoded polyline (no external map tiles).
 */
function ActivityRouteMap({ encodedPolyline, title = 'Route' }) {
  const pathPoints = useMemo(() => {
    if (!encodedPolyline || typeof encodedPolyline !== 'string') {
      return [];
    }

    try {
      return polyline.decode(encodedPolyline);
    } catch {
      return [];
    }
  }, [encodedPolyline]);

  if (!pathPoints.length) {
    return (
      <Box
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'action.hover',
          p: 2,
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No GPS track available for this activity.
        </Typography>
      </Box>
    );
  }

  const w = 800;
  const h = 360;
  const path = buildSvgPath(pathPoints, w, h);

  return (
    <Box sx={{ width: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </Typography>
      <Box
        sx={{
          borderRadius: 2,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100'),
          lineHeight: 0,
          color: 'primary.main'
        }}
      >
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Activity route map"
          style={{ display: 'block', minHeight: 200, maxHeight: 420 }}
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={path}
          />
        </svg>
      </Box>
    </Box>
  );
}

export default ActivityRouteMap;
