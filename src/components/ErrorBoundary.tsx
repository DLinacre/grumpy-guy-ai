import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          textAlign: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
          background: '#111110',
          color: '#f5f0e7',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            fontFamily: "'DM Mono', monospace",
            color: '#ff623d',
          }}>
            ಠ_ಠ
          </div>
          
          <h1 style={{
            fontSize: '28px',
            letterSpacing: '-1px',
            marginBottom: '16px',
          }}>
            Well, this is embarrassing.
          </h1>
          
          <p style={{
            color: '#bbb4ac',
            maxWidth: '400px',
            marginBottom: '32px',
            lineHeight: 1.5,
          }}>
            Something broke. Even the grumpy guy is speechless. 
            Try refreshing — it usually fixes things.
          </p>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              className="primary"
              style={{ padding: '13px 24px' }}
            >
              Try again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'transparent',
                color: '#f5f0e7',
                border: '1px solid #383431',
                padding: '13px 24px',
                borderRadius: '7px',
                cursor: 'pointer',
              }}
            >
              Refresh page
            </button>
          </div>
          
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              marginTop: '32px',
              padding: '16px',
              background: '#1d1c1a',
              borderRadius: '7px',
              fontSize: '12px',
              fontFamily: "'DM Mono', monospace",
              color: '#ff8a6f',
              maxWidth: '600px',
              overflow: 'auto',
              textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
