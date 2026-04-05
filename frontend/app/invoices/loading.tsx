import { Skeleton } from "@/components/ui/skeleton";

/**
 * List route loading skeleton (streaming / slow network).
 */
export default function InvoicesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-52" />
      </div>
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
