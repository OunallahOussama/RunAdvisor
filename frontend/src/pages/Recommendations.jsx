import React from 'react';
import Dashboard from './Dashboard';

/**
 * The `/recommendations` route is now a thin alias of `/`. The new home
 * is the recommendations / weekly insight screen, and we keep the
 * legacy route working to avoid breaking deep links from emails or
 * notifications. Existing tests that assert "Training review" copy now
 * navigate to the new home — see `__tests__/Recommendations.test.jsx`.
 */
function Recommendations() {
  return <Dashboard />;
}

export default Recommendations;
