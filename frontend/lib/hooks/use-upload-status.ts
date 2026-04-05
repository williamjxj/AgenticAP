"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError, apiFetchJson } from "@/lib/api-client";
import type { UploadStatusResponse } from "@/lib/types/upload";

const TERMINAL = new Set(["completed", "failed"]);

/**
 * Poll `GET /api/v1/uploads/{invoice_id}/status` until processing settles.
 * After background ingest replaces the placeholder invoice, the API may return 404; that is treated as `gone` (open Invoices to locate the row).
 */
export function useUploadStatus(invoiceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["upload-status", invoiceId],
    queryFn: async (): Promise<
      | { kind: "live"; body: UploadStatusResponse }
      | { kind: "gone" }
    > => {
      if (!invoiceId) {
        return { kind: "gone" };
      }
      try {
        const body = await apiFetchJson<UploadStatusResponse>(`/uploads/${invoiceId}/status`);
        return { kind: "live", body };
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          return { kind: "gone" };
        }
        throw e;
      }
    },
    enabled: Boolean(invoiceId) && enabled,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d || d.kind === "gone") return false;
      const status = d.body.data.processing_status;
      if (TERMINAL.has(status)) return false;
      return 2500;
    },
  });
}
