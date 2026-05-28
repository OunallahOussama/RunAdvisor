import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

/**
 * Material 3–style analytics tile (Google Analytics–like chart container).
 */
function AnalyticsChartContainer({
  title,
  subtitle,
  height = 280,
  children,
  empty = false,
  emptyMessage = 'Not enough data yet.',
  testId
}) {
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      data-testid={testId}
      sx={{
        height: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        boxShadow: theme.palette.mode === 'dark' ? 'none' : `0 1px 2px ${alpha(theme.palette.common.black, 0.06)}`
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 0.5,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.04)
        }}
      >
        <Stack spacing={0.25}>
          <Typography variant="subtitle1" fontWeight={700} component="h3">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
      </Box>
      <CardContent sx={{ flex: 1, pt: 1.5, pb: 2, '&:last-child': { pb: 2 } }}>
        {empty ? (
          <Box
            sx={{
              height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              px: 2
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ width: 1, height, minHeight: height }}>{children}</Box>
        )}
      </CardContent>
    </Card>
  );
}

export default AnalyticsChartContainer;
