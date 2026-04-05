import { test, expect } from "@playwright/test";

/**
 * Smoke: list route renders without JS errors (API may be down — then error state is ok).
 */
test.describe("US1 invoice review", () => {
  test("invoices page loads heading", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
  });
});
