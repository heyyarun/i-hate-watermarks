// The site mark: an invisible character, drawn as a text cursor, struck out.
// Fixed brand colors so it matches app/icon.svg (the favicon) in both themes.
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#d4380d" />
      <g fill="none" strokeLinecap="round">
        <path d="M13 8h6M13 24h6M16 8v16" stroke="#fff" strokeWidth="3" />
        <path d="M11.5 20.5 20.5 11.5" stroke="#d4380d" strokeWidth="5" />
        <path d="M11.5 20.5 20.5 11.5" stroke="#17150f" strokeWidth="3" />
      </g>
    </svg>
  );
}
