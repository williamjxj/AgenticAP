"use client";

import { useUploadStatus } from "@/lib/hooks/use-upload-status";

export type UploadStatusRowProps = {
  invoiceId: string;
  fileLabel: string;
};

/**
 * Live processing status for one upload placeholder invoice id (polls until terminal or 404).
 */
export function UploadStatusRow({ invoiceId, fileLabel }: UploadStatusRowProps) {
  const { data, isPending, isError, error } = useUploadStatus(invoiceId, true);

  if (isPending && !data) {
    return (
      <li className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{fileLabel}</span> — checking status…
      </li>
    );
  }

  if (isError) {
    return (
      <li className="text-sm text-destructive">
        <span className="font-medium">{fileLabel}</span> —{" "}
        {error instanceof Error ? error.message : "Status request failed"}
      </li>
    );
  }

  if (!data || data.kind === "gone") {
    return (
      <li className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{fileLabel}</span> — processing finished or invoice was
        replaced; open <span className="font-medium">Invoices</span> to find this file.
      </li>
    );
  }

  const st = data.body.data.processing_status;
  const err = data.body.data.error_message;

  return (
    <li className="text-sm">
      <span className="font-medium text-foreground">{fileLabel}</span> —{" "}
      <span className="capitalize">{st}</span>
      {err ? <span className="block text-xs text-destructive">{err}</span> : null}
    </li>
  );
}
