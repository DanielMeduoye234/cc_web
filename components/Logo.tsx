type LogoMarkProps = {
  size?: number;
  className?: string;
};

/** The CampusConnect badge mark — the shared campus-logo.png used across the
 *  whole project (app icon, splash, favicon, and here in the web UI). */
export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/campus-logo.png"
      width={size}
      height={size}
      alt="CampusConnect"
      className={className}
      style={{ display: "block", objectFit: "contain" }}
    />
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
