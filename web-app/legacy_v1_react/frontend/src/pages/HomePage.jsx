import React from 'react';
import { Link } from 'react-router-dom';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>
          Ophthalmic & Systemic Biomarker Research Prototype
        </h2>
        <p className={styles.subtitle}>
          An investigational engineering workbench exploring machine learning feasibility for predicting systemic and ocular biomarkers from non-invasive external-eye photography.
        </p>
      </header>

      {/* Mandatory Clinical Disclaimer Banner */}
      <section
        role="region"
        aria-label="Clinical Disclaimer"
        className={styles.disclaimerSection}
      >
        <h3 className={styles.disclaimerTitle}>
          Notice: Research Prototype. Not a Medical Diagnosis.
        </h3>
        <p className={styles.disclaimerText}>
          This software is designed solely for scientific research and algorithm validation. It is not approved by the FDA, EMA, or any healthcare regulatory authority as a clinical decision support tool or diagnostic device. It must never be used to guide patient diagnosis, screening, or management.
        </p>
      </section>

      {/* Central Research Question */}
      <section className={styles.questionSection}>
        <h3 className={styles.questionTitle}>
          Central Scientific Question
        </h3>
        <blockquote className={styles.quote}>
          "Does cross-modal synthetic fundus reconstruction add predictive value over direct end-to-end prediction from anterior ocular photographs?"
        </blockquote>
        <p className={styles.questionNote}>
          The outcome of this investigation may be negative: direct predictions may match or surpass indirect reconstruction without incurring the clinical risks of generative anatomical hallucination. This interface maintains strict neutrality and never implies that Pathway B is superior to Pathway A.
        </p>
      </section>

      {/* The Two Pathways Explained */}
      <section className={styles.pathwaysSection}>
        <h3 className={styles.pathwaysTitle}>
          Architectural Pathways Overview
        </h3>
        <div className={styles.pathwaysGrid}>
          
          <div className={styles.pathwayCard}>
            <h4 className={styles.pathwayCardTitle}>
              Pathway A: Direct Prediction
            </h4>
            <div className={styles.pipelineCode}>
              external-eye &rarr; preprocess &rarr; CNN encoder &rarr; head
            </div>
            <p className={styles.pathwayDesc}>
              Extracts systemic and ocular biomarker estimates directly from anterior ocular photography (palpebral conjunctiva, sclera, iris). Does not attempt to synthesize intermediate anatomical representations.
            </p>
          </div>

          <div className={styles.pathwayCard}>
            <h4 className={styles.pathwayCardTitle}>
              Pathway B: Indirect Translation
            </h4>
            <div className={styles.pipelineCode}>
              external-eye &rarr; fundus generator &rarr; synthetic fundus &rarr; predictor
            </div>
            <p className={styles.pathwayDesc}>
              Cross-modally translates external-eye imagery into a synthesized posterior fundus representation before prediction. Strictly gated: disabled if no verified paired patient cohort exists.
            </p>
          </div>

        </div>
      </section>

      {/* Optical and Biological Limitations Notice */}
      <section className={styles.limitationsSection}>
        <h3 className={styles.limitationsTitle}>
          Key Technical & Biological Limitations
        </h3>
        <ul className={styles.limitationsList}>
          <li>
            <strong>Optical Horizon:</strong> Standard external cameras capture anterior ocular structures only. There is zero direct optical path to posterior retinal vasculature, macula, or optic cup.
          </li>
          <li>
            <strong>Confounding Factors:</strong> Conjunctival pallor is sensitive to room lighting, flash reflections, camera color balance, ocular allergies, and baseline demographics.
          </li>
          <li>
            <strong>Hallucination Hazards:</strong> Generating fundus imagery from anterior photographs without matched patient pairs forces deep networks to invent retinal vessel geometry and lesions out of noise or prior distributions.
          </li>
        </ul>
      </section>

      <div className={styles.ctaWrapper}>
        <Link
          to="/workbench"
          className={styles.ctaBtn}
        >
          Launch Inference Workbench &rarr;
        </Link>
      </div>
    </div>
  );
}
