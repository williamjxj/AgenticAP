"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { Pagination } from "@/lib/types/invoice";

export type InvoiceListMetricsProps = {
  pagination: Pagination | undefined;
  /** Keys are processing_status values from analytics API */
  statusDistribution: Record<string, number> | undefined;
  isLoading?: boolean;
};

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="shadow-none">
      <CardContent className="px-4 py-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Summary row: global status distribution + current filter match count (pagination total).
 */
export function InvoiceListMetrics({
  pagination,
  statusDistribution,
  isLoading,
}: InvoiceListMetricsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    );
  }

  const matchTotal = pagination?.total_items ?? "—";
  const completed = statusDistribution?.completed ?? 0;
  const failed = statusDistribution?.failed ?? 0;
  const processing =
    (statusDistribution?.processing ?? 0) +
    (statusDistribution?.queued ?? 0) +
    (statusDistribution?.pending ?? 0);
  const uniqueHint =
    typeof matchTotal === "number"
      ? `${matchTotal} invoice row(s) match current filters`
      : "—";

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{uniqueHint}</p>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <Metric label="Matching (filtered)" value={matchTotal} />
        <Metric label="Completed (all)" value={completed} />
        <Metric label="Failed (all)" value={failed} />
        <Metric label="In progress (all)" value={processing} />
      </div>
    </div>
  );
}
