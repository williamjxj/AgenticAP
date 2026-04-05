"use client";

import { useEffect } from "react";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Route-level error boundary for `/invoices/[id]`.
 */
export default function InvoiceDetailError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("Invoice detail error:", error);
  }, [error]);

  return (
    <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <h2 className="text-sm font-medium text-destructive">Could not show this invoice</h2>
      <p className="text-xs text-muted-foreground">{error.message}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/invoices" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          Back to list
        </Link>
      </div>
    </div>
  );
}
