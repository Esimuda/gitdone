import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const outDir = "/opt/cursor/artifacts/screenshots";

test.beforeAll(async () => {
  await mkdir(outDir, { recursive: true });
});

async function settle(page: import("@playwright/test").Page, ms = 400) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(ms);
}

/** Walk the page so in-view animations run, then return to the top. */
async function tour(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const scroller = document.scrollingElement ?? document.documentElement;
    const step = Math.max(240, window.innerHeight * 0.65);
    for (let y = 0; y <= scroller.scrollHeight; y += step) {
      scroller.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    }
    scroller.scrollTo(0, 0);
  });
}

test("capture desktop and mobile", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await tour(page);
  await settle(page, 1400);
  await expect(page.getByText("1 h 17 min").first()).toBeVisible();
  await expect(page.getByText("47 min").first()).toBeVisible();
  await expect(page.getByText("9/9").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Label one issue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One agent crosses nine stages" })).toBeVisible();
  await page.screenshot({ path: `${outDir}/landing-desktop.png`, fullPage: true });

  await page.goto("/mission");
  await expect(page.getByRole("heading", { name: "Mission control" })).toBeVisible();
  await settle(page, 1500);
  await page.screenshot({ path: `${outDir}/mission-desktop.png`, fullPage: true });

  await page.goto("/mission/142");
  await expect(page.getByRole("heading", { name: "Govern" })).toBeVisible();
  await settle(page, 1500);
  await page.screenshot({ path: `${outDir}/journey-desktop.png`, fullPage: true });

  await page.goto("/releases");
  await expect(page.getByRole("heading", { name: "Releases" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${outDir}/releases-desktop.png`, fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page, 3200);
  await page.screenshot({ path: `${outDir}/landing-mobile.png`, fullPage: true });

  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await settle(page);
  await page.screenshot({ path: `${outDir}/landing-mobile-light.png`, fullPage: true });
});
