import { describe, expect, it } from "vitest";

import {
  invoiceExportCsvQueryString,
  invoiceListQueryString,
  invoiceListToSearchParams,
} from "./query-params";

describe("invoiceListToSearchParams", () => {
  it("omits undefined and empty string", () => {
    const sp = invoiceListToSearchParams({
      page: 2,
      status: "",
      search: "acme",
      vendor: undefined,
    });
    expect(sp.get("page")).toBe("2");
    expect(sp.get("search")).toBe("acme");
    expect(sp.has("status")).toBe(false);
    expect(sp.has("vendor")).toBe(false);
  });

  it("includes validation and amount filters", () => {
    const sp = invoiceListToSearchParams({
      validation_status: "all_passed",
      min_amount: 10,
      max_amount: 100,
      confidence: 0.85,
    });
    expect(sp.get("validation_status")).toBe("all_passed");
    expect(sp.get("min_amount")).toBe("10");
    expect(sp.get("max_amount")).toBe("100");
    expect(sp.get("confidence")).toBe("0.85");
  });
});

describe("invoiceListQueryString", () => {
  it("applies default page and page_size", () => {
    const qs = invoiceListQueryString({ search: "x" });
    expect(qs).toContain("page=1");
    expect(qs).toContain("page_size=20");
    expect(qs).toContain("search=x");
  });
});

describe("invoiceExportCsvQueryString", () => {
  it("drops pagination and sort keys", () => {
    const qs = invoiceExportCsvQueryString({
      page: 3,
      page_size: 50,
      sort_by: "file_name",
      vendor: "ACME",
    });
    expect(qs).toContain("vendor=ACME");
    expect(qs).not.toContain("page=");
    expect(qs).not.toContain("page_size=");
    expect(qs).not.toContain("sort_by");
  });
});
