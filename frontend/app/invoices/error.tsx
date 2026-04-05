"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route-level error boundary for `/invoices`.
 */
export default function InvoicesError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("Invoices route error:", error);
  }, [error]);

  return (
    <div className="space-y-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <h2 className="text-sm font-medium text-destructive">Something went wrong</h2>
      <p className="text-xs text-muted-foreground">{error.message}</p>
      <Button type="button" size="sm" variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
