/**
 * GitDone mark. One centerline: a straight branch, a circular arc, then a check.
 * The arc has constant curvature, so the stroke stays smooth through the commit nodes.
 * Drawn by src/components/logo.tsx. Raster icons come from scripts/render-brand.ts.
 */

export const MARK_VIEWBOX = 64;
export const MARK_STROKE = 6.75;
export const MARK_NODE_RADIUS = 4.4;

const THETA = (42 * Math.PI) / 180;
const RADIUS = 15;
const PHI = (-52 * Math.PI) / 180;
const ARM = 17;
const TIP_LEN = 29.5;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

type Point = readonly [number, number];

const START: Point = [3.2, 28];
const ARC_START: Point = [17, 28];
const ARC_END: Point = [
  round2(ARC_START[0] + RADIUS * Math.sin(THETA)),
  round2(ARC_START[1] + RADIUS * (1 - Math.cos(THETA))),
];
const VERTEX: Point = [
  round2(ARC_END[0] + Math.cos(THETA) * ARM),
  round2(ARC_END[1] + Math.sin(THETA) * ARM),
];
const TIP: Point = [
  round2(VERTEX[0] + Math.cos(PHI) * TIP_LEN),
  round2(VERTEX[1] + Math.sin(PHI) * TIP_LEN),
];

export const MARK_PATH = `M${START[0]} ${START[1]}H${ARC_START[0]}A${RADIUS} ${RADIUS} 0 0 1 ${ARC_END[0]} ${ARC_END[1]}L${VERTEX[0]} ${VERTEX[1]}L${TIP[0]} ${TIP[1]}`;

const NODE_ALONG_ARM = 0.48;

export const MARK_NODES = [
  { cx: 12.6, cy: START[1] },
  {
    cx: round2(ARC_END[0] + (VERTEX[0] - ARC_END[0]) * NODE_ALONG_ARM),
    cy: round2(ARC_END[1] + (VERTEX[1] - ARC_END[1]) * NODE_ALONG_ARM),
  },
] as const;

/** Orange at the top of the check, purple at the vertex. */
export const MARK_GRADIENT = {
  x1: 32,
  y1: 16,
  x2: 32,
  y2: 48,
  stops: [
    { offset: 0, color: "#FC6D26" },
    { offset: 0.46, color: "#E04470" },
    { offset: 1, color: "#6B4FBB" },
  ],
} as const;

export const WORDMARK_DONE = "#FC6D26";
export const WORDMARK_GIT_ON_DARK = "#FFFFFF";
export const WORDMARK_GIT_ON_LIGHT = "#1C140F";

/** Polyline of the stroke centerline. Used to prove the nodes sit on the branch. */
export function markCenterline(steps = 48): Point[] {
  const points: Point[] = [];
  const shelfSteps = 10;
  for (let i = 0; i <= shelfSteps; i++) {
    const t = i / shelfSteps;
    points.push([START[0] + (ARC_START[0] - START[0]) * t, START[1]]);
  }
  for (let i = 1; i <= steps; i++) {
    const angle = (THETA * i) / steps;
    points.push([
      ARC_START[0] + RADIUS * Math.sin(angle),
      ARC_START[1] + RADIUS * (1 - Math.cos(angle)),
    ]);
  }
  const leg = 12;
  for (let i = 1; i <= leg; i++) {
    const t = i / leg;
    points.push([ARC_END[0] + (VERTEX[0] - ARC_END[0]) * t, ARC_END[1] + (VERTEX[1] - ARC_END[1]) * t]);
  }
  for (let i = 1; i <= leg; i++) {
    const t = i / leg;
    points.push([VERTEX[0] + (TIP[0] - VERTEX[0]) * t, VERTEX[1] + (TIP[1] - VERTEX[1]) * t]);
  }
  return points;
}

function distanceToSegment(x: number, y: number, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSq));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

export function distanceToCenterline(x: number, y: number): number {
  const points = markCenterline();
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const distance = distanceToSegment(x, y, points[i - 1], points[i]);
    if (distance < best) best = distance;
  }
  return best;
}
