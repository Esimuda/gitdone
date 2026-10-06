/**
 * Product mark. This is the only place the logo is drawn.
 * app/icon.svg mirrors it for the browser tab — replace both when the final logo arrives.
 */
const DOTS: [number, number][] = [
  [8, 8],
  [16, 8],
  [24, 8],
  [8, 16],
  [24, 16],
  [8, 24],
  [16, 24],
  [24, 24],
];

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      {DOTS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.15" fill="var(--background)" />
      ))}
      <circle cx="16" cy="16" r="2.15" fill="var(--primary)" />
    </svg>
  );
}
