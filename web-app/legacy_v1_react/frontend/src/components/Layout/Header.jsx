import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { apiClient } from '../../services/apiClient.js';
import styles from './Header.module.css';

export function Header() {
  const [health, setHealth] = useState({ gateway: '...', inference: '...' });
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.getAttribute('data-theme') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    apiClient.getHealth()
      .then(res => setHealth(res))
      .catch(() => setHealth({ gateway: 'UNAVAILABLE', inference: 'UNAVAILABLE' }));
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  const getStatusColor = (status) => {
    if (status === 'LOADED') return 'var(--color-success-text)';
    if (status === 'STUB') return 'var(--color-stub-text)';
    return 'var(--color-danger-text)';
  };

  return (
    <header className={styles.header}>
      <div className={styles.titleArea}>
        <h1>Ophthalmic Biomarker Prototype</h1>
        <p>Direct Anterior Prediction vs. Cross-Modal Fundus Synthesis</p>
      </div>

      <nav aria-label="Main Navigation" className={styles.nav}>
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? `${styles.active}` : '')}
        >
          Home / About
        </NavLink>
        <NavLink
          to="/workbench"
          className={({ isActive }) => (isActive ? `${styles.active}` : '')}
        >
          Workbench
        </NavLink>
        <NavLink
          to="/metrics"
          className={({ isActive }) => (isActive ? `${styles.active}` : '')}
        >
          Metrics Dashboard
        </NavLink>
        <NavLink
          to="/model-card"
          className={({ isActive }) => (isActive ? `${styles.active}` : '')}
        >
          Model Card
        </NavLink>
        <NavLink
          to="/researcher"
          className={({ isActive }) => (isActive ? `${styles.active}` : '')}
        >
          Researcher Portal
        </NavLink>
      </nav>

      <div className={styles.controlsArea}>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={styles.themeToggleBtn}
        >
          {isDark ? '☀️ Light' : '🌙 Dark'}
        </button>

        <div className={styles.statusBadge}>
          <span>GW: <strong style={{ color: getStatusColor(health.gateway) }}>{health.gateway}</strong></span>
          <span>|</span>
          <span>INF: <strong style={{ color: getStatusColor(health.inference) }}>{health.inference}</strong></span>
        </div>
      </div>
    </header>
  );
}
