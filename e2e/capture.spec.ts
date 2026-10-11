import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const outDir = "/opt/cursor/artifacts/screenshots";
const artifactDir = "/opt/cursor/artifacts";

test.beforeAll(async () => {
  await mkdir(outDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
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
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await tour(page);
  await settle(page, 1400);
  await expect(page.getByText("1 h 11 min").first()).toBeVisible();
  await expect(page.getByText("52 min").first()).toBeVisible();
  await expect(page.getByText("9/9").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finding" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Announced" }).first()).toBeVisible();
  await expect(page.getByText("Sample data").first()).toBeVisible();
  await page.screenshot({ path: `${artifactDir}/landing.png`, fullPage: true });
  await page.screenshot({ path: `${outDir}/landing-desktop.png`, fullPage: true });

  await page.goto("/mission");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("announced by morning");
  await settle(page, 1500);
  await page.screenshot({ path: `${artifactDir}/mission.png`, fullPage: true });
  await page.screenshot({ path: `${outDir}/mission-desktop.png`, fullPage: true });

  await page.goto("/mission/214");
  await expect(page.getByRole("heading", { name: "Approval" })).toBeVisible();
  await expect(page.getByText("The one human touch")).toBeVisible();
  await expect(page.getByText(/Olabowale Babalola merged/).first()).toBeVisible();
  await settle(page, 1500);
  await page.screenshot({ path: `${artifactDir}/approval.png`, fullPage: true });
  await page.screenshot({ path: `${outDir}/journey-desktop.png`, fullPage: true });

  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sign in with GitLab");
  await expect(page.locator("#content").getByRole("link", { name: "Sign in with GitLab" })).toBeVisible();
  await settle(page, 600);
  await page.screenshot({ path: `${artifactDir}/signin.png`, fullPage: true });

  const cookie = execFileSync("node", ["--experimental-strip-types", "scripts/seed-screenshot-session.ts"], {
    encoding: "utf8",
  }).trim();
  await page.context().addCookies([
    { name: "gitdone_session", value: cookie, url: "http://127.0.0.1:3847", httpOnly: true, sameSite: "Lax" },
  ]);
  await page.goto("/connect");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Connect your first project");
  await expect(page.getByText("approve with one click").first()).toBeVisible();
  await settle(page, 800);
  await page.screenshot({ path: `${artifactDir}/onboarding.png`, fullPage: true });

  await page.goto("/mission/207");
  await expect(page.getByRole("heading", { name: "Rollback" })).toBeVisible();
  await expect(page.getByText("Rolled back").first()).toBeVisible();
  await settle(page, 1200);
  await page.screenshot({ path: `${artifactDir}/rollback.png`, fullPage: true });

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
