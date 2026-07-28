import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Top-level error boundary.
 *
 * The legacy app had none, so any render-time throw (most plausibly from corrupt
 * persisted state) unmounted the tree to a blank white page with no recovery path.
 * React 19 still requires a class component for `componentDidCatch`.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[boundary] Unhandled render error:', error, info.componentStack);
  }

  private readonly handleReset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div role="alert" className="mx-auto grid min-h-screen max-w-xl place-items-center p-8">
        <div className="text-center">
          <p className="font-mono text-xs leading-[normal] tracking-[1.3px] text-ember-soft">SOMETHING BROKE</p>
          <h1 className="mt-3 text-4xl font-bold tracking-[-2px]">
            Even he didn&apos;t see that coming.
          </h1>
          <p className="mt-4 text-quote">
            The interface hit an unexpected error. Your saved grumbles are untouched.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-6 rounded-md border-0 bg-ember px-5 py-3 font-bold text-espresso"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
