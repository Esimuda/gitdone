import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  MARK_GRADIENT,
  MARK_NODE_RADIUS,
  MARK_NODES,
  MARK_PATH,
  MARK_STROKE,
  MARK_VIEWBOX,
  distanceToCenterline,
} from "@/brand/mark";

describe("mark geometry", () => {
  it("keeps two commit nodes on the branch, clear of each other and the vertex", () => {
    expect(MARK_NODES).toHaveLength(2);
    const [first, second] = MARK_NODES;
    expect(distanceToCenterline(first.cx, first.cy)).toBeLessThan(0.35);
    expect(distanceToCenterline(second.cx, second.cy)).toBeLessThan(0.35);
    const separation = Math.hypot(first.cx - second.cx, first.cy - second.cy);
    expect(separation).toBeGreaterThan(MARK_NODE_RADIUS * 2 + 2);
    for (const node of MARK_NODES) {
      expect(node.cx - MARK_NODE_RADIUS).toBeGreaterThan(MARK_STROKE / 2);
      expect(node.cx + MARK_NODE_RADIUS).toBeLessThan(MARK_VIEWBOX - 2);
      expect(node.cy - MARK_NODE_RADIUS).toBeGreaterThan(2);
      expect(node.cy + MARK_NODE_RADIUS).toBeLessThan(MARK_VIEWBOX - 2);
    }
  });

  it("uses the orange-to-purple brand gradient", () => {
    const colors = MARK_GRADIENT.stops.map((stop) => stop.color);
    expect(colors[0]).toBe("#FC6D26");
    expect(colors.at(-1)).toBe("#6B4FBB");
  });

  it("mirrors the same path into the favicon", () => {
    const icon = readFileSync(new URL("../app/icon.svg", import.meta.url), "utf8");
    expect(icon).toContain(MARK_PATH);
    expect(icon).toContain('stroke-width="6.75"');
    for (const node of MARK_NODES) {
      expect(icon).toContain(`cx="${node.cx}"`);
      expect(icon).toContain(`cy="${node.cy}"`);
    }
  });
});
