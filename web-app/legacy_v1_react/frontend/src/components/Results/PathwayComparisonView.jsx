import React from 'react';
import { DirectCard } from './DirectCard.jsx';
import { IndirectCard } from './IndirectCard.jsx';
import { Tooltip } from '../Common/Tooltip.jsx';
import styles from './PathwayComparisonView.module.css';

export function PathwayComparisonView({
  predictResult,
  targetMeta,
  pathwayBAvailable,
  populationMetrics = null
}) {
  if (!predictResult) return null;

  const direct = predictResult.direct;
  const indirect = predictResult.indirect;
  const disagreement = predictResult.disagreement_summary;

  // Extract paired comparison & fidelity if available from metrics JSON
  const pairedComparison = populationMetrics?.paired_comparison;
  const reconstructionFidelity = populationMetrics?.reconstruction_fidelity;

  return (
    <section aria-labelledby="pathway-comp-title" className={styles.container}>
      <h3 id="pathway-comp-title" className={styles.title}>
        Pathway Comparison: Direct vs Indirect Reconstruction
      </h3>

      {/* Side-by-side Cards */}
      <div className={styles.cardsGrid}>
        <DirectCard result={direct} targetMeta={targetMeta} />
        <IndirectCard
          result={indirect}
          targetMeta={targetMeta}
          pathwayBAvailable={pathwayBAvailable}
        />
      </div>

      {/* Disagreement Indicator */}
      <div className={styles.disagreementBox}>
        <h4 className={styles.disagreementTitle}>
          <span>⚖</span> Disagreement Assessment
        </h4>
        <p className={styles.disagreementText}>
          {disagreement?.note ||
            (pathwayBAvailable
              ? "Both pathways produced estimates. Review individual confidence and residual intervals."
              : "Pathway B unavailable: Paired external-eye and genuine fundus dataset is not available; cross-modal disagreement cannot be computed.")}
        </p>
      </div>

      {/* Feature 1: Population-Level Results (SEPARATE panel) */}
      <div className={styles.populationPanel}>
        <span className={styles.populationBadge}>Separate Benchmark Context</span>
        <h4 className={styles.populationTitle}>
          Population-level results, not the accuracy of this prediction
        </h4>
        <p className={styles.populationSubtitle}>
          These aggregate cohort validation metrics reflect test-set performance across population benchmarks and do not represent the individual diagnostic precision of the sample uploaded above.
        </p>

        {pairedComparison ? (
          <div>
            <div className={styles.pairedGrid}>
              {pairedComparison.difference !== undefined && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Direct - Indirect Mean &Delta;</div>
                  <div className={styles.statValue}>{pairedComparison.difference}</div>
                </div>
              )}
              {pairedComparison.ci_95 && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>95% Confidence Interval</div>
                  <div className={styles.statValue}>
                    [{pairedComparison.ci_95[0]}, {pairedComparison.ci_95[1]}]
                  </div>
                </div>
              )}
              {pairedComparison.p_value !== undefined && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Paired p-value</div>
                  <div className={styles.statValue}>
                    {pairedComparison.p_value < 0.001 ? '< 0.001' : pairedComparison.p_value}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>Not yet evaluated.</strong>
            <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              No population-level paired comparison benchmark files have been logged to <code>outputs/metrics/*.json</code>.
            </p>
          </div>
        )}
      </div>

      {/* Feature 3: Reconstruction Fidelity Panel */}
      <div className={styles.fidelityPanel}>
        <h4 className={styles.fidelityTitle}>
          Reconstruction Fidelity
          <Tooltip
            term="Reconstruction Fidelity"
            text="Measures mathematical likeness between generated images and reference targets via pixel loss, signal-to-noise ratio, and structural patterns."
          />
        </h4>

        {reconstructionFidelity ? (
          <div>
            <div className={styles.pairedGrid}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>L1 Loss (Mean Pixel Absolute Difference)</div>
                <div className={styles.statValue}>{reconstructionFidelity.l1 ?? 'N/A'}</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>PSNR (Peak Signal-to-Noise Ratio)</div>
                <div className={styles.statValue}>
                  {reconstructionFidelity.psnr ? `${reconstructionFidelity.psnr} dB` : 'N/A'}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>SSIM (Structural Similarity Index)</div>
                <div className={styles.statValue}>{reconstructionFidelity.ssim ?? 'N/A'}</div>
              </div>
            </div>
            <div className={styles.fidelityCaveat}>
              <strong>Clinical & Anatomical Caution:</strong> Pixel-level fidelity metrics (L1, PSNR, SSIM) evaluate mathematical similarity across digital raster matrices. They do <strong>NOT</strong> prove or guarantee anatomical correctness of retinal microvasculature, foveal avascular zone margins, or optic nerve head cup-to-disc topography.
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <strong>Not yet evaluated.</strong>
            <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              No quantitative reconstruction fidelity benchmarks found in metrics storage. Per anti-hallucination rules, synthetic fidelity metrics are never fabricated.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

