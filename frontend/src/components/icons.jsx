import React from 'react';

function IconBase({ children, className = '', size = 20, strokeWidth = 1.9, ...props }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function RunAdvisorMark({ className = '', size = 22 }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 32 32"
      width={size}
    >
      <defs>
        <linearGradient id="runadvisorGradient" x1="4" x2="28" y1="4" y2="28">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect fill="#0f172a" height="28" rx="9" width="28" x="2" y="2" />
      <path
        d="M8 22c2.2-5.6 6.4-8.8 12.6-9.8M14.5 8.8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-1.2 2.4 2.7 2 2.7 1.1m-5.8-3.1-2 4.7m5.1-2.7-1 4.4m1-4.4 3.8 2.8m-7.3.7 3.2 1.2"
        stroke="url(#runadvisorGradient)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.1"
      />
      <path
        d="M8 24.5c4-.2 8.1-1.4 12.4-4.1"
        stroke="#f8fafc"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function SunIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6" />
    </IconBase>
  );
}

export function MoonIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 14.2A7.6 7.6 0 0 1 9.8 4 8.7 8.7 0 1 0 20 14.2Z" />
    </IconBase>
  );
}

export function InstallIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3v10.5" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M4 16.5v1.2A2.3 2.3 0 0 0 6.3 20h11.4a2.3 2.3 0 0 0 2.3-2.3v-1.2" />
    </IconBase>
  );
}

export function DashboardIcon(props) {
  return (
    <IconBase {...props}>
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="11" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="14" />
      <rect height="11" rx="1.5" width="7" x="3" y="10" />
    </IconBase>
  );
}

export function ActivityIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="14" cy="5.2" r="1.6" />
      <path d="m11 20 1.8-5.2 2.7 2.2 2 3M9.5 13.4l2.4-2.8 2.8 1.6 2.6.2M7 18.6l3.2-4.1M13.2 9.7l1.1-2.1 2.9 1.6" />
    </IconBase>
  );
}

export function CoachIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 18.5V7.8A2.8 2.8 0 0 1 6.8 5h10.4A2.8 2.8 0 0 1 20 7.8v10.7" />
      <path d="M8 9.2h8M8 13h5.5M7.5 21h9" />
      <path d="m17.7 15.8 1.4 1.4 2.4-2.8" />
    </IconBase>
  );
}

export function SyncIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M19 11a7 7 0 0 0-12-3.8L5 9" />
      <path d="M5 13a7 7 0 0 0 12 3.8L19 15" />
    </IconBase>
  );
}

export function DistanceIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 17.5c4-7.5 12.2-10.7 16-11.5" />
      <path d="M4 17.5c2.8-.5 6.5-.4 9.8 1.5" />
      <circle cx="18.2" cy="6.2" r="1.8" />
    </IconBase>
  );
}

export function ClockIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.7v4.8l3.1 1.8" />
    </IconBase>
  );
}

export function PaceIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5.5 16.5A7.5 7.5 0 1 1 18.8 9" />
      <path d="M12 12 16.8 9.2" />
      <path d="M4.5 18h15" />
    </IconBase>
  );
}

export function ElevationIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m3 18 5.2-7 3.2 4.2 3.2-5.3L21 18" />
      <path d="M15.5 7.2h3.8v3.8" />
    </IconBase>
  );
}

export function HeartIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 20s-6.8-4.2-8.3-8A4.7 4.7 0 0 1 12 7.7 4.7 4.7 0 0 1 20.3 12C18.8 15.8 12 20 12 20Z" />
    </IconBase>
  );
}

export function TargetIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="7.8" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function TrendIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 18h16" />
      <path d="m6.5 14.8 3.7-3.8 2.6 2.3 4.7-5.3" />
      <path d="M17.5 8h2.5v2.5" />
    </IconBase>
  );
}

export function CalendarIcon(props) {
  return (
    <IconBase {...props}>
      <rect height="15" rx="2.2" width="16" x="4" y="5" />
      <path d="M8 3.5v3M16 3.5v3M4 9.5h16" />
    </IconBase>
  );
}

export function TrailIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 18.5c3.4-5.3 8.6-7.3 16-11" />
      <path d="M6.2 18.5c2.4-.1 4.8.6 6.7 2" />
      <path d="M16.2 5.8 20 7.5l-1.7 3.8" />
    </IconBase>
  );
}

export function RecoveryIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 4.5c2.3 0 4 1.7 4 4 0-2.3 1.7-4 4-4s4 1.7 4 4c0 5.2-8 10.8-8 10.8S4 13.7 4 8.5c0-2.3 1.7-4 4-4Z" />
      <path d="M10 11.3h4M12 9.3v4" />
    </IconBase>
  );
}

export function WarningIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m12 4 8 14H4L12 4Z" />
      <path d="M12 9.3v4.5M12 17.2h.01" />
    </IconBase>
  );
}

export function CheckIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m5 12.5 4.1 4.1L19 7.8" />
    </IconBase>
  );
}

export function UploadIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 20.5V10" />
      <path d="m8 13.8 4-4 4 4" />
      <path d="M4 8.2V7A2.5 2.5 0 0 1 6.5 4.5h11A2.5 2.5 0 0 1 20 7v1.2" />
    </IconBase>
  );
}

export function DownloadIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 4.5v10.5" />
      <path d="m8 11.2 4 4 4-4" />
      <path d="M4 18v1A2.5 2.5 0 0 0 6.5 21.5h11A2.5 2.5 0 0 0 20 19v-1" />
    </IconBase>
  );
}

export function BoltIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M13.5 2.8 6 13h4.7L10.5 21.2 18 11h-4.7l.2-8.2Z" />
    </IconBase>
  );
}

export function OfflineIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4.8 9.2a10.3 10.3 0 0 1 14.4 0" />
      <path d="M7.9 12.4a6.1 6.1 0 0 1 8.2 0" />
      <path d="M10.8 15.6a2 2 0 0 1 2.4 0" />
      <path d="m3 3 18 18" />
    </IconBase>
  );
}
