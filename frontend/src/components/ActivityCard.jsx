import React, { useState } from 'react';
import {
  ActivityIcon,
  CalendarIcon,
  ClockIcon,
  DistanceIcon,
  ElevationIcon,
  HeartIcon,
  PaceIcon,
  RecoveryIcon,
  TrailIcon
} from './icons';

function getActivityIcon(activityType = '') {
  return activityType.toLowerCase().includes('trail') ? TrailIcon : ActivityIcon;
}

function getEffortLabel(activity) {
  if (activity.avgHeartRate >= 168 || activity.pace <= 4.7) {
    return 'High effort';
  }

  if (activity.avgHeartRate >= 150 || activity.pace <= 5.5) {
    return 'Steady effort';
  }

  if ((activity.movingTime || activity.duration || 0) / 60 >= 75) {
    return 'Long aerobic';
  }

  return 'Easy control';
}

function getRecoveryCue(activity) {
  const durationMinutes = Math.floor((activity.movingTime || activity.duration || 0) / 60);

  if (activity.avgHeartRate >= 168) {
    return 'Treat this as a quality day and add an easy recovery session next.';
  }

  if (activity.elevationGain >= 180) {
    return 'Climbing load was meaningful, so your legs may need extra recovery.';
  }

  if (durationMinutes >= 85) {
    return 'Long-duration work is in the bank. Keep the next run relaxed.';
  }

  return 'This effort fits well into a normal training week.';
}

function ActivityCard({ activity, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const distance = (activity.distance / 1000).toFixed(2);
  const duration = Math.floor((activity.movingTime || activity.duration || 0) / 60);
  const date = new Date(activity.date).toLocaleDateString();
  const ActivityTypeIcon = getActivityIcon(activity.type);
  const effortLabel = getEffortLabel(activity);
  const recoveryCue = getRecoveryCue(activity);

  return (
    <div className="section-card break-words transition hover:-translate-y-0.5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="icon-shell" aria-hidden="true">
            <ActivityTypeIcon size={18} />
          </span>
          <div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{activity.name}</h3>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>{activity.type} • {date}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="card-tag">{activity.type?.toUpperCase()}</span>
          <span className="detail-badge detail-badge-accent">{effortLabel}</span>
        </div>
      </div>

      <div className="mt-5 activity-metric-grid">
        <div className="activity-metric">
          <p className="activity-metric-label"><DistanceIcon size={14} /> Distance</p>
          <p className="activity-metric-value">{distance} km</p>
        </div>
        <div className="activity-metric">
          <p className="activity-metric-label"><ClockIcon size={14} /> Duration</p>
          <p className="activity-metric-value">{duration} mins</p>
        </div>
        <div className="activity-metric">
          <p className="activity-metric-label"><PaceIcon size={14} /> Pace</p>
          <p className="activity-metric-value">{activity.pace?.toFixed(1) ?? 'N/A'} min/km</p>
        </div>
        <div className="activity-metric">
          <p className="activity-metric-label"><CalendarIcon size={14} /> Date</p>
          <p className="activity-metric-value">{date}</p>
        </div>
        {activity.elevationGain > 0 && (
          <div className="activity-metric">
            <p className="activity-metric-label"><ElevationIcon size={14} /> Elevation</p>
            <p className="activity-metric-value">{activity.elevationGain} m</p>
          </div>
        )}
        {activity.avgHeartRate && (
          <div className="activity-metric">
            <p className="activity-metric-label"><HeartIcon size={14} /> Avg HR</p>
            <p className="activity-metric-value">{activity.avgHeartRate} bpm</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="btn-secondary"
          type="button"
        >
          {expanded ? 'Hide details' : 'View details'}
        </button>
        <button
          onClick={() => onDelete(activity._id)}
          className="btn-danger"
          type="button"
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="note-box">
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Activity details</p>
            <p className="mt-2 text-sm leading-6">{activity.notes || 'No extra notes for this activity.'}</p>
          </div>
          <div className="coach-callout">
            <div className="flex items-start gap-3">
              <span className="icon-shell icon-shell-soft">
                <RecoveryIcon size={16} />
              </span>
              <div>
                <p className="m-0 font-medium" style={{ color: 'var(--text-primary)' }}>Recovery cue</p>
                <p className="mt-2 text-sm leading-6">{recoveryCue}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityCard;
