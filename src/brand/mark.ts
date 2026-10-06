/**
 * GitDone mark. One centerline: a branch with two commit nodes that bends into a check.
 * Drawn by src/components/logo.tsx. Raster icons are generated from these numbers
 * by scripts/render-brand.ts.
 */

export const MARK_VIEWBOX = 64;
export const MARK_STROKE = 6.75;
export const MARK_NODE_RADIUS = 5.15;

/** Shelf, then a tangent-matched curve into the short arm, then the long arm. */
const START = [4.5, 20] as const;
const SHELF = [15, 20] as const;
const C1 = [23, 20] as const;
const C2 = [17.16, 32.94] as const;
const ELBOW = [23.85, 38.96] as const;
const VERTEX = [35, 49] as const;
const TIP = [58, 14.5] as const;

export const MARK_PATH = `M${START[0]} ${START[1]}H${SHELF[0]}C${C1[0]} ${C1[1]} ${C2[0]} ${C2[1]} ${ELBOW[0]} ${ELBOW[1]}L${VERTEX[0]} ${VERTEX[1]}L${TIP[0]} ${TIP[1]}`;

export const MARK_NODES = [
  { cx: 14.2, cy: 20 },
  { cx: 25.63, cy: 40.57 },
] as const;

/** Orange at the top of the check, purple at the vertex. */
export const MARK_GRADIENT = {
  x1: 32,
  y1: 11,
  x2: 32,
  y2: 52,
  stops: [
    { offset: 0, color: "#FC6D26" },
    { offset: 0.46, color: "#E04470" },
    { offset: 1, color: "#6B4FBB" },
  ],
} as const;

export const WORDMARK_DONE = "#FC6D26";
export const WORDMARK_GIT_ON_DARK = "#FFFFFF";
export const WORDMARK_GIT_ON_LIGHT = "#1C140F";

type Point = readonly [number, number];

function cubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return [
    u ** 3 * p0[0] + 3 * u ** 2 * t * p1[0] + 3 * u * t ** 2 * p2[0] + t ** 3 * p3[0],
    u ** 3 * p0[1] + 3 * u ** 2 * t * p1[1] + 3 * u * t ** 2 * p2[1] + t ** 3 * p3[1],
  ];
}

/** Polyline of the stroke centerline. Used to prove the nodes sit on the branch. */
export function markCenterline(steps = 48): Point[] {
  const points: Point[] = [];
  const shelfSteps = 8;
  for (let i = 0; i <= shelfSteps; i++) {
    const t = i / shelfSteps;
    points.push([START[0] + (SHELF[0] - START[0]) * t, START[1]]);
  }
  for (let i = 1; i <= steps; i++) points.push(cubic(SHELF, C1, C2, ELBOW, i / steps));
  const leg = 12;
  for (let i = 1; i <= leg; i++) {
    const t = i / leg;
    points.push([ELBOW[0] + (VERTEX[0] - ELBOW[0]) * t, ELBOW[1] + (VERTEX[1] - ELBOW[1]) * t]);
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
