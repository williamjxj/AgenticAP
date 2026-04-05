import { Skeleton } from "@/components/ui/skeleton";

/**
 * Detail route loading skeleton.
 */
export default function InvoiceDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-full max-w-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[min(720px,70vh)] w-full rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
