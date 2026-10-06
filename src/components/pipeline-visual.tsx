"use client";

import { STAGE_LABEL } from "@/lib/data/stages";
import { STAGE_IDS } from "@/lib/data/types";

const POINTS: [number, number][] = [
  [58, 168],
  [158, 140],
  [258, 104],
  [358, 128],
  [458, 82],
  [558, 116],
  [658, 74],
  [758, 102],
  [868, 62],
];

function smoothPath(points: [number, number][]) {
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    const c1x = current[0] + (next[0] - previous[0]) / 6;
    const c1y = current[1] + (next[1] - previous[1]) / 6;
    const c2x = next[0] - (after[0] - current[0]) / 6;
    const c2y = next[1] - (after[1] - current[1]) / 6;
    path += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${next[0]} ${next[1]}`;
  }
  return path;
}

const ROUTE = smoothPath(POINTS);

export function PipelineVisual() {
  return (
    <div className="pipeline-frame relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/70 p-3 shadow-[0_40px_120px_-48px_rgba(252,109,38,0.55)] sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_180px_at_12%_80%,rgba(252,109,38,0.16),transparent_70%),radial-gradient(380px_200px_at_90%_0%,rgba(107,79,187,0.2),transparent_68%)]" />
      <svg viewBox="0 0 940 230" className="relative h-auto w-full" role="img" aria-label="Nine DevSecOps stages lighting in order">
        <defs>
          <linearGradient id="pipe" x1="40" y1="180" x2="880" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#FC6D26" />
            <stop offset="0.55" stopColor="#E04470" />
            <stop offset="1" stopColor="#6B4FBB" />
          </linearGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={ROUTE} fill="none" stroke="currentColor" className="text-border" strokeWidth="8" strokeLinecap="round" />
        <path
          d={ROUTE}
          fill="none"
          stroke="url(#pipe)"
          strokeWidth="3.5"
          strokeLinecap="round"
          pathLength={1}
          className="pipeline-draw"
        />
        {POINTS.map(([x, y], index) => (
          <g key={STAGE_IDS[index]} className="pipeline-node" style={{ animationDelay: `${0.28 + index * 0.26}s` }}>
            <circle cx={x} cy={y} r="16" fill="var(--card)" stroke="url(#pipe)" strokeWidth="2.5" filter="url(#glow)" />
            <circle cx={x} cy={y} r="5" fill="url(#pipe)" />
            <text
              x={x}
              y={y + 36}
              textAnchor="middle"
              className="fill-foreground"
              style={{ fontSize: 13, fontFamily: "var(--font-roboto), sans-serif" }}
            >
              {STAGE_LABEL[STAGE_IDS[index]]}
            </text>
          </g>
        ))}
        <circle r="7" fill="#FC6D26" opacity="0" className="pipeline-packet" filter="url(#glow)">
          <animate attributeName="opacity" from="0" to="1" begin="2.4s" dur="0.2s" fill="freeze" />
          <animateMotion dur="6.5s" begin="2.4s" repeatCount="indefinite" path={ROUTE} />
        </circle>
      </svg>
    </div>
  );
}
