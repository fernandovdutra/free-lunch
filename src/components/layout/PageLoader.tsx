import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  /** Fill the viewport (routes outside AppLayout); default fits the layout content area. */
  fullScreen?: boolean;
}

/** Shared Suspense fallback for lazy-loaded route chunks. */
export function PageLoader({ fullScreen = false }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={
        fullScreen
          ? 'flex min-h-screen items-center justify-center'
          : 'flex min-h-[40vh] items-center justify-center py-12'
      }
    >
      <Loader2 className="h-8 w-8 animate-spin text-textLo" />
    </div>
  );
}
