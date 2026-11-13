import React, { useState } from 'react';
import { apiClient } from '../services/apiClient.js';
import styles from './ResearcherPortalPage.module.css';

export function ResearcherPortalPage() {
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.getResearcherSummary(token.trim());
      setSummary(data);
      setAuthenticated(true);
    } catch (err) {
      setError(err.message || 'Invalid researcher access token.');
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <h2 className={styles.loginTitle}>🔒 Researcher Telemetry & Diagnostics</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Protected investigator console. Enter your environment-configured access token to view runtime percentiles, error rates, and experiment logs.
          </p>

          <form onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label htmlFor="token-input" className={styles.inputLabel}>Researcher Token:</label>
              <input
                type="password"
                id="token-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. research-token-2026"
                className={styles.tokenInput}
                autoFocus
              />
            </div>

            {error && (
              <div role="alert" style={{ color: 'var(--color-danger-text)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className={styles.btnLogin}>
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>Researcher Diagnostic Portal</h2>
        <p className={styles.subtitle}>
          System-level telemetry, latency distributions, and experiment registry. Strict zero-patient data policy.
        </p>
      </header>

      {/* Feature 12: Model Status, Latency Percentiles, Error Counts */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span>⚡</span> Latency Percentiles & Error Metrics
        </h3>

        <div className={styles.grid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Median Latency (p50)</div>
            <div className={styles.statValue}>{summary?.latency_percentiles_ms?.p50} ms</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>95th Percentile (p95)</div>
            <div className={styles.statValue}>{summary?.latency_percentiles_ms?.p95} ms</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>99th Percentile (p99)</div>
            <div className={styles.statValue}>{summary?.latency_percentiles_ms?.p99} ms</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Gateway Requests</div>
            <div className={styles.statValue}>{summary?.error_metrics?.total_requests}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Rejected Format (400)</div>
            <div className={styles.statValue}>{summary?.error_metrics?.client_error_400}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Pathway Unavailable (409)</div>
            <div className={styles.statValue}>{summary?.error_metrics?.pathway_unavailable_409}</div>
          </div>
        </div>
      </section>

      {/* Feature 12: Experiment Log Viewer */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span>📁</span> Experiment Log Viewer (Reading JSON from outputs/)
        </h3>

        {summary?.experiment_logs?.length === 0 ? (
          <div className={styles.blockedCard}>
            <strong>No experiment log JSON files found in outputs/ directory.</strong>
            <p style={{ marginTop: '0.25rem' }}>
              Run batch training or benchmark scripts in the ML pipeline to persist execution logs.
            </p>
          </div>
        ) : (
          <div>
            {summary.experiment_logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '1rem' }}>
                <strong>{log.filename}</strong>
                <pre className={styles.logPre}>{JSON.stringify(log.data, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Feature 4: Real-vs-Generated Explorer */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span>🔬</span> Real-vs-Generated Explorer (Held-out Test Pairs)
        </h3>
        <div className={styles.blockedCard}>
          <strong>BLOCKED:</strong> No researcher-supplied held-out test pairs folder located in local repository. Cross-modal fundus synthesis requires verified patient-paired external-eye + fundus images.
        </div>
      </section>

      {/* Feature 13: Failure-Case Gallery */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span>⚠️</span> Failure-Case Gallery (Researcher-Only)
        </h3>
        <div className={styles.blockedCard}>
          <strong>BLOCKED:</strong> No researcher-supplied failure-case folder located in local repository. Skipped per anti-hallucination specification.
        </div>
      </section>
    </div>
  );
}

