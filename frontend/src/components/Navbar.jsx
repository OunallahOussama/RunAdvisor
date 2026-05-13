import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import ThemeToggleButton from './ThemeToggleButton';
import {
  ActivityIcon,
  CoachIcon,
  DashboardIcon,
  InstallIcon,
  RunAdvisorMark,
  SyncIcon
} from './icons';

const navigationItems = [
  { icon: DashboardIcon, label: 'Dashboard', to: '/dashboard' },
  { icon: ActivityIcon, label: 'Activities', to: '/activities' },
  { icon: CoachIcon, label: 'Coach Review', to: '/recommendations' },
  { icon: SyncIcon, label: 'Strava', to: '/strava-connect' }
];

function Navbar({ onLogout, user, canInstall, onInstall }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const displayName = user?.name || user?.email || 'Runner';

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="topbar">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" onClick={closeMenu} className="brand-link">
          <span className="brand-mark" aria-hidden="true">
            <RunAdvisorMark size={24} />
          </span>
          <span>
            RunAdvisor
            <span className="hidden text-sm font-medium sm:inline" style={{ color: 'var(--text-tertiary)' }}> Mobile coach</span>
          </span>
        </Link>
        <button
          type="button"
          aria-controls="navbar-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="menu-trigger sm:hidden"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
        <div
          id="navbar-menu"
          className={`${menuOpen ? 'flex' : 'hidden'} nav-cluster w-full flex-col gap-2 text-sm sm:flex sm:w-auto sm:flex-row`}
        >
          <span className="nav-user-pill">
            <span className="icon-shell icon-shell-soft">
              <ActivityIcon size={16} />
            </span>
            {displayName}
          </span>
          {navigationItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              className={({ isActive }) => `nav-link-pill ${isActive ? 'is-active' : ''}`}
              onClick={closeMenu}
              to={to}
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
          {canInstall && (
            <button
              className="btn-secondary"
              onClick={() => {
                closeMenu();
                onInstall();
              }}
              type="button"
            >
              <InstallIcon size={16} />
              <span>Install app</span>
            </button>
          )}
          <ThemeToggleButton compact={false} />
          <button
            onClick={() => {
              closeMenu();
              handleLogout();
            }}
            className="btn-primary"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
