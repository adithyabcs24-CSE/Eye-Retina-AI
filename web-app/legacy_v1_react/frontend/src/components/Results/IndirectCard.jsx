import React from 'react';
import styles from './IndirectCard.module.css';

export function IndirectCard({ result, targetMeta, pathwayBAvailable }) {
  if (!pathwayBAvailable) {
    return (
      <article
        aria-labelledby="indirect-card-title"
        className={styles.card}
      >
        <div className={styles.headerRow}>
          <h3 id="indirect-card-title" className={styles.title}>
            Pathway B (Indirect Reconstruction)
          </h3>
          <span className={styles.badgeUnavailable}>
            UNAVAILABLE
          </span>
        </div>

        <p className={styles.pipelineDesc}>
          Pipeline: <code>external-eye &rarr; fundus generator &rarr; synthetic fundus &rarr; predictor</code>
        </p>

        <div className={styles.blockedBanner}>
          <p className={styles.blockedTitle}>Pathway B is Formally Blocked</p>
          <p className={styles.blockedText}>
            No verified, patient-matched external-eye + fundus dataset has been established. Cross-modal retinal image generation is strictly disabled to prevent generative anatomical hallucinations and false clinical assurances.
          </p>
        </div>
      </article>
    );
  }

  const isStub = result?.status === 'stub';
  const targetLabel = targetMeta?.label || result?.target_id;
  const units = result?.units ? ` ${result.units}` : '';

  return (
    <article
      aria-labelledby="indirect-card-title"
      className={styles.card}
    >
      <div className={styles.headerRow}>
        <h3 id="indirect-card-title" className={styles.title}>
          Pathway B (Indirect Reconstruction)
        </h3>
        <span className={isStub ? styles.badgeStub : styles.badgeLoaded}>
          {isStub ? 'STUB' : 'LOADED'}
        </span>
      </div>

      <p className={styles.pipelineDesc}>
        Pipeline: <code>external-eye &rarr; fundus generator &rarr; synthetic fundus &rarr; predictor</code>
      </p>

      {/* Generated image preview with permanent non-removable disclaimer */}
      <div className={styles.canvasContainer}>
        {result?.generated_image ? (
          <img
            src={`data:image/png;base64,${result.generated_image}`}
            alt="AI-generated synthetic fundus reconstruction"
            className={styles.fundusImage}
          />
        ) : (
          <div className={styles.emptyCanvasPlaceholder}>
            [Synthetic Fundus Canvas - No Generator Checkpoint Loaded]
          </div>
        )}
        {/* Permanent Non-removable Label per Anti-Hallucination Rule 10 */}
        <div className={styles.permanentDisclaimer}>
          AI-generated. May not reflect the real retina.
        </div>
      </div>

      {isStub ? (
        <div className={styles.stubBanner}>
          <strong>Demo mode: no trained model loaded.</strong> Point estimate is null.
        </div>
      ) : (
        <div className={styles.estimateBox}>
          <span className={styles.estimateLabel}>
            {targetLabel} (Fundus Representation Prediction)
          </span>
          <span className={styles.estimateVal}>
            {result?.prediction !== null && result?.prediction !== undefined ? `${result.prediction}${units}` : 'Not Available'}
          </span>
        </div>
      )}

      <dl className={styles.metaList}>
        <div className={styles.metaRow}>
          <dt className={styles.dt}>Target Biomarker:</dt>
          <dd className={styles.dd}>{targetLabel}</dd>
        </div>
        <div className={styles.metaRow}>
          <dt className={styles.dt}>Generator Model:</dt>
          <dd className={styles.code}>{result?.model_version || 'N/A'}</dd>
        </div>
      </dl>
    </article>
  );
}
