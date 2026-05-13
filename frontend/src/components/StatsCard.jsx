import React from 'react';

function StatsCard({ title, value, icon: Icon, hint }) {
  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <div>
          <p className="stats-label">{title}</p>
          <p className="stats-value">{value}</p>
        </div>
        {Icon && (
          <span className="icon-shell" aria-hidden="true">
            <Icon size={20} />
          </span>
        )}
      </div>
      {hint && <p className="stats-hint">{hint}</p>}
    </div>
  );
}

export default StatsCard;
