import React from 'react';
import styles from './TargetSelector.module.css';

export function TargetSelector({
  targets = [],
  selectedTargetId,
  onSelectTarget,
  disabled = false,
  loading = false
}) {
  if (loading) {
    return (
      <div className={styles.container}>
        <label className={styles.label}>
          Biomarker Target
        </label>
        <div className={styles.loadingBox}>
          Loading available candidate targets from inference registry...
        </div>
      </div>
    );
  }

  if (!targets || targets.length === 0) {
    return (
      <div className={styles.container}>
        <label className={styles.label}>
          Biomarker Target
        </label>
        <div className={styles.emptyBox}>
          No biomarker targets currently reported by /api/capabilities.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <label htmlFor="target-select" className={styles.label}>
        Select Candidate Biomarker Target:
      </label>
      <select
        id="target-select"
        value={selectedTargetId}
        onChange={(e) => onSelectTarget(e.target.value)}
        disabled={disabled}
        className={styles.select}
      >
        <option value="">-- Choose a Biomarker Target --</option>
        {targets.map((t) => {
          const isStubOrUnavailable = t.status === 'STUB' || t.status === 'UNAVAILABLE';
          const reason = t.status === 'STUB'
            ? ' (Demo Mode - Model Checkpoint Not Loaded)'
            : t.status === 'UNAVAILABLE'
            ? ' (Unavailable - No Paired Dataset)'
            : '';
          const unitsLabel = t.units ? ` [${t.units}]` : '';

          return (
            <option
              key={t.id}
              value={t.id}
              disabled={isStubOrUnavailable}
            >
              {t.label} ({t.task_type}){unitsLabel}{reason}
            </option>
          );
        })}
      </select>
      <p className={styles.helperText}>
        Dynamic target list queried directly from <code>/api/capabilities</code>. Disabled targets indicate unverified weights or lack of paired cohorts.
      </p>
    </div>
  );
}

