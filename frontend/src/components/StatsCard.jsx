import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

function StatsCard({ title, value, icon: Icon, hint }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
          <Box>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
            <Typography component="p" sx={{ mt: 0.5 }} variant="h5" fontWeight={700}>
              {value}
            </Typography>
          </Box>
          {Icon && (
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
              <Icon size={20} />
            </Box>
          )}
        </Box>
        {hint && (
          <Typography color="text.secondary" sx={{ mt: 1.5 }} variant="caption" display="block">
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default StatsCard;
