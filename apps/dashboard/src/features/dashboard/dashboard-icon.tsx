import type { ReactNode, SVGProps } from 'react';

export type DashboardIconName =
  | 'activity'
  | 'alert-circle'
  | 'arrow-up-right'
  | 'bell'
  | 'calendar'
  | 'check'
  | 'chevron-right'
  | 'device'
  | 'download'
  | 'home'
  | 'inbox'
  | 'logout'
  | 'plug'
  | 'receipt'
  | 'refresh'
  | 'search'
  | 'shield'
  | 'team'
  | 'ticket'
  | 'wallet'
  | 'wifi'
  | 'wifi-off'
  | 'x';

interface DashboardIconProps extends SVGProps<SVGSVGElement> {
  name: DashboardIconName;
}

export function DashboardIcon({ name, ...props }: DashboardIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}

const iconPaths: Record<DashboardIconName, ReactNode> = {
  activity: <path d="M3 12h4l2.25-7 5.5 14L17 12h4" />,
  'arrow-up-right': (
    <>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  device: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M10 5h4M11 18h2" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M14 3h4a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-4" />
    </>
  ),
  plug: (
    <>
      <path d="m8 12 8-8M14 4l6 6M5 15l4 4" />
      <path d="M11 7 5 13a4 4 0 0 0 6 6l6-6" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  team: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 5h16v4a3 3 0 0 0 0 6v4H4v-4a3 3 0 0 0 0-6V5Z" />
      <path d="M13 8v2M13 14v2" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h16v10a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V6" />
      <path d="M16 14h2" />
    </>
  ),
  'alert-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 11h4l2 3h6l2-3h4" />
      <path d="M5.5 5h13l2 6v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-7l2-6Z" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16m0 5v-5h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 13a11 11 0 0 1 14 0M8.5 16.5a6 6 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </>
  ),
  'wifi-off': (
    <>
      <path d="M3 3l18 18" />
      <path d="M5 13a11 11 0 0 1 5.3-3M18.9 12.9A11 11 0 0 0 16 10.7" />
      <path d="M8.5 16.5a6 6 0 0 1 4-1.7M12 20h.01" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
};
