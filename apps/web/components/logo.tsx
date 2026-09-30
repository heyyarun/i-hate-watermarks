// The site mark: angle brackets around a red dot, a hidden character revealed.
// Fixed brand colors so it matches app/icon.svg (the favicon) in both themes.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#17150f" />
      <rect x=".5" y=".5" width="31" height="31" rx="8.5" fill="none" stroke="#fff" strokeOpacity=".12" />
      <g fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="12,9.5 6.5,16 12,22.5" />
        <polyline points="20,9.5 25.5,16 20,22.5" />
      </g>
      <circle cx="16" cy="16" r="3" fill="#d4380d" />
    </svg>
  );
}
