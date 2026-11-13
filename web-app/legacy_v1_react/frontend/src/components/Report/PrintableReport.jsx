import React from 'react';
import styles from './PrintableReport.module.css';

export function PrintableReport({
  predictResult,
  targetMeta,
  previewUrl,
  timestamp = new Date().toISOString()
}) {
  if (!predictResult) return null;

  const direct = predictResult.direct;
  const indirect = predictResult.indirect;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.reportContainer} id="printable-research-report">
      <button
        type="button"
        onClick={handlePrint}
        className={styles.btnPrint}
      >
        🖨 Print or Save Research Report (PDF)
      </button>

      <div className={styles.reportHeader}>
        <h3 className={styles.reportTitle}>
          Ophthalmic Biomarker Prototype - Experimental Inference Summary
        </h3>
        <p className={styles.reportSubtitle}>
          Non-clinical research artifact generated for algorithm comparison and reproducibility.
        </p>
      </div>

      <div className={styles.metadataGrid}>
        <div><strong>Timestamp (UTC):</strong> {timestamp}</div>
        <div><strong>Target ID:</strong> {targetMeta?.label || direct?.target_id}</div>
        <div><strong>Task Type:</strong> {direct?.task_type}</div>
        <div><strong>Direct Model Architecture:</strong> {direct?.model_version || 'N/A'}</div>
      </div>

      {previewUrl && (
        <div className={styles.thumbnailSection}>
          <img
            src={previewUrl}
            alt="External anterior ocular photograph thumbnail"
            className={styles.thumbnail}
          />
          <div>
            <strong>Input Photography:</strong>
            <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
              De-identified anterior ocular photograph analyzed in volatile memory. No user, demographic, or clinical identifiers are recorded.
            </p>
          </div>
        </div>
      )}

      <table className={styles.resultsTable}>
        <thead>
          <tr>
            <th>Pathway</th>
            <th>Architecture Pipeline</th>
            <th>Model Status</th>
            <th>Point Estimate</th>
            <th>Inference Latency</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Pathway A (Direct)</strong></td>
            <td><code>external-eye &rarr; CNN &rarr; head</code></td>
            <td>{direct?.status}</td>
            <td>
              {direct?.prediction !== null
                ? `${direct.prediction} ${direct.units || ''}`
                : 'null (STUB)'}
            </td>
            <td>{direct?.latency_ms ?? '--'} ms</td>
          </tr>
          <tr>
            <td><strong>Pathway B (Indirect)</strong></td>
            <td><code>external-eye &rarr; generator &rarr; predictor</code></td>
            <td>{indirect?.status || 'UNAVAILABLE'}</td>
            <td>
              {indirect?.prediction !== null && indirect?.prediction !== undefined
                ? `${indirect.prediction} ${indirect.units || ''}`
                : 'null (BLOCKED)'}
            </td>
            <td>{indirect?.latency_ms ?? '--'} ms</td>
          </tr>
        </tbody>
      </table>

      {/* Mandatory Clinical Disclaimer */}
      <div className={styles.disclaimerBox}>
        <strong>MANDATORY REGULATORY NOTICE:</strong> Research prototype. Not a medical diagnosis. This summary is generated strictly for algorithmic validation and scientific peer review. It is not approved by any healthcare regulatory body for clinical diagnostic decision-making.
      </div>

      {/* Limitations Summary */}
      <div className={styles.limitationsBox}>
        <strong>Technical & Biological Limitations:</strong>
        <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
          <li>Standard anterior photographs capture ocular surface features only; zero direct optical path exists to posterior retinal structures.</li>
          <li>Conjunctival pallor and microvascular estimates are sensitive to ambient lighting, camera color calibration, and unmodeled ocular surface conditions.</li>
          <li>Generative cross-modal fundus synthesis is strictly experimental and may hallucinate anatomical features.</li>
        </ul>
      </div>
    </div>
  );
}

