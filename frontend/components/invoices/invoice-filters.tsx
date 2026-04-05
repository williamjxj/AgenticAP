"use client";

import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InvoiceListQueryInput } from "@/lib/invoices/query-params";

const STATUS_OPTIONS = [
  { value: "__all__", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

const VALIDATION_OPTIONS = [
  { value: "__all__", label: "All validation" },
  { value: "all_passed", label: "All passed" },
  { value: "has_failed", label: "Has failed" },
  { value: "has_warning", label: "Has warning" },
];

export type InvoiceFiltersValue = Pick<
  InvoiceListQueryInput,
  | "status"
  | "search"
  | "vendor"
  | "min_amount"
  | "max_amount"
  | "confidence"
  | "validation_status"
  | "date_from"
  | "date_to"
  | "sort_by"
  | "sort_order"
>;

const DEFAULT_FILTERS: InvoiceFiltersValue = {
  status: undefined,
  search: undefined,
  vendor: undefined,
  min_amount: undefined,
  max_amount: undefined,
  confidence: undefined,
  validation_status: undefined,
  date_from: undefined,
  date_to: undefined,
  sort_by: "created_at",
  sort_order: "desc",
};

export type InvoiceFiltersProps = {
  value: InvoiceFiltersValue;
  onChange: (next: InvoiceFiltersValue) => void;
};

/**
 * Filter panel aligned with Streamlit sidebar (status, search, vendor, amounts, confidence, validation, dates).
 */
export function InvoiceFilters({ value, onChange }: InvoiceFiltersProps) {
  const uid = useId();

  const set = (patch: Partial<InvoiceFiltersValue>) => {
    onChange({ ...value, ...patch });
  };

  const reset = () => {
    onChange({ ...DEFAULT_FILTERS });
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Filters</h2>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor={`${uid}-status`}>Processing status</Label>
          <Select
            value={value.status ?? "__all__"}
            onValueChange={(v) =>
              set({ status: v === "__all__" || v == null || v === "" ? undefined : v })
            }
          >
            <SelectTrigger id={`${uid}-status`}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-search`}>Search</Label>
          <Input
            id={`${uid}-search`}
            placeholder="File name or vendor"
            value={value.search ?? ""}
            onChange={(e) => set({ search: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-vendor`}>Vendor contains</Label>
          <Input
            id={`${uid}-vendor`}
            placeholder="Vendor"
            value={value.vendor ?? ""}
            onChange={(e) => set({ vendor: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-min`}>Min amount</Label>
          <Input
            id={`${uid}-min`}
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={value.min_amount ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              set({ min_amount: v === "" ? undefined : parseFloat(v) });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-max`}>Max amount</Label>
          <Input
            id={`${uid}-max`}
            type="number"
            min={0}
            step="0.01"
            placeholder="Any"
            value={value.max_amount ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              set({ max_amount: v === "" ? undefined : parseFloat(v) });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-conf`}>Min confidence (0–1)</Label>
          <Input
            id={`${uid}-conf`}
            type="number"
            min={0}
            max={1}
            step={0.05}
            placeholder="e.g. 0.7"
            value={value.confidence ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              set({ confidence: v === "" ? undefined : parseFloat(v) });
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-val`}>Validation</Label>
          <Select
            value={value.validation_status ?? "__all__"}
            onValueChange={(v) =>
              set({
                validation_status:
                  v === "__all__" || v == null || v === "" ? undefined : v,
              })
            }
          >
            <SelectTrigger id={`${uid}-val`}>
              <SelectValue placeholder="Validation" />
            </SelectTrigger>
            <SelectContent>
              {VALIDATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-from`}>Created from</Label>
          <Input
            id={`${uid}-from`}
            type="date"
            value={value.date_from ?? ""}
            onChange={(e) => set({ date_from: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-to`}>Created to</Label>
          <Input
            id={`${uid}-to`}
            type="date"
            value={value.date_to ?? ""}
            onChange={(e) => set({ date_to: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-sort`}>Sort by</Label>
          <Select
            value={value.sort_by ?? "created_at"}
            onValueChange={(v) => set({ sort_by: v ?? undefined })}
          >
            <SelectTrigger id={`${uid}-sort`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Created at</SelectItem>
              <SelectItem value="processed_at">Processed at</SelectItem>
              <SelectItem value="file_name">File name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-order`}>Order</Label>
          <Select
            value={value.sort_order ?? "desc"}
            onValueChange={(v) =>
              set({ sort_order: (v ?? "desc") as "asc" | "desc" })
            }
          >
            <SelectTrigger id={`${uid}-order`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
