import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import Recommendations from './pages/Recommendations';
import StravaConnect from './pages/StravaConnect';
import StravaCallback from './pages/StravaCallback';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App bg-runadvisor-blue text-slate-100">
        {isAuthenticated && <Navbar onLogout={handleLogout} />}
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register onLogin={handleLogin} />} 
          />
          <Route 
            path="/dashboard" 
            element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/activities" 
            element={isAuthenticated ? <Activities /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/recommendations" 
            element={isAuthenticated ? <Recommendations /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/strava-connect" 
            element={isAuthenticated ? <StravaConnect /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/callback" 
            element={isAuthenticated ? <StravaCallback /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
