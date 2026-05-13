import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { CoachIcon, RunAdvisorMark, TargetIcon, TrendIcon } from '../components/icons';
import '../styles/Auth.css';

function Login({ onGoogleLogin }) {
  return (
    <div className="auth-container">
      <div className="auth-toolbar">
        <ThemeToggleButton compact />
      </div>
      <div className="auth-box">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">
            <RunAdvisorMark size={26} />
          </span>
          <h1>RunAdvisor</h1>
        </div>
        <h2>Sign in</h2>
        <p className="auth-copy">
          Continue with your Google account to access RunAdvisor.
        </p>

        <div className="auth-feature-list">
          <div className="auth-feature">
            <TrendIcon size={16} />
            <span>Trend-aware training review</span>
          </div>
          <div className="auth-feature">
            <TargetIcon size={16} />
            <span>Race planning and pacing detail</span>
          </div>
          <div className="auth-feature">
            <CoachIcon size={16} />
            <span>Installable mobile coaching workspace</span>
          </div>
        </div>

        <div className="auth-actions">
          <button type="button" className="secondary-auth-button" onClick={onGoogleLogin}>
            Continue with Google
          </button>
        </div>

        <p className="auth-link">
          Need an account?
          {' '}
          <Link to="/register">Create one here</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
