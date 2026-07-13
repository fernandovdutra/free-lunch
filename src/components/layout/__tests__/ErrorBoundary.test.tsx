import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { lazy, Suspense } from 'react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ErrorBoundary, RouteErrorBoundary } from '../ErrorBoundary';

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('kaboom from render');
  }
  return <div>recovered content</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs caught render errors (and our componentDidCatch does too);
    // keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>happy path</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('happy path')).toBeTruthy();
  });

  it('renders the fallback with the error message when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.getByText('kaboom from render')).toBeTruthy();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /reload app/i })).toBeTruthy();
  });

  it('re-renders children after "Try again" once the cause is fixed', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeTruthy();

    // Fix the underlying condition, then reset the boundary.
    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('recovered content')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reloads the app when "Reload app" is clicked', () => {
    const reload = vi.fn();
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { reload } as unknown as Location,
    });

    try {
      render(
        <ErrorBoundary>
          <Boom shouldThrow />
        </ErrorBoundary>
      );
      fireEvent.click(screen.getByRole('button', { name: /reload app/i }));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it('catches a lazy chunk load failure and offers reload (stale-deploy scenario)', async () => {
    const BrokenChunk = lazy(() =>
      Promise.reject(new Error('Failed to fetch dynamically imported module'))
    );

    render(
      <ErrorBoundary>
        <Suspense fallback={<div>loading…</div>}>
          <BrokenChunk />
        </Suspense>
      </ErrorBoundary>
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /reload app/i })).toBeTruthy();
  });

  it('renders a lazy page through Suspense once its chunk resolves', async () => {
    const LazyPage = lazy(() =>
      Promise.resolve({ default: () => <div>lazy page content</div> })
    );

    render(
      <ErrorBoundary>
        <Suspense fallback={<div>loading…</div>}>
          <LazyPage />
        </Suspense>
      </ErrorBoundary>
    );

    expect(screen.getByText('loading…')).toBeTruthy();
    expect(await screen.findByText('lazy page content')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function GoElsewhere() {
    const navigate = useNavigate();
    return (
      <button
        onClick={() => {
          void navigate('/good');
        }}
      >
        go elsewhere
      </button>
    );
  }

  it('keeps surrounding UI alive and resets on navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/bad']}>
        <GoElsewhere />
        <RouteErrorBoundary>
          <Routes>
            <Route path="/bad" element={<Boom shouldThrow />} />
            <Route path="/good" element={<div>good page</div>} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>
    );

    // Crash is contained: fallback shows, but content outside the boundary
    // (the nav) is still interactive.
    expect(screen.getByRole('alert')).toBeTruthy();
    const nav = screen.getByRole('button', { name: /go elsewhere/i });

    fireEvent.click(nav);

    // Navigating away resets the boundary and renders the new route.
    expect(await screen.findByText('good page')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
