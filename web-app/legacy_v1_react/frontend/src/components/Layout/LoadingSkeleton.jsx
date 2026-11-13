import React from 'react';

export function LoadingSkeleton({ lines = 3, height = '1.5rem', width = '100%' }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading content"
      style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height,
            width: i === lines - 1 ? '70%' : width,
            backgroundColor: 'var(--color-surface-muted)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            opacity: 0.6
          }}
        />
      ))}
      <span style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        Loading data...
      </span>
    </div>
  );
}

