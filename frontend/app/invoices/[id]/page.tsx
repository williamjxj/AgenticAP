"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { DocumentPreview } from "@/components/invoices/document-preview";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvoiceDetail } from "@/lib/hooks/use-invoice-detail";
import { cn } from "@/lib/utils";

function invoicePdfExportUrl(invoiceId: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1").replace(/\/$/, "");
  return `${base}/invoices/${invoiceId}/export/pdf`;
}

/**
 * Invoice detail: preview, extracted fields, validation results, PDF export.
 */
export default function InvoiceDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const { data, isPending, isError, error, refetch } = useInvoiceDetail(id);

  if (!id) {
    return <p className="text-sm text-muted-foreground">Missing invoice id.</p>;
  }

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading invoice…</p>;
  }

  if (isError) {
    return (
      <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">Could not load invoice</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
          <Link href="/invoices" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  const inv = data!.data;
  const pdfHref = invoicePdfExportUrl(inv.id);
  const ed = inv.extracted_data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/invoices" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            ← Back
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{inv.file_name}</h1>
          <Badge variant="secondary" className="capitalize">
            {inv.processing_status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Export PDF
          </a>
        </div>
      </div>

      {inv.error_message ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {inv.error_message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-h-[320px] shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Document</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentPreview invoiceId={inv.id} fileType={inv.file_type} fileName={inv.file_name} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Processing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(inv.created_at).toLocaleString()}</span>
              </div>
              {inv.processed_at ? (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Processed</span>
                  <span>{new Date(inv.processed_at).toLocaleString()}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">File type</span>
                <span>{inv.file_type}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Extracted data</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {ed ? (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Vendor</span>
                    <span>{ed.vendor_name ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Invoice #</span>
                    <span>{ed.invoice_number ?? "—"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Dates</span>
                    <span>
                      {[ed.invoice_date, ed.due_date].filter(Boolean).join(" → ") || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Total</span>
                    <span>
                      {ed.total_amount != null
                        ? `${ed.currency ?? ""} ${ed.total_amount.toFixed(2)}`.trim()
                        : "—"}
                    </span>
                  </div>
                  {ed.extraction_confidence != null ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Confidence</span>
                      <span>{(ed.extraction_confidence * 100).toFixed(0)}%</span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-muted-foreground">No extracted data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Validation</CardTitle>
        </CardHeader>
        <CardContent>
          {inv.validation_results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No validation rows.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.validation_results.map((vr, idx) => (
                  <TableRow key={`${vr.rule_name}-${idx}-${vr.validated_at}`}>
                    <TableCell className="font-medium">{vr.rule_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          vr.status === "failed"
                            ? "destructive"
                            : vr.status === "warning"
                              ? "secondary"
                              : "outline"
                        }
                        className="capitalize"
                      >
                        {vr.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {vr.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
