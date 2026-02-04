import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Models from './pages/Models';
import Benchmarks from './pages/Benchmarks';
import Results from './pages/Results';
import Settings from './pages/Settings';
import Cache from './pages/Cache';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path ? 'active' : '';
  
  return (
    <nav className="sidebar">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Navigation</h2>
      </div>
      <Link to="/" className={`nav-link ${isActive('/')}`}>
        Dashboard
      </Link>
      <Link to="/models" className={`nav-link ${isActive('/models')}`}>
        Models
      </Link>
      <Link to="/benchmarks" className={`nav-link ${isActive('/benchmarks')}`}>
        Benchmarks
      </Link>
      <Link to="/results" className={`nav-link ${isActive('/results')}`}>
        Results
      </Link>
      <Link to="/cache" className={`nav-link ${isActive('/cache')}`}>
        Cache
      </Link>
      <Link to="/settings" className={`nav-link ${isActive('/settings')}`}>
        Settings
      </Link>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <header className="header">
          <h1>FLPerformance</h1>
          <p>Foundry Local LLM Benchmark Tool</p>
        </header>
        <div className="main-container">
          <Navigation />
          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/models" element={<Models />} />
              <Route path="/benchmarks" element={<Benchmarks />} />
              <Route path="/results" element={<Results />} />
              <Route path="/cache" element={<Cache />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
