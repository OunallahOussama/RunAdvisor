/**
 * Format a planned workout description for Strava manual activity upload.
 */
function paceLine(targetPace) {
  if (!targetPace) {
    return null;
  }
  if (targetPace.label) {
    return `Target pace: ${targetPace.label}`;
  }
  if (targetPace.lowerMinPerKm != null && targetPace.upperMinPerKm != null) {
    return `Target pace: ${targetPace.lowerMinPerKm}–${targetPace.upperMinPerKm} min/km`;
  }
  return null;
}

function blockLines(label, block) {
  if (!block) {
    return [];
  }
  const lines = [`${label} (${block.durationMinutes || 0} min)`];
  if (block.description) {
    lines.push(block.description);
  }
  const pace = paceLine(block.targetPace);
  if (pace) {
    lines.push(pace);
  }
  if (block.hrZone) {
    lines.push(`HR: ${block.hrZone}`);
  }
  if (block.rpe) {
    lines.push(`RPE: ${block.rpe}`);
  }
  return lines;
}

function buildPlannedWorkoutDescription(payload) {
  const {
    description,
    sessionType,
    targetPace,
    rpe,
    hrZone,
    sessionBlocks
  } = payload;

  const lines = [];

  if (sessionType) {
    lines.push(`Session type: ${sessionType}`);
  }
  const pace = paceLine(targetPace);
  if (pace) {
    lines.push(pace);
  }
  if (hrZone) {
    lines.push(`HR zone: ${hrZone}`);
  }
  if (rpe) {
    lines.push(`RPE: ${rpe}`);
  }
  if (description) {
    lines.push('');
    lines.push(description);
  }

  if (sessionBlocks && typeof sessionBlocks === 'object') {
    const sections = [
      ['Warm-up', sessionBlocks.warmup],
      ['Main set', sessionBlocks.mainSet],
      ['Cool-down', sessionBlocks.cooldown]
    ].filter(([, block]) => block);

    if (sections.length) {
      lines.push('');
      lines.push('Session breakdown:');
      sections.forEach(([label, block]) => {
        lines.push(blockLines(label, block).join(' — '));
      });
    }
  }

  lines.push('');
  lines.push('Logged from RunAdvisor weekly training plan (manual activity — not a Strava scheduled workout).');

  return lines.filter((line) => line !== undefined).join('\n');
}

module.exports = {
  buildPlannedWorkoutDescription,
  blockLines,
  paceLine
};
