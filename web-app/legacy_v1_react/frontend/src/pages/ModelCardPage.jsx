import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient.js';
import { LoadingSkeleton } from '../components/Layout/LoadingSkeleton.jsx';
import { Tooltip } from '../components/Common/Tooltip.jsx';
import styles from './ModelCardPage.module.css';

export function ModelCardPage() {
  const [modelCard, setModelCard] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([apiClient.getModelCard(), apiClient.getMetrics()])
      .then(([cardData, metricsData]) => {
        if (mounted) {
          setModelCard(cardData);
          setMetrics(metricsData || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <h2 className={styles.title}>Model Card & System Specifications</h2>
        <LoadingSkeleton lines={6} height="2rem" />
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className={styles.errorBox}>
        <strong>Error loading model card:</strong> {error}
      </div>
    );
  }

  // Feature 8: Uncertainty definition check
  const hasCalibration = metrics.some(m => m.calibration_curve && m.calibration_curve.length > 0);
  const hasUncertaintyDefinition = Boolean(modelCard?.uncertainty_definition && hasCalibration);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          Model Card & Scientific Evaluation Bounds
        </h2>
        <p className={styles.subtitle}>
          Standardized architectural specifications, training cohort provenance, and clinical boundary documentation.
        </p>
      </header>

      {/* Intended & Out-of-Scope Use */}
      <section className={styles.cardSection}>
        <h3 className={styles.sectionTitle}>
          Intended Use & Operational Boundary
        </h3>
        <p className={styles.intendedUseText}>
          <strong>Intended Use:</strong> {modelCard?.intended_use}
        </p>
        <div className={styles.outOfScopeBox}>
          <strong>Strictly Out-of-Scope:</strong> {modelCard?.out_of_scope_use}
        </div>
      </section>

      {/* Training Cohort Provenance */}
      <section className={styles.cardSection}>
        <h3 className={styles.sectionTitle}>
          Training Data & Cohort Provenance
        </h3>
        <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div><strong>Cohort Name:</strong> {modelCard?.training_data?.name || 'Synthetic Test Stubs'}</div>
          <div><strong>Data Provenance:</strong> {modelCard?.training_data?.provenance || 'Non-patient synthetic images'}</div>
          <div><strong>Verified Paired Datasets:</strong> {modelCard?.training_data?.pairs_verified ? 'Yes' : 'None (Pathway B Locked)'}</div>
          <div><strong>Evaluation Date:</strong> {modelCard?.evaluation_date || 'Pending formal benchmark run'}</div>
        </div>
      </section>

      {/* Model Versions */}
      <section className={styles.cardSection}>
        <h3 className={styles.sectionTitle}>
          Model Registry Versions
        </h3>
        <dl className={styles.versionsGrid}>
          {modelCard?.versions && Object.entries(modelCard.versions).map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className={styles.versionKey}>{k.replace('_', ' ')}:</dt>
              <dd className={styles.versionVal}>{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      </section>

      {/* Feature 8: Uncertainty/Confidence Display ONLY if defined and calibrated */}
      {hasUncertaintyDefinition ? (
        <section className={styles.cardSection}>
          <h3 className={styles.sectionTitle}>
            Uncertainty & Confidence Calibration
            <Tooltip term="Calibration" text="Confidence intervals calibrated against empirical event frequencies." />
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            {modelCard.uncertainty_definition}
          </p>
        </section>
      ) : null}

      {/* Empirical Validation Metrics */}
      <section className={styles.cardSection}>
        <h3 className={styles.sectionTitle}>
          Empirical Validation Metrics
        </h3>
        {metrics.length === 0 ? (
          <div className={styles.notEvaluatedBox}>
            <strong>Not yet evaluated.</strong>
            <p className={styles.notEvaluatedDesc}>
              No quantitative benchmark runs have been logged to <code>outputs/metrics/*.json</code>. Per project anti-hallucination rules, speculative or hand-crafted accuracy/AUC numbers are never displayed.
            </p>
          </div>
        ) : (
          <div>
            <pre className={styles.metricsPre}>
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Documented Clinical & Optical Limitations (Section 15) */}
      <section className={styles.cardSection}>
        <h3 className={styles.sectionTitle}>
          Documented Safety & Optical Constraints
        </h3>
        <ul className={styles.limitationsList}>
          {modelCard?.limitations?.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
