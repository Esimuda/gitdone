import { useId } from "react";
import {
  MARK_GRADIENT,
  MARK_NODES,
  MARK_PATH,
  MARK_STROKE,
  MARK_VIEWBOX,
  MARK_NODE_RADIUS,
  WORDMARK_DONE,
} from "@/brand/mark";
import { cn } from "@/lib/utils";

/**
 * The product mark. Pass `draw` on the landing hero for a single stroke animation.
 * Navigation and other chrome stay static. The animation is CSS, and it does not
 * run when the visitor prefers reduced motion.
 */
export function LogoMark({ className, draw = false }: { className?: string; draw?: boolean }) {
  const rawId = useId().replace(/:/g, "");
  const gradientId = `gitdone-${rawId}`;

  return (
    <svg
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1={MARK_GRADIENT.x1}
          y1={MARK_GRADIENT.y1}
          x2={MARK_GRADIENT.x2}
          y2={MARK_GRADIENT.y2}
          gradientUnits="userSpaceOnUse"
        >
          {MARK_GRADIENT.stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>
      <path
        d={MARK_PATH}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={MARK_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={draw ? 1 : undefined}
        className={draw ? "logo-draw" : undefined}
      />
      {MARK_NODES.map((node, index) => (
        <circle
          key={`${node.cx}-${node.cy}`}
          cx={node.cx}
          cy={node.cy}
          r={MARK_NODE_RADIUS}
          fill={`url(#${gradientId})`}
          className={draw ? `logo-node logo-node-${index + 1}` : undefined}
        />
      ))}
    </svg>
  );
}

/** Git in the current foreground, Done in brand orange. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-medium tracking-tight", className)}>
      <span>Git</span>
      <span style={{ color: WORDMARK_DONE }}>Done</span>
    </span>
  );
}

export function LogoLockup({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("size-8", markClassName)} />
      <Wordmark />
    </span>
  );
}
