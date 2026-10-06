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

test("capture desktop and mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page, 1500);
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
  await settle(page, 1500);
  await page.screenshot({ path: `${outDir}/landing-mobile.png`, fullPage: true });

  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await settle(page);
  await page.screenshot({ path: `${outDir}/landing-mobile-light.png`, fullPage: true });
});
