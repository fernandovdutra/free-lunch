import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetPortal = DialogPrimitive.Portal;
const SheetClose = DialogPrimitive.Close;

/**
 * Tracks the on-screen keyboard via the visualViewport API so a bottom-anchored
 * sheet can lift above it. Returns the keyboard's vertical inset (px) and the
 * current visible viewport height. Falls back to 0 / window.innerHeight when
 * visualViewport isn't available (older browsers, SSR).
 */
function useKeyboardInset() {
  const [inset, setInset] = React.useState(0);
  const [visibleHeight, setVisibleHeight] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const next = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setInset(next);
      setVisibleHeight(vv.height);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return { inset, visibleHeight };
}

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-bg/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-180',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  const { inset, visibleHeight } = useKeyboardInset();
  const keyboardOpen = inset > 0;

  // When the keyboard is up, lift the sheet above it and cap its height to
  // 85% of the *visible* area so the top of the sheet stays on screen.
  // Also drop the safe-area bottom padding because the home indicator isn't
  // visible while the keyboard is showing.
  const dynamicStyle: React.CSSProperties = {
    bottom: inset,
    paddingBottom: keyboardOpen ? 0 : 'env(safe-area-inset-bottom)',
    ...(visibleHeight !== null
      ? { maxHeight: `${Math.floor(visibleHeight * 0.85)}px` }
      : {}),
    ...style,
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'fixed inset-x-0 z-50 flex max-h-[85vh] flex-col rounded-t-sheet border-t border-rule bg-surface',
          'data-[state=open]:animate-sheet-up data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=closed]:duration-180 data-[state=closed]:ease-ct-out',
          className
        )}
        style={dynamicStyle}
        {...props}
      >
        <div className="flex justify-center pt-2">
          <span aria-hidden className="h-1 w-10 rounded-full bg-textDim" />
        </div>
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  );
});
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex items-center justify-between gap-2 px-4 pb-3 pt-2 text-textHi',
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'font-mono text-[10px] uppercase tracking-[0.12em] text-textLo',
      className
    )}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('font-mono text-[10px] uppercase tracking-[0.12em] text-textLo', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto', className)} {...props} />
);
SheetBody.displayName = 'SheetBody';

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
};
