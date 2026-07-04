import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <main className="min-h-screen p-6 md:p-12 relative overflow-hidden bg-background">
      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        {/* Stats Row Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-6 rounded-xl border border-border bg-card space-y-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>

        {/* Two Column Layout Skeletons */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
              </div>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>

          {/* Right Column (1/3) */}
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  )
}
