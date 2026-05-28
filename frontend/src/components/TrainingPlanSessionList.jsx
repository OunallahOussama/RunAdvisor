import React from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { formatMetric, formatNumber } from '../utils/format';
import { formatPlanDayLabel, planDayDate, sessionTheme } from '../utils/weeklyPlanShared';

/**
 * Rolling 7-day program as a dated session list (not day-tile cards).
 */
function TrainingPlanSessionList({ weeklyPlan = [], planStartDate }) {
  const theme = useTheme();
  const days = weeklyPlan.slice(0, 7);

  if (!days.length) {
    return null;
  }

  return (
    <Stack
      spacing={1}
      data-testid="training-plan-session-list"
      divider={<Box sx={{ borderTop: 1, borderColor: 'divider' }} />}
    >
      {days.map((day, index) => {
        const scheduled = planDayDate(planStartDate, index);
        const session = sessionTheme(day.sessionType, theme.palette.mode);
        const isRest = day.sessionType === 'rest_or_xt';

        return (
          <Box
            key={`plan-session-${index}`}
            data-testid="training-plan-session"
            sx={{ py: 1 }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Day {index + 1} · {formatPlanDayLabel(scheduled)}
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  {day.title || session.label}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={session.label}
                sx={{
                  bgcolor: session.bgTint,
                  color: session.color,
                  fontWeight: 600,
                  flexShrink: 0
                }}
              />
            </Stack>
            {day.description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.5 }}>
                {day.description}
              </Typography>
            ) : null}
            {!isRest && (day.distanceKm > 0 || day.durationMinutes > 0) ? (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {day.distanceKm > 0 ? formatMetric(day.distanceKm, 'km') : null}
                {day.distanceKm > 0 && day.durationMinutes > 0 ? ' · ' : null}
                {day.durationMinutes > 0 ? `~${formatNumber(day.durationMinutes, { digits: 0 })} min` : null}
                {day.rpe ? ` · RPE ${day.rpe}` : null}
              </Typography>
            ) : null}
          </Box>
        );
      })}
    </Stack>
  );
}

export default TrainingPlanSessionList;
