import React from 'react';
import styles from './QualityReport.module.css';

const COACHING_TIPS = {
  resolution: "Resolution below required dimensions: Move the camera closer or use a higher resolution setting to clearly resolve ocular microstructures.",
  blur: "Too blurry: Hold the camera steady with both hands, tap to focus on the iris/limbus, or increase ambient lighting to shorten exposure time.",
  brightness: "Lighting out of range: Ensure even, balanced ambient lighting. Avoid dark shadows or underexposure.",
  glare: "Excessive specular glare/flash reflection: Turn off direct camera flash and adjust angle away from overhead bulb reflections.",
  eye_visible: "Ocular structures not detected: Ensure the patient's eye is wide open and centered without occlusion from eyelids, hair, or hands."
};

export function QualityReport({ report, onProceed, onRetake }) {
  if (!report) return null;

  const { passed, checks = [], reasons = [] } = report;
  const failedChecks = checks.filter(c => !c.passed);

  return (
    <section
      aria-labelledby="quality-report-title"
      className={`${styles.container} ${passed ? styles.passedContainer : styles.rejectedContainer}`}
    >
      <div className={styles.headerRow}>
        <h3 id="quality-report-title" className={passed ? styles.titlePassed : styles.titleRejected}>
          {passed ? '✓ External-Eye Quality Gate Passed' : '⚠ External-Eye Quality Gate Rejected'}
        </h3>
        <span className={passed ? styles.badgePassed : styles.badgeRejected}>
          {passed ? 'PASSED' : 'REJECTED'}
        </span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr className={styles.tableHeader}>
            <th className={styles.th}>Inspection Metric</th>
            <th className={styles.th}>Measured Value</th>
            <th className={styles.th}>Threshold</th>
            <th className={styles.th}>Outcome</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((chk, idx) => (
            <tr key={idx} className={styles.tr}>
              <td className={styles.tdName}>{chk.name}</td>
              <td className={styles.tdVal}>{chk.value}</td>
              <td className={styles.tdVal}>{chk.threshold}</td>
              <td className={chk.passed ? styles.outcomePassed : styles.outcomeFailed}>
                {chk.passed ? 'Passed' : 'Failed'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!passed && (
        <div className={styles.failureSection}>
          <h4 className={styles.reasonsTitle}>Quality Failure Reasons:</h4>
          <ul className={styles.reasonsList}>
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {/* Feature 9: Image-quality coaching with per-check tips */}
          <div className={styles.guidanceBox}>
            <strong>Actionable Guidance for Re-taking & Coaching Tips:</strong>
            <ul className={styles.guidanceList}>
              {failedChecks.map((chk) => (
                <li key={chk.name} style={{ marginBottom: '0.35rem' }}>
                  <strong>{chk.name}:</strong> {COACHING_TIPS[chk.name] || "Ensure clean, unobstructed anterior eye capture."}
                </li>
              ))}
              {failedChecks.length === 0 && (
                <li>Ensure even ambient illumination and keep patient eye naturally open.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      <div className={styles.actionsRow}>
        {passed ? (
          <button
            onClick={onProceed}
            className={styles.btnProceed}
          >
            Proceed to Inference Analysis
          </button>
        ) : (
          <button
            onClick={onRetake}
            className={styles.btnRetake}
          >
            Upload a New Photograph
          </button>
        )}
      </div>
    </section>
  );
}
