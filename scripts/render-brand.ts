/**
 * Rasterize the mark in src/brand/mark.ts into favicon, Apple touch, Open Graph,
 * and preview PNGs. Run: node --experimental-strip-types scripts/render-brand.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MARK_GRADIENT,
  MARK_NODE_RADIUS,
  MARK_NODES,
  MARK_PATH,
  MARK_STROKE,
  MARK_VIEWBOX,
  WORDMARK_DONE,
  WORDMARK_GIT_ON_DARK,
  WORDMARK_GIT_ON_LIGHT,
} from "../src/brand/mark.ts";

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), "../package.json"));
const { chromium } = require("@playwright/test");

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const font = "file:///tmp/logo-tune/Roboto-Medium.ttf";
const outDir = "/opt/cursor/artifacts/logo";
const appDir = resolve(root, "src/app");

function svgMarkup(size: number) {
  const stops = MARK_GRADIENT.stops
    .map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`)
    .join("");
  const nodes = MARK_NODES.map(
    (node) => `<circle cx="${node.cx}" cy="${node.cy}" r="${MARK_NODE_RADIUS}" fill="url(#g)"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" fill="none">
  <defs>
    <linearGradient id="g" x1="${MARK_GRADIENT.x1}" y1="${MARK_GRADIENT.y1}" x2="${MARK_GRADIENT.x2}" y2="${MARK_GRADIENT.y2}" gradientUnits="userSpaceOnUse">
      ${stops}
    </linearGradient>
  </defs>
  <path d="${MARK_PATH}" stroke="url(#g)" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round"/>
  ${nodes}
</svg>`;
}

function iconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}" fill="none">
  <defs>
    <linearGradient id="g" x1="${MARK_GRADIENT.x1}" y1="${MARK_GRADIENT.y1}" x2="${MARK_GRADIENT.x2}" y2="${MARK_GRADIENT.y2}" gradientUnits="userSpaceOnUse">
      ${MARK_GRADIENT.stops.map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`).join("\n      ")}
    </linearGradient>
  </defs>
  <path d="${MARK_PATH}" stroke="url(#g)" stroke-width="${MARK_STROKE}" stroke-linecap="round" stroke-linejoin="round"/>
  ${MARK_NODES.map((node) => `<circle cx="${node.cx}" cy="${node.cy}" r="${MARK_NODE_RADIUS}" fill="url(#g)"/>`).join("\n  ")}
</svg>
`;
}

function page(body: string, background: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @font-face { font-family: Roboto; src: url("${font}"); font-weight: 500; }
  html, body { margin: 0; background: ${background}; }
  body { font-family: Roboto, sans-serif; }
</style></head><body>${body}</body></html>`;
}

function lockup(git: string, markSize: number, typeSize: number) {
  return `<div id="shot" style="display:inline-flex;align-items:center;gap:${Math.round(markSize * 0.22)}px;padding:${Math.round(markSize * 0.35)}px;background:transparent">
    ${svgMarkup(markSize)}
    <div style="font-size:${typeSize}px;line-height:0.9;font-weight:500;letter-spacing:-0.035em;color:${git}">Git<span style="color:${WORDMARK_DONE}">Done</span></div>
  </div>`;
}

async function shoot(
  pageObj: {
    setViewportSize: (size: { width: number; height: number }) => Promise<void>;
    setContent: (html: string, options: { waitUntil: "networkidle" }) => Promise<void>;
    evaluate: (fn: () => Promise<void>) => Promise<void>;
    locator: (selector: string) => { screenshot: (options: { path: string; omitBackground: boolean }) => Promise<void> };
    screenshot: (options: { path: string; omitBackground: boolean }) => Promise<void>;
  },
  html: string,
  file: string,
  viewport: { width: number; height: number },
  options: { omitBackground?: boolean; selector?: string } = {},
) {
  await pageObj.setViewportSize(viewport);
  await pageObj.setContent(html, { waitUntil: "networkidle" });
  await pageObj.evaluate(async () => {
    await document.fonts.ready;
  });
  if (options.selector) {
    await pageObj.locator(options.selector).screenshot({
      path: file,
      omitBackground: options.omitBackground ?? false,
    });
    return;
  }
  await pageObj.screenshot({ path: file, omitBackground: options.omitBackground ?? false });
}

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const tab = await browser.newPage({ deviceScaleFactor: 1 });

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(appDir, "icon.svg"), iconSvg());

const plates: Array<[string, string, number]> = [
  ["#100c0e", "mark-dark.png", 512],
  ["#f6f3ee", "mark-light.png", 512],
];
for (const [background, name, size] of plates) {
  await shoot(
    tab,
    page(`<div id="shot">${svgMarkup(size)}</div>`, background),
    resolve(outDir, name),
    { width: size, height: size },
  );
}

await shoot(
  tab,
  page(`<div id="shot">${svgMarkup(512)}</div>`, "transparent"),
  resolve(outDir, "mark-transparent.png"),
  { width: 512, height: 512 },
  { omitBackground: true },
);

for (const size of [16, 32]) {
  await shoot(
    tab,
    page(`<div id="shot">${svgMarkup(size)}</div>`, "transparent"),
    resolve(outDir, `favicon-${size}.png`),
    { width: size, height: size },
    { omitBackground: true },
  );
}

await shoot(
  tab,
  page(
    `<div id="shot" style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;background:#100c0e">${svgMarkup(112)}</div>`,
    "#100c0e",
  ),
  resolve(appDir, "apple-icon.png"),
  { width: 180, height: 180 },
);
await shoot(
  tab,
  page(
    `<div id="shot" style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;background:#100c0e">${svgMarkup(112)}</div>`,
    "#100c0e",
  ),
  resolve(outDir, "apple-touch-180.png"),
  { width: 180, height: 180 },
);

const og = page(
  `<div id="shot" style="width:1200px;height:630px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#100c0e;overflow:hidden">
    <div style="position:absolute;inset:0;background:
      radial-gradient(720px 380px at 92% -8%, rgba(252,109,38,0.28), transparent 62%),
      radial-gradient(680px 420px at -8% 112%, rgba(107,79,187,0.38), transparent 58%);"></div>
    <div style="position:relative;display:flex;align-items:center;gap:28px">
      ${svgMarkup(128)}
      <div style="font-size:92px;line-height:0.9;font-weight:500;letter-spacing:-0.04em;color:${WORDMARK_GIT_ON_DARK}">Git<span style="color:${WORDMARK_DONE}">Done</span></div>
    </div>
    <p style="position:relative;margin:36px 0 0;color:#c9bdb4;font-size:28px;letter-spacing:-0.01em">One labelled issue, across every DevSecOps stage, into production.</p>
  </div>`,
  "#100c0e",
);
await shoot(tab, og, resolve(appDir, "opengraph-image.png"), { width: 1200, height: 630 });
await shoot(tab, og, resolve(appDir, "twitter-image.png"), { width: 1200, height: 630 });
await shoot(tab, og, resolve(outDir, "og-1200x630.png"), { width: 1200, height: 630 });

await shoot(
  tab,
  page(lockup(WORDMARK_GIT_ON_DARK, 96, 72), "#100c0e"),
  resolve(outDir, "lockup-dark.png"),
  { width: 900, height: 240 },
  { selector: "#shot" },
);
await shoot(
  tab,
  page(lockup(WORDMARK_GIT_ON_LIGHT, 96, 72), "#f6f3ee"),
  resolve(outDir, "lockup-light.png"),
  { width: 900, height: 240 },
  { selector: "#shot" },
);

await browser.close();
console.log("wrote brand assets");
