import React from 'react';
import styles from './SessionHistory.module.css';

export function SessionHistory({ history = [], onClearHistory }) {
  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.title}>
          <span>📋</span> Ephemeral Session History
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className={styles.btnClear}
            aria-label="Clear all entries from tab memory"
          >
            Clear History Now
          </button>
        )}
      </div>

      <p className={styles.privacyBadge}>
        Strict privacy design: All records reside exclusively in browser tab memory. Zero entries are committed to local storage, indexedDB, or server disks.
      </p>

      {history.length === 0 ? (
        <div className={styles.emptyState}>
          No inference runs executed in this tab session yet.
        </div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Time</th>
              <th className={styles.th}>Target</th>
              <th className={styles.th}>Model Status</th>
              <th className={styles.th}>Direct Output</th>
              <th className={styles.th}>Latency</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td className={styles.td}>{item.time}</td>
                <td className={styles.td}><strong>{item.targetLabel}</strong></td>
                <td className={styles.td}>{item.status}</td>
                <td className={styles.td}>
                  {item.prediction !== null ? `${item.prediction} ${item.units || ''}` : 'null (STUB)'}
                </td>
                <td className={styles.td}>{item.latencyMs} ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

