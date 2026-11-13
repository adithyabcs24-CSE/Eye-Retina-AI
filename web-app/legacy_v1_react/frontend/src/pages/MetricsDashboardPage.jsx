import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient.js';
import { Tooltip } from '../components/Common/Tooltip.jsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ScatterChart,
  Scatter,
  BarChart,
  Bar
} from 'recharts';
import styles from './MetricsDashboardPage.module.css';

export function MetricsDashboardPage() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    apiClient.getMetrics()
      .then(data => {
        if (mounted) {
          setMetrics(data || []);
          setLoading(false);
        }
      })
      .catch(err => {
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
        <h2 className={styles.title}>Metrics & Evaluation Dashboard</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading population-level validation records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div role="alert" style={{ padding: '1rem', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger-text)' }}>
          {error}
        </div>
      </div>
    );
  }

  // Feature 2 Empty State: "Not yet evaluated"
  if (metrics.length === 0) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 className={styles.title}>Empirical Metrics & Population Dashboard</h2>
          <p className={styles.subtitle}>
            Population-level algorithmic evaluation curves and statistical discrimination properties.
          </p>
        </header>

        <div className={styles.emptyStateCard}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
          <h3 className={styles.emptyStateTitle}>Not yet evaluated</h3>
          <p className={styles.emptyStateText}>
            No quantitative validation benchmarks have been written to <code>outputs/metrics/*.json</code>. Per project anti-hallucination rules, mock or speculative statistical curves (ROC, PR, calibration, Bland-Altman) are strictly prohibited and never fabricated.
          </p>
          <div className={styles.emptyStateNotice}>
            Run evaluation pipelines from the ML project repository to populate verified validation files.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>Empirical Metrics & Population Dashboard</h2>
        <p className={styles.subtitle}>
          Visualizing statistical benchmarks strictly read from <code>outputs/metrics/*.json</code>.
        </p>
      </header>

      {metrics.map((m, idx) => {
        const isClassification = m.task_type === 'classification' || m.roc_curve;
        const isRegression = m.task_type === 'regression' || m.bland_altman;

        return (
          <div key={idx} className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>
                {m.target_label || m.target_id || `Evaluation Run #${idx + 1}`}
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Target Type: {m.task_type || 'unspecified'}
              </span>
            </div>

            {/* Classification Plots */}
            {isClassification && (
              <>
                {/* ROC Curve */}
                {m.roc_curve && (
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      ROC Curve (AUC: {m.roc_auc ?? 'N/A'})
                      <Tooltip term="ROC-AUC" text="Area under Receiver Operating Characteristic curve. Measures separation ability across classification thresholds." />
                    </div>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={m.roc_curve}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="fpr" label={{ value: 'False Positive Rate (1 - Specificity)', position: 'insideBottom', offset: -5 }} />
                          <YAxis label={{ value: 'True Positive Rate (Sensitivity)', angle: -90, position: 'insideLeft' }} />
                          <ChartTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="tpr" stroke="#2563eb" name="Model ROC" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* PR Curve */}
                {m.pr_curve && (
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      Precision-Recall Curve (PR-AUC: {m.pr_auc ?? 'N/A'})
                      <Tooltip term="PR-AUC" text="Precision vs Recall tradeoff across decision thresholds, especially informative for imbalanced clinical conditions." />
                    </div>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={m.pr_curve}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="recall" label={{ value: 'Recall (Sensitivity)', position: 'insideBottom', offset: -5 }} />
                          <YAxis label={{ value: 'Precision (PPV)', angle: -90, position: 'insideLeft' }} />
                          <ChartTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="precision" stroke="#16a34a" name="Model PR" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Calibration Plot */}
                {m.calibration_curve && (
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      Calibration / Reliability Curve
                      <Tooltip term="Calibration" text="Reliability diagram assessing whether predicted probability matches observed event frequencies." />
                    </div>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={m.calibration_curve}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mean_predicted" label={{ value: 'Mean Predicted Probability', position: 'insideBottom', offset: -5 }} />
                          <YAxis label={{ value: 'Observed Fraction', angle: -90, position: 'insideLeft' }} />
                          <ChartTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="fraction_positives" stroke="#d97706" name="Empirical Reliability" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Confusion Matrix */}
                {m.confusion_matrix && (
                  <div>
                    <div style={{ fontWeight: 600 }}>Confusion Matrix</div>
                    <div className={styles.confusionMatrixGrid}>
                      <div className={styles.cmHeader}></div>
                      <div className={styles.cmHeader}>Pred Positive</div>
                      <div className={styles.cmHeader}>Pred Negative</div>

                      <div className={styles.cmHeader}>True Pos</div>
                      <div className={styles.cmCell}><strong>{m.confusion_matrix.tp}</strong> (TP)</div>
                      <div className={styles.cmCell}><strong>{m.confusion_matrix.fn}</strong> (FN)</div>

                      <div className={styles.cmHeader}>True Neg</div>
                      <div className={styles.cmCell}><strong>{m.confusion_matrix.fp}</strong> (FP)</div>
                      <div className={styles.cmCell}><strong>{m.confusion_matrix.tn}</strong> (TN)</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Regression Plots */}
            {isRegression && (
              <>
                {/* Bland-Altman Plot */}
                {m.bland_altman && (
                  <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                      Bland-Altman Agreement Plot
                      <Tooltip term="Bland-Altman" text="Plots mean of paired measurements vs their difference to evaluate systemic bias and 95% limits of agreement." />
                    </div>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mean" name="Mean" label={{ value: 'Mean of Direct & Reference', position: 'insideBottom', offset: -5 }} />
                          <YAxis dataKey="diff" name="Difference" label={{ value: 'Difference (Direct - Reference)', angle: -90, position: 'insideLeft' }} />
                          <ChartTooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name="Paired Residuals" data={m.bland_altman.points || []} fill="#8884d8" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Error Distribution */}
                {m.error_distribution && (
                  <div>
                    <div style={{ fontWeight: 600 }}>Residual Error Distribution</div>
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={m.error_distribution}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bin" label={{ value: 'Residual Error Range', position: 'insideBottom', offset: -5 }} />
                          <YAxis label={{ value: 'Frequency Count', angle: -90, position: 'insideLeft' }} />
                          <ChartTooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

