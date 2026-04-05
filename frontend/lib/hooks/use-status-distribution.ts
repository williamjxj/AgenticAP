"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetchJson } from "@/lib/api-client";

/**
 * Global processing-status counts from `GET /api/v1/invoices/analytics/status-distribution`.
 */
export function useStatusDistribution() {
  return useQuery({
    queryKey: ["analytics", "status-distribution"],
    queryFn: () =>
      apiFetchJson<Record<string, number>>("/invoices/analytics/status-distribution"),
    staleTime: 60_000,
  });
}
