import { test, expect } from "@playwright/test";

/** Tiny valid-enough PDF bytes for the file input (drop zone skips zero-byte files). */
const MINIMAL_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 0\ntrailer<</Root 1 0 R>>\n%%EOF\n",
);

test.describe("US2 upload", () => {
  test("upload page shows drop zone and options", async ({ page }) => {
    await page.goto("/upload");
    await expect(page.getByRole("heading", { name: "Upload" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Drop invoice files here" })).toBeVisible();
    // Card title is a styled div, not a heading role
    await expect(page.getByText("Options", { exact: true })).toBeVisible();
  });

  test("submit surfaces API error (mocked)", async ({ page }) => {
    await page.route("**/api/v1/uploads", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "upstream unavailable" }),
      });
    });

    await page.goto("/upload");
    await page.getByTestId("invoice-file-input").setInputFiles({
      name: "minimal.pdf",
      mimeType: "application/pdf",
      buffer: MINIMAL_PDF,
    });
    const submit = page.getByRole("button", { name: "Upload" });
    await expect(page.getByText(/1 file selected/)).toBeVisible();
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(page.getByText("upstream unavailable")).toBeVisible();
  });
});
