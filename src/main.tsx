import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { ErrorBoundary } from './shared/ui/error-boundary';
import './app/styles.css';

/**
 * Entry point.
 *
 * Differences from the legacy entry:
 *  - The root element is checked instead of asserted with `!`, so a malformed
 *    index.html produces a clear message rather than "Cannot read properties of null".
 *  - The dead `QueryClientProvider` is gone: no query or mutation was ever issued
 *    through it, so it only added bundle weight and an inline `new QueryClient()`
 *    allocated on every evaluation.
 *  - An ErrorBoundary now contains render failures.
 */
const container = document.getElementById('root');

if (!container) {
  throw new Error('[main] Root element #root was not found in the document.');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
