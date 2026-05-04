import { Link } from 'react-router-dom';

const ROOMS: Array<{ heading: string; rows: Array<{ label: string; href: string }> }> = [
  {
    heading: 'MANAGE',
    rows: [
      { label: 'ACCOUNTS & SYNC', href: '/settings/accounts' },
      { label: 'CATEGORIZATION', href: '/settings/categorization' },
      { label: 'PREFERENCES', href: '/settings/preferences' },
    ],
  },
  {
    heading: 'DATA',
    rows: [{ label: 'EXPORT', href: '/settings/export' }],
  },
  {
    heading: 'DANGER',
    rows: [
      { label: 'ACCOUNT', href: '/settings/account' },
      { label: 'DANGER ZONE', href: '/settings/danger' },
    ],
  },
];

/**
 * Placeholder hub — full identity hero / room rows / sticky logout footer
 * land in sub-checkpoint 10b. This 10a stub only ensures the route resolves
 * with discoverable links to the six sub-pages.
 */
export function SettingsHub() {
  return (
    <div className="flex flex-col">
      <h1 className="px-4 pt-4 pb-4 font-mono text-[24px] leading-tight tracking-tight text-textHi">
        SETTINGS
      </h1>
      <p className="px-4 pb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
        10a SCAFFOLD — HUB DESIGN LANDS IN 10b
      </p>
      <nav className="flex flex-col">
        {ROOMS.map((room) => (
          <section key={room.heading} className="border-t border-rule">
            <div className="px-4 pt-4 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-textLo">
              {room.heading}
            </div>
            {room.rows.map((row) => (
              <Link
                key={row.href}
                to={row.href}
                className="flex items-center justify-between px-4 py-3 font-mono text-[14px] text-textHi border-t border-rule active:opacity-60"
              >
                <span>{row.label}</span>
                <span className="text-textLo">›</span>
              </Link>
            ))}
          </section>
        ))}
      </nav>
    </div>
  );
}
