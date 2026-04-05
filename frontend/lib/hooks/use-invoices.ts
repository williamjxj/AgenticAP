"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetchJson } from "@/lib/api-client";
import { invoiceListQueryString, type InvoiceListQueryInput } from "@/lib/invoices/query-params";
import type { InvoiceListResponse } from "@/lib/types/invoice";

/** @deprecated Use `InvoiceListQueryInput` from `@/lib/invoices/query-params`. */
export type InvoiceListQueryParams = InvoiceListQueryInput;

/**
 * Fetches paginated invoice list from `GET /api/v1/invoices`.
 */
export function useInvoices(params: InvoiceListQueryInput = {}) {
  const queryString = invoiceListQueryString(params);

  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => apiFetchJson<InvoiceListResponse>(`/invoices${queryString}`),
  });
}
