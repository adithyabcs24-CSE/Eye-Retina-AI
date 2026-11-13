import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log sanitized error locally without leaking client data
    console.error('ErrorBoundary caught:', error?.message);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section
          role="alert"
          style={{
            padding: '2rem',
            margin: '2rem auto',
            maxWidth: '640px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger-text)'
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>An Unexpected Interface Error Occurred</h2>
          <p style={{ marginBottom: '1rem' }}>
            {this.state.error?.message || 'A client component failed to render.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-primary)',
              color: 'var(--color-text-inverse)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            Retry / Reload View
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

