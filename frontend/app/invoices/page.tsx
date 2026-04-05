"use client";

import { useMemo, useState } from "react";

import { InvoiceFilters, type InvoiceFiltersValue } from "@/components/invoices/invoice-filters";
import { InvoiceListMetrics } from "@/components/invoices/invoice-list-metrics";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildApiUrl } from "@/lib/api-client";
import { useInvoices } from "@/lib/hooks/use-invoices";
import { useStatusDistribution } from "@/lib/hooks/use-status-distribution";
import { invoiceExportCsvQueryString } from "@/lib/invoices/query-params";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

/**
 * Invoice list with filters, metrics, TanStack table, and CSV export query parity.
 */
export default function InvoicesPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<InvoiceFiltersValue>({
    sort_by: "created_at",
    sort_order: "desc",
  });

  const listParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      ...filters,
    }),
    [page, filters],
  );

  const { data, isPending, isError, error, refetch, isFetching } = useInvoices(listParams);
  const {
    data: statusDist,
    isPending: distLoading,
    isError: distError,
  } = useStatusDistribution();

  const applyFilters = (next: InvoiceFiltersValue) => {
    setFilters(next);
    setPage(1);
  };

  const csvSuffix = invoiceExportCsvQueryString(filters);
  const csvHref = buildApiUrl(`/invoices/export/csv${csvSuffix}`);

  const pagination = data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;
  const rows = data?.data ?? [];

  if (isError) {
    return (
      <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-destructive">Could not load invoices</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
        <div className="flex flex-wrap gap-2">
          <a href={csvHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Export CSV
          </a>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refetch()}
            disabled={isPending}
          >
            Refresh
          </Button>
        </div>
      </div>

      <InvoiceFilters value={filters} onChange={applyFilters} />

      {distError ? (
        <p className="text-xs text-muted-foreground">Could not load global status summary.</p>
      ) : (
        <InvoiceListMetrics
          pagination={pagination}
          statusDistribution={statusDist}
          isLoading={isPending || distLoading}
        />
      )}

      <InvoiceTable
        data={rows}
        page={page}
        totalPages={Math.max(1, totalPages)}
        onPageChange={setPage}
        isLoading={isPending || isFetching}
      />
    </div>
  );
}
