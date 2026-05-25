import React from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import { decimalPaceToMinSec, formatPaceLabel, minSecToDecimalPace } from '../utils/format';

function PaceInput({ label = 'Goal pace', minutes, seconds, onChange, helperText }) {
  const preview = minSecToDecimalPace(minutes, seconds);

  return (
    <Stack spacing={1} sx={{ flex: 1 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          label="Min"
          type="number"
          size="small"
          inputProps={{ min: 2, max: 15, step: 1 }}
          value={minutes}
          onChange={(e) => onChange({ minutes: e.target.value, seconds })}
          sx={{ width: 88 }}
        />
        <Typography variant="body2" color="text.secondary">
          :
        </Typography>
        <TextField
          label="Sec"
          type="number"
          size="small"
          inputProps={{ min: 0, max: 59, step: 1 }}
          value={seconds}
          onChange={(e) => onChange({ minutes, seconds: e.target.value })}
          sx={{ width: 88 }}
        />
        <Typography variant="body2" color="text.secondary">
          /km
        </Typography>
      </Stack>
      {preview != null && Number.isFinite(preview) ? (
        <Chip size="small" variant="outlined" label={formatPaceLabel(preview)} />
      ) : null}
      {helperText ? (
        <Typography variant="caption" color="text.secondary">
          {helperText}
        </Typography>
      ) : null}
    </Stack>
  );
}

export function paceFieldsFromDecimal(minPerKm) {
  return decimalPaceToMinSec(minPerKm);
}

export default PaceInput;
