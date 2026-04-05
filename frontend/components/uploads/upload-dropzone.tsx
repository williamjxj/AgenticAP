"use client";

import { Upload } from "lucide-react";
import { useCallback, useId, type SetStateAction } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.webp,.avif,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type UploadDropzoneProps = {
  files: File[];
  onFilesChange: (value: SetStateAction<File[]>) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Drag-and-drop (and file picker) control that accumulates selected files in parent state.
 */
export function UploadDropzone({ files, onFilesChange, disabled, className }: UploadDropzoneProps) {
  const labelId = useId();
  const inputId = useId();

  const mergeUnique = useCallback(
    (incoming: FileList | File[]) => {
      const list = incoming instanceof FileList ? Array.from(incoming) : incoming;
      onFilesChange((prev) => {
        const byKey = new Map<string, File>();
        for (const f of prev) {
          byKey.set(`${f.name}-${f.size}`, f);
        }
        for (const f of list) {
          if (f.size === 0) continue;
          byKey.set(`${f.name}-${f.size}`, f);
        }
        return Array.from(byKey.values());
      });
    },
    [onFilesChange],
  );

  return (
    <Card className={cn(className)}>
      <CardContent className="pt-6">
        <div
          role="region"
          aria-labelledby={labelId}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center transition-colors",
            disabled ? "opacity-60" : "hover:border-primary/50 hover:bg-muted/30",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (disabled) return;
            mergeUnique(e.dataTransfer.files);
          }}
        >
          <Upload className="size-10 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p id={labelId} className="text-sm font-medium">
              Drop invoice files here
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, images, spreadsheets (same types as the API). Empty files are skipped.
            </p>
          </div>
          <input
            id={inputId}
            type="file"
            data-testid="invoice-file-input"
            className="sr-only"
            accept={ACCEPT}
            multiple
            disabled={disabled}
            onChange={(e) => {
              const incoming = e.target.files;
              if (incoming?.length) mergeUnique(incoming);
            }}
          />
          <label
            htmlFor={inputId}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              disabled && "pointer-events-none opacity-50",
            )}
          >
            Browse files
          </label>
          {files.length > 0 ? (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {files.length} file{files.length === 1 ? "" : "s"} selected
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
