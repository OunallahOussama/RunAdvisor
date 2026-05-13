import React from 'react';
import { Link } from 'react-router-dom';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { CoachIcon, RecoveryIcon, RunAdvisorMark, TargetIcon } from '../components/icons';
import '../styles/Auth.css';

function Register({ onGoogleSignup }) {
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
        <h2>Create your account</h2>
        <p className="auth-copy">
          Create your RunAdvisor account with Google.
        </p>

        <div className="auth-feature-list">
          <div className="auth-feature">
            <TargetIcon size={16} />
            <span>Plan the next race from day one</span>
          </div>
          <div className="auth-feature">
            <CoachIcon size={16} />
            <span>Turn raw runs into clear coaching notes</span>
          </div>
          <div className="auth-feature">
            <RecoveryIcon size={16} />
            <span>Keep activity detail available on mobile</span>
          </div>
        </div>

        <div className="auth-actions">
          <button type="button" className="secondary-auth-button" onClick={onGoogleSignup}>
            Sign up with Google
          </button>
        </div>

        <p className="auth-link">
          Already have an account?
          {' '}
          <Link to="/login">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
