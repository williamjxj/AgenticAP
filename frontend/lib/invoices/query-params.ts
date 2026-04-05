/**
 * Build query strings for invoice list + CSV export (keys match FastAPI `list_invoices`).
 */

export type InvoiceListQueryInput = {
  page?: number;
  page_size?: number;
  status?: string;
  search?: string;
  vendor?: string;
  min_amount?: number;
  max_amount?: number;
  confidence?: number;
  validation_status?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: string;
};

/**
 * Serializes invoice list params to `URLSearchParams` (omits undefined / empty string).
 */
export function invoiceListToSearchParams(input: InvoiceListQueryInput): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === "") continue;
    if (typeof value === "number" && Number.isNaN(value)) continue;
    sp.set(key, String(value));
  }
  return sp;
}

/**
 * Query string for `GET /api/v1/invoices` including pagination defaults.
 */
export function invoiceListQueryString(input: InvoiceListQueryInput): string {
  const merged: InvoiceListQueryInput = {
    page: input.page ?? 1,
    page_size: input.page_size ?? 20,
    ...input,
  };
  const qs = invoiceListToSearchParams(merged).toString();
  return qs ? `?${qs}` : "";
}

/**
 * Query string for `GET /api/v1/invoices/export/csv` (no pagination keys).
 */
export function invoiceExportCsvQueryString(input: InvoiceListQueryInput): string {
  const { page, page_size, sort_by, sort_order, ...rest } = input;
  void page;
  void page_size;
  void sort_by;
  void sort_order;
  const qs = invoiceListToSearchParams(rest).toString();
  return qs ? `?${qs}` : "";
}
