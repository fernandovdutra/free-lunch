import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from '@/components/redesign';
import { cn } from '@/lib/utils';

interface SettingsScreenProps {
  /** Page title rendered as the H1 hero. Already uppercased by the caller. */
  title: string;
  /** Children render below the title. No additional padding — child sections
   *  control their own spacing. */
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for /settings/* sub-pages. Renders an in-page back-breadcrumb
 * (`← SETTINGS › CURRENT`) and the page title. The hub itself (`/settings`)
 * does NOT use this wrapper — it renders its own layout.
 */
export function SettingsScreen({ title, children, className }: SettingsScreenProps) {
  const navigate = useNavigate();

  return (
    <div className={cn('flex flex-col', className)}>
      <Breadcrumb
        segments={[
          { label: 'SETTINGS', href: '/settings' },
          { label: title },
        ]}
        onBack={() => {
          void navigate('/settings');
        }}
        onSegmentClick={(href) => {
          void navigate(href);
        }}
      />
      <h1 className="px-4 pb-4 font-mono text-[24px] leading-tight tracking-tight text-textHi">
        {title}
      </h1>
      {children}
    </div>
  );
}
