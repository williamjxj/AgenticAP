"use client";

import { buildApiUrl } from "@/lib/api-client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DocumentPreviewProps = {
  invoiceId: string;
  fileType: string;
  fileName: string;
};

function previewKind(fileType: string): "pdf" | "image" | "other" {
  const ft = fileType.toLowerCase();
  if (ft.includes("pdf")) return "pdf";
  if (/(png|jpe?g|gif|webp|bmp|svg)/.test(ft)) return "image";
  return "other";
}

/**
 * Embeds the original file from `GET /api/v1/invoices/{id}/file` when the browser can display it.
 */
export function DocumentPreview({ invoiceId, fileType, fileName }: DocumentPreviewProps) {
  const src = buildApiUrl(`/invoices/${invoiceId}/file`);
  const kind = previewKind(fileType);

  if (kind === "pdf") {
    return (
      <iframe
        title={`Preview: ${fileName}`}
        src={src}
        className="h-[min(720px,70vh)] w-full rounded-md border border-border bg-muted/20"
      />
    );
  }

  if (kind === "image") {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- cross-origin API URL; not next/image */}
        <img
          src={src}
          alt={fileName}
          className="max-h-[min(720px,70vh)] w-auto max-w-full rounded-md border border-border object-contain"
        />
      </>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
      <p>Inline preview is not available for file type &quot;{fileType}&quot;.</p>
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-3 inline-flex")}
      >
        Download source file
      </a>
    </div>
  );
}
