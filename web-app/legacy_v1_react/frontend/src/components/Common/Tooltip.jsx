import React, { useState } from 'react';
import styles from './Tooltip.module.css';

export function Tooltip({ term, text }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={styles.container}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span
        tabIndex={0}
        role="button"
        aria-label={`Definition for ${term}`}
        className={styles.trigger}
      >
        ?
      </span>
      {visible && (
        <span role="tooltip" className={styles.content}>
          <strong>{term}:</strong> {text}
        </span>
      )}
    </span>
  );
}

