import React, { useState } from 'react';

function ActivityCard({ activity, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const distance = (activity.distance / 1000).toFixed(2);
  const duration = Math.floor((activity.movingTime || activity.duration || 0) / 60);
  const date = new Date(activity.date).toLocaleDateString();

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-900/90 p-5 shadow-2xl shadow-black/25 transition hover:-translate-y-0.5 hover:border-orange-400 break-words">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">{activity.name}</h3>
          <p className="mt-2 text-sm text-slate-400">{activity.type} • {date}</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <span className="card-tag">{activity.type?.toUpperCase()}</span>
          <span className="detail-badge">{distance} km</span>
          <span className="detail-badge">{duration} mins</span>
          <span className="detail-badge">{activity.pace?.toFixed(1) ?? 'N/A'} min/km</span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {activity.elevationGain > 0 && <div className="note-box">⛰️ Elevation: {activity.elevationGain} m</div>}
        {activity.avgHeartRate && <div className="note-box">❤️ Avg HR: {activity.avgHeartRate} bpm</div>}
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
          className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
          type="button"
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div className="mt-4 rounded-3xl border border-slate-700 bg-slate-950/70 p-4 text-slate-300">
          <p className="font-medium text-slate-100">Activity details</p>
          <p className="mt-2 text-sm leading-6">{activity.notes || 'No extra notes for this activity.'}</p>
        </div>
      )}
    </div>
  );
}

export default ActivityCard;
