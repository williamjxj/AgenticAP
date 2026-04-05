"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { UploadDropzone } from "@/components/uploads/upload-dropzone";
import { UploadStatusRow } from "@/components/uploads/upload-status-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUploadFiles } from "@/lib/hooks/use-upload-files";
import { ApiError } from "@/lib/api-client";
import type { UploadResponse } from "@/lib/types/upload";

/**
 * Upload page: multipart ingest to `POST /api/v1/uploads` with optional status polling for queued items.
 */
export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [subfolder, setSubfolder] = useState("uploads");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const [forceReprocess, setForceReprocess] = useState(false);
  const [lastResult, setLastResult] = useState<UploadResponse | null>(null);

  const upload = useUploadFiles();

  const queuedTrackers = useMemo(() => {
    if (!lastResult?.data?.uploads) return [];
    return lastResult.data.uploads
      .filter((u) => u.status === "queued" && u.invoice_id)
      .map((u) => ({ id: u.invoice_id as string, label: u.file_name }));
  }, [lastResult]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Choose at least one non-empty file.");
      return;
    }
    try {
      const res = await upload.mutateAsync({
        files,
        subfolder,
        category: category || undefined,
        group: group || undefined,
        forceReprocess,
      });
      setLastResult(res);
      const { failed, skipped, successful } = res.data;
      toast.success(`Upload accepted: ${successful} queued, ${failed} failed, ${skipped} skipped.`);
      if (successful > 0) {
        setFiles([]);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Upload failed";
      toast.error(message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Upload</h1>
        <p className="text-sm text-muted-foreground">
          Files are sent to <code className="rounded bg-muted px-1">POST /api/v1/uploads</code>. Processing
          runs asynchronously; queued rows below poll <code className="rounded bg-muted px-1">…/status</code>{" "}
          until finished.
        </p>
      </div>

      <form className="space-y-6" onSubmit={onSubmit}>
        <UploadDropzone files={files} onFilesChange={setFiles} disabled={upload.isPending} />

        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
            <CardDescription>Optional metadata and ingest settings (same as the API form fields).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="upload-subfolder">Subfolder under data/</Label>
              <Input
                id="upload-subfolder"
                value={subfolder}
                onChange={(e) => setSubfolder(e.target.value)}
                disabled={upload.isPending}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="upload-category">Category</Label>
                <Input
                  id="upload-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={upload.isPending}
                  placeholder="optional"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="upload-group">Group</Label>
                <Input
                  id="upload-group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  disabled={upload.isPending}
                  placeholder="optional"
                  autoComplete="off"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceReprocess}
                onChange={(e) => setForceReprocess(e.target.checked)}
                disabled={upload.isPending}
                className="size-4 rounded border border-input"
              />
              Force reprocess (ignore duplicate hash)
            </label>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={upload.isPending || files.length === 0}>
            {upload.isPending ? "Uploading…" : "Upload"}
          </Button>
          <Link href="/invoices" className={cn(buttonVariants({ variant: "outline" }))}>
            Open invoices
          </Link>
        </div>
      </form>

      {lastResult ? (
        <Card>
          <CardHeader>
            <CardTitle>Last response</CardTitle>
            <CardDescription>
              {lastResult.data.successful} successful, {lastResult.data.failed} failed, {lastResult.data.skipped}{" "}
              skipped (total {lastResult.data.total})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="list-inside list-disc space-y-1 text-sm">
              {lastResult.data.uploads.map((u, i) => (
                <li key={`${i}-${u.file_name}-${u.status}`}>
                  <span className="font-medium">{u.file_name}</span> — {u.status}
                  {u.error_message ? (
                    <span className="block pl-4 text-xs text-destructive">{u.error_message}</span>
                  ) : null}
                </li>
              ))}
            </ul>
            {queuedTrackers.length > 0 ? (
              <div className="rounded-md border border-border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-medium">Processing status</p>
                <ul className="space-y-2">
                  {queuedTrackers.map((t) => (
                    <UploadStatusRow key={t.id} invoiceId={t.id} fileLabel={t.label} />
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
