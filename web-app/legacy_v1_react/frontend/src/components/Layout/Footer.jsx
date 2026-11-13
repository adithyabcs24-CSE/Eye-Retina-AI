import React from 'react';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <p className={styles.disclaimerBanner}>
        Research prototype. Not a medical diagnosis.
      </p>
      <p className={styles.noticeText}>
        This investigational tool is strictly for scientific methodology evaluation. It does not provide clinical diagnoses, screening, or medical advice. Images are evaluated in memory and never stored.
      </p>
    </footer>
  );
}
