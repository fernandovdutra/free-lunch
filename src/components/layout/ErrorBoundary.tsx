import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { PhosphorButton } from '@/components/redesign';

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * When a boundary has tripped, changing this value resets it and re-renders
   * children. Used by RouteErrorBoundary to recover on navigation.
   */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render/lifecycle errors in its subtree and shows a friendly
 * fallback instead of blanking the app (see the localStorage-purge incident
 * documented in App.tsx: a formatter throw during render once took down the
 * whole app).
 *
 * Also catches lazy-route chunk load failures (e.g. a stale deploy where old
 * chunk URLs 404), for which "Reload app" fetches the fresh index.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep render crashes visible in the console for debugging/monitoring.
    console.error('ErrorBoundary caught a render error:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error !== null && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;

    if (error === null) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-6 px-5 py-12 text-center"
      >
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.12em] text-warn">
            ▲ Something went wrong
          </p>
          <p className="mt-3 max-w-[320px] break-words font-mono text-[11px] leading-relaxed text-textLo">
            {error.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <div className="flex w-full max-w-[240px] flex-col gap-3">
          <PhosphorButton onClick={this.handleReset}>Try again</PhosphorButton>
          <PhosphorButton variant="warn" onClick={this.handleReload}>
            Reload app
          </PhosphorButton>
        </div>
      </div>
    );
  }
}

/**
 * Route-level boundary: a crash in one page keeps the nav/layout alive, and
 * navigating to another route automatically resets the tripped boundary.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  // location.key changes on EVERY navigation (including re-tapping the same
  // nav item or a search-param-only change), so any navigation recovers a
  // tripped boundary — pathname alone would miss same-path navigations.
  const { key } = useLocation();
  return <ErrorBoundary resetKey={key}>{children}</ErrorBoundary>;
}
