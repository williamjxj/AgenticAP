"use client";

import * as React from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvoiceSummary } from "@/lib/types/invoice";
import { cn } from "@/lib/utils";

export type InvoiceTableProps = {
  data: InvoiceSummary[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

/**
 * TanStack Table + shadcn for invoice list with server-side pagination controls.
 */
export function InvoiceTable({ data, page, totalPages, onPageChange, isLoading }: InvoiceTableProps) {
  const columns = React.useMemo<ColumnDef<InvoiceSummary>[]>(
    () => [
      {
        accessorKey: "file_name",
        header: "File",
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate font-medium">{row.original.file_name}</span>
        ),
      },
      {
        accessorKey: "vendor_name",
        header: "Vendor",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.vendor_name ?? "—"}</span>
        ),
      },
      {
        accessorKey: "processing_status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.processing_status}
          </Badge>
        ),
      },
      {
        accessorKey: "total_amount",
        header: () => <span className="block text-right">Amount</span>,
        cell: ({ row }) => (
          <span className="block text-right text-muted-foreground">
            {row.original.total_amount != null
              ? `${row.original.currency ?? ""} ${row.original.total_amount.toFixed(2)}`.trim()
              : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Link
            href={`/invoices/${row.original.id}`}
            className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
          >
            Detail
          </Link>
        ),
      },
    ],
    [],
  );

  // TanStack Table returns non-memoizable refs; safe here as data is server-driven.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border">
        <Table aria-busy={isLoading}>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No invoices match these filters.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Page {page} of {totalPages || 1}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPrev}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canNext}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
