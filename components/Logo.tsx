type LogoMarkProps = {
  size?: number;
  className?: string;
};

/** The CampusConnect badge mark: a chat bubble with the campus connection
 *  constellation (two neon nodes + one cyan node), echoing the app icon. */
export function LogoMark({ size = 40, className }: LogoMarkProps) {
  const id = "cc-mark-" + size;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="13"
        fill="#0B100C"
        stroke={`url(#${id})`}
        strokeWidth="1.5"
      />
      <path
        d="M13 17c0-2.2 1.8-4 4-4h14c2.2 0 4 1.8 4 4v9c0 2.2-1.8 4-4 4h-9l-6 5v-5c-1.7-.6-3-2.3-3-4.2V17Z"
        fill="rgba(57,255,20,0.08)"
        stroke="rgba(57,255,20,0.28)"
        strokeWidth="1.1"
      />
      <path
        d="M19 24 L24 19 L29 24"
        stroke="#39FF14"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M24 19 V27.5" stroke="#39FF14" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="24" cy="19" r="3.2" fill="#39FF14" />
      <circle cx="19" cy="24" r="3.2" fill="#39FF14" />
      <circle cx="29" cy="24" r="3.2" fill="#56E8F7" />
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#39FF14" />
          <stop offset="1" stopColor="#56E8F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">
        Campus<span className="logo-word-accent">Connect</span>
      </span>
    </span>
  );
}
