"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetchJson } from "@/lib/api-client";
import type { InvoiceDetailResponse } from "@/lib/types/invoice";

/**
 * Fetches a single invoice from `GET /api/v1/invoices/{id}`.
 */
export function useInvoiceDetail(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: () => apiFetchJson<InvoiceDetailResponse>(`/invoices/${invoiceId}`),
    enabled: Boolean(invoiceId),
  });
}
