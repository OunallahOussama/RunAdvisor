import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar({ onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" onClick={closeMenu} className="inline-flex items-center gap-3 text-lg font-bold text-slate-100">
          <span className="text-orange-400">🏃</span>
          RunAdvisor
        </Link>
        <button
          type="button"
          aria-controls="navbar-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-orange-400 sm:hidden"
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>
        <div
          id="navbar-menu"
          className={`${menuOpen ? 'flex' : 'hidden'} w-full flex-col gap-2 text-sm text-slate-200 sm:flex sm:w-auto sm:flex-row sm:items-center`}
        >
          <Link to="/dashboard" onClick={closeMenu} className="rounded-full px-4 py-2 transition hover:bg-slate-800">
            Dashboard
          </Link>
          <Link to="/activities" onClick={closeMenu} className="rounded-full px-4 py-2 transition hover:bg-slate-800">
            Activities
          </Link>
          <Link to="/recommendations" onClick={closeMenu} className="rounded-full px-4 py-2 transition hover:bg-slate-800">
            Recommendations
          </Link>
          <Link to="/strava-connect" onClick={closeMenu} className="rounded-full px-4 py-2 transition hover:bg-slate-800">
            Strava
          </Link>
          <button
            onClick={() => {
              closeMenu();
              handleLogout();
            }}
            className="rounded-full bg-orange-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-orange-300"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
