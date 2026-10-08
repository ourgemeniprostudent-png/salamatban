import type { ReactNode } from 'react';

/** Original Salamatban mark: a protective shield, a growing leaf and a care path. */
export function BrandMark({ className = '' }: { className?: string }) {
  return <svg className={`sb-brand-mark ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
    <path d="M24 3 41 9v14c0 10-7.2 17-17 22C14.2 40 7 33 7 23V9L24 3Z" fill="#346ED1" />
    <path d="M14 28c5-1 6-9 10-9 4 0 4 7 10 5" stroke="white" strokeWidth="3.3" strokeLinecap="round" />
    <path d="M25.5 17.5c-.5-5 2.4-8 7.5-8 .4 5-2.3 8-7.5 8Z" fill="#45CAF6" />
    <circle cx="15" cy="28" r="2.1" fill="white" />
    <circle cx="34" cy="24" r="2.1" fill="white" />
  </svg>;
}

const icons: Record<string, ReactNode> = {
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="m8 4 12 8-12 8V4Z" />,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /><path d="M9 14h6" /></>,
  heart: <path d="M20.8 5.7a5.1 5.1 0 0 0-7.2 0L12 7.3l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 21l8.8-8.1a5.1 5.1 0 0 0 0-7.2Z" />,
  route: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="M9 5h7a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h7" /></>,
  file: <><path d="M14 3H5v18h14V8l-5-5Z" /><path d="M14 3v5h5M8 12h8M8 16h6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18M7 14h2m4 0h2m-8 3h2" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.8 8.5a2.5 2.5 0 1 1 4.1 2c-1.4.9-1.9 1.4-1.9 2.7M12 16.5h.01" /></>,
  settings: <><path d="m9.5 3-.7 2.2-2 .9-2.2-.5-2.1 3.6L4 11v2l-1.5 1.8 2.1 3.6 2.2-.5 2 .9.7 2.2h5l.7-2.2 2-.9 2.2.5 2.1-3.6L20 13v-2l1.5-1.8-2.1-3.6-2.2.5-2-.9-.7-2.2Z" /><circle cx="12" cy="12" r="3" /></>,
  arrow: <path d="M20 12H4m6-6-6 6 6 6" />,
  chevron: <path d="m14 6-6 6 6 6" />,
  'chevron-right': <path d="m10 6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  shield: <><path d="M12 3 3 6v6c0 5 4 8 9 10 5-2 9-5 9-10V6l-9-3Z" /><path d="m8 12 3 3 5-6" /></>,
  logout: <><path d="M10 4H4v16h6M10 12h11m-4-4 4 4-4 4" /></>,
  search: <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" /></>,
  doctor: <><path d="M5 3v6a5 5 0 0 0 10 0V3M3 3h4m6 0h4M10 14v2a5 5 0 0 0 10 0v-3" /><circle cx="20" cy="10" r="2" /></>,
  users: <><circle cx="9" cy="7" r="3" /><path d="M3 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3" /></>,
  chart: <><path d="M4 3v18h17M8 16V9m5 7V5m5 11v-4" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  download: <><path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  phone: <path d="m7 3 3 5-3 2a13 13 0 0 0 7 7l2-3 5 3c0 2.6-1.8 4-4 4C9.3 21 3 14.7 3 7c0-2.2 1.4-4 4-4Z" />,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  brand: <><path d="M12 2 21 5v7c0 5-4 8-9 11C7 20 3 17 3 12V5l9-3Z" /><path d="M7 14c3 0 3-5 5-5s2 4 5 3M13 8c0-3 1-4 4-4 0 3-1 4-4 4Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
};

/** Decorative icons: supply an accessible label on the enclosing control. */
export function Icon({ name, size = 20, className = '' }: { name: string; size?: number; className?: string }) {
  return <svg className={`sb-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{icons[name] ?? icons.help}</svg>;
}
