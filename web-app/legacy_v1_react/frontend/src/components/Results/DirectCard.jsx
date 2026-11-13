import React from 'react';
import styles from './DirectCard.module.css';

export function DirectCard({ result, targetMeta }) {
  if (!result) return null;

  const isStub = result.status === 'stub';
  const targetLabel = targetMeta?.label || result.target_id;
  const units = result.units ? ` ${result.units}` : '';

  return (
    <article
      aria-labelledby="direct-card-title"
      className={styles.card}
    >
      <div className={styles.headerRow}>
        <h3 id="direct-card-title" className={styles.title}>
          Pathway A (Direct Prediction)
        </h3>
        <span className={isStub ? styles.badgeStub : styles.badgeLoaded}>
          {isStub ? 'STUB' : 'LOADED'}
        </span>
      </div>

      <p className={styles.pipelineDesc}>
        Pipeline: <code>external-eye &rarr; quality gate &rarr; CNN encoder &rarr; head</code>
      </p>

      {isStub ? (
        <div className={styles.stubBanner}>
          <p className={styles.stubTitle}>
            Demo mode: no trained model loaded
          </p>
          <p className={styles.stubText}>
            Model status is reported as <code>STUB</code> by the backend registry. Per anti-hallucination rules, point estimates are set to null and no mock predictions are fabricated.
          </p>
        </div>
      ) : (
        <div className={styles.estimateBox}>
          <span className={styles.estimateLabel}>
            {targetLabel} Point Estimate
          </span>
          <span className={styles.estimateVal}>
            {result.prediction !== null ? `${result.prediction}${units}` : 'Not Available'}
          </span>
        </div>
      )}

      <dl className={styles.metaList}>
        <div className={styles.metaRow}>
          <dt className={styles.dt}>Target Biomarker:</dt>
          <dd className={styles.dd}>{targetLabel}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.dt}>Task Type:</dt>
          <dd className={styles.dd}>{result.task_type}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.dt}>Model Architecture / Version:</dt>
          <dd className={styles.code}>{result.model_version}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.dt}>Inference Latency:</dt>
          <dd className={styles.dd}>{result.latency_ms} ms</dd>
        </div>
      </dl>

      {result.warnings && result.warnings.length > 0 && (
        <div className={styles.warningsBox}>
          {result.warnings.map((w, idx) => (
            <p key={idx}>⚠ {w}</p>
          ))}
        </div>
      )}
    </article>
  );
}
