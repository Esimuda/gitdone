import { expect, test } from "@playwright/test";

test("health endpoint", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe("ok");
  expect(body.service).toBe("GitDone");
});

test("landing tells the overnight path and marks sample data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("announced by morning");
  await expect(page.getByText("Sample data").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "GitDone" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Finding" }).first()).toBeVisible();
});

test("mission control shows the overnight path and the rollback count", async ({ page }) => {
  await page.goto("/mission");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("announced by morning");
  await expect(page.getByText("Issue to production")).toBeVisible();
  await expect(page.getByText("Findings auto-resolved")).toBeVisible();
  await expect(page.getByText("Rollbacks", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /CI token leaked into the production image/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Health probe deploy raised the error rate/ })).toBeVisible();
});

test("the overnight ship shows nine stages and zero touches", async ({ page }) => {
  await page.goto("/mission/214");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("production image");
  await expect(page.getByText("0 human touches").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Govern" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Secure" })).toBeVisible();
});

test("a rollback journey is distinct", async ({ page }) => {
  await page.goto("/mission/207");
  await expect(page.getByRole("heading", { name: "Rollback" })).toBeVisible();
  await expect(page.getByText("Rolled back").first()).toBeVisible();
  await expect(page.getByText(/previous revision/i).first()).toBeVisible();
});

test("release hub copies an announcement", async ({ page }) => {
  await page.goto("/releases");
  await expect(page.getByRole("heading", { name: "Releases" })).toBeVisible();
  await expect(page.getByText("v0.9.0").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Subscribe" })).toHaveCount(0);
  await page.getByRole("button", { name: "Copy X post" }).first().click();
  await expect(page.getByText("Copied").first()).toBeVisible();
});

test("rss feed lists the sample releases", async ({ request }) => {
  const response = await request.get("/feed.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  expect(xml).toContain("<rss");
  expect(xml).toContain("v0.9.0");
});
