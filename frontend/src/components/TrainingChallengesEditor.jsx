import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { CHALLENGE_TEMPLATES, challengeKindLabel } from '../constants/trainingChallenges';

function challengeFromTemplate(template) {
  return {
    kind: template.kind,
    title: template.title,
    targetKm: template.targetKm,
    targetPaceMinPerKm: template.targetPaceMinPerKm,
    raceDistanceKm: template.raceDistanceKm,
    active: true
  };
}

function TrainingChallengesEditor({ challenges = [], onChange }) {
  const [templateKind, setTemplateKind] = useState(CHALLENGE_TEMPLATES[0]?.kind || 'monthly_km');

  const addFromTemplate = () => {
    const template = CHALLENGE_TEMPLATES.find((t) => t.kind === templateKind);
    if (!template) {
      return;
    }

    onChange([...challenges, challengeFromTemplate(template)]);
  };

  const removeAt = (index) => {
    onChange(challenges.filter((_, i) => i !== index));
  };

  const updateAt = (index, patch) => {
    onChange(challenges.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  return (
    <Stack spacing={1.5} data-testid="training-challenges-editor">
      <Typography variant="body2" color="text.secondary">
        Add km, pace, PR, or race-prediction challenges. Progress updates from your logged runs and similar-load
        projections.
      </Typography>

      {challenges.map((challenge, index) => (
        <Box
          key={`${challenge.kind}-${index}`}
          sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2" fontWeight={600}>
              {challenge.title || challengeKindLabel(challenge.kind)}
            </Typography>
            <IconButton size="small" aria-label="Remove challenge" onClick={() => removeAt(index)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
            <TextField
              size="small"
              fullWidth
              label="Title"
              value={challenge.title || ''}
              onChange={(e) => updateAt(index, { title: e.target.value })}
            />
            {(challenge.kind === 'monthly_km' ||
              challenge.kind === 'yearly_km' ||
              challenge.kind === 'weekly_km' ||
              challenge.kind === 'custom_km' ||
              challenge.kind === 'pr_longest_km' ||
              challenge.kind === 'pr_elevation') && (
              <TextField
                size="small"
                label={challenge.kind === 'pr_elevation' ? 'Target (m)' : 'Target km'}
                type="number"
                value={challenge.targetKm ?? ''}
                onChange={(e) => updateAt(index, { targetKm: Number(e.target.value) })}
                sx={{ minWidth: 120 }}
              />
            )}
            {(challenge.kind === 'pace_cap' || challenge.kind === 'pr_fastest_pace' || challenge.kind === 'race_prediction') && (
              <TextField
                size="small"
                label="Pace (min/km)"
                type="number"
                inputProps={{ step: 0.1, min: 3 }}
                value={challenge.targetPaceMinPerKm ?? ''}
                onChange={(e) => updateAt(index, { targetPaceMinPerKm: Number(e.target.value) })}
                sx={{ minWidth: 120 }}
              />
            )}
            {challenge.kind === 'race_prediction' && (
              <TextField
                size="small"
                label="Race km"
                type="number"
                value={challenge.raceDistanceKm ?? ''}
                onChange={(e) => updateAt(index, { raceDistanceKm: Number(e.target.value) })}
                sx={{ minWidth: 100 }}
              />
            )}
          </Stack>
        </Box>
      ))}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <TextField
          select
          size="small"
          label="Add challenge"
          value={templateKind}
          onChange={(e) => setTemplateKind(e.target.value)}
          sx={{ minWidth: 220 }}
        >
          {CHALLENGE_TEMPLATES.map((t) => (
            <MenuItem key={t.kind} value={t.kind}>
              {t.title}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" size="small" onClick={addFromTemplate}>
          Add
        </Button>
      </Stack>
    </Stack>
  );
}

export default TrainingChallengesEditor;
