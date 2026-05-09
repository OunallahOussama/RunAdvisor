import React from 'react';

function StatsCard({ title, value, icon }) {
  return (
    <div className="stats-card">
      <div className="stats-icon">{icon}</div>
      <h3>{title}</h3>
      <p className="stats-value">{value}</p>
    </div>
  );
}

export default StatsCard;
