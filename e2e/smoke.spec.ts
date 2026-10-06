import { expect, test } from "@playwright/test";

test("health endpoint", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("GitDone");
});

test("landing explains the loop and shows demo data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Come back to a release");
  await expect(page.getByText("Demo data.")).toBeVisible();
  await expect(page.getByRole("link", { name: "GitDone" })).toBeVisible();
});

test("mission control shows the four metrics", async ({ page }) => {
  await page.goto("/mission");
  await expect(page.getByRole("heading", { name: "Mission control" })).toBeVisible();
  await expect(page.getByText("Issue to production")).toBeVisible();
  await expect(page.getByText("Findings auto-resolved")).toBeVisible();
  await expect(page.getByRole("link", { name: /Rate-limit the public RPC proxy/ })).toBeVisible();
});

test("a shipped issue shows all nine stages and zero touches", async ({ page }) => {
  await page.goto("/mission/142");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("session-expiry");
  await expect(page.getByText("0 human touches").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Govern" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Secure" })).toBeVisible();
});

test("release hub copies an announcement", async ({ page }) => {
  await page.goto("/releases");
  await expect(page.getByRole("heading", { name: "Releases" })).toBeVisible();
  await expect(page.getByText("v0.4.2").first()).toBeVisible();
  await page.getByRole("button", { name: "Copy X post" }).first().click();
  await expect(page.getByText("Copied").first()).toBeVisible();
});

test("rss feed lists the demo releases", async ({ request }) => {
  const response = await request.get("/feed.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  expect(xml).toContain("<rss");
  expect(xml).toContain("v0.4.2");
});
