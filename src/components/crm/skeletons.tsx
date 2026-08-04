"use client";

/**
 * Skeleton components for CRM dashboard widgets.
 *
 * WHY: The layout shell renders immediately (<100ms). While data loads,
 * skeletons occupy the exact space the real content will fill — no layout
 * shift, no blank white space. Users perceive the page as "loaded" even
 * while data is in-flight.
 *
 * Animated with CSS pulse (no JS animation = no frame budget cost).
 */

function Pulse({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
      style={style}
    />
  );
}

// ── Table Skeleton ────────────────────────────────────────────────────────────

export function PipelineTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-0 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        {[40, 120, 160, 100, 80, 90, 80].map((w, i) => (
          <Pulse key={i} className={`h-3`} style={{ width: w }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex items-center gap-4 border-b border-gray-100 px-4 py-3.5 last:border-0 dark:border-gray-800"
        >
          {[40, 120, 160, 100, 80, 90, 80].map((w, i) => (
            <Pulse
              key={i}
              className="h-3"
              style={{
                width: w,
                opacity: 1 - rowIdx * 0.07,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Stat Card Skeleton ────────────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <Pulse className="mb-3 h-3 w-24" />
      <Pulse className="mb-2 h-8 w-16" />
      <Pulse className="h-2 w-32" />
    </div>
  );
}

export function StatCardRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 grid-cols-2 sm:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ── Filter Bar Skeleton ───────────────────────────────────────────────────────

export function FilterBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Pulse className="h-9 w-48 rounded-md" />
      <Pulse className="h-9 w-36 rounded-md" />
      <Pulse className="h-9 w-32 rounded-md" />
      <div className="ml-auto">
        <Pulse className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

// ── Page Header Skeleton ──────────────────────────────────────────────────────

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Pulse className="mb-2 h-6 w-48" />
        <Pulse className="h-4 w-64" />
      </div>
      <Pulse className="h-9 w-28 rounded-md" />
    </div>
  );
}

// ── Full Dashboard Skeleton ───────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <FilterBarSkeleton />
      <StatCardRowSkeleton count={4} />
      <PipelineTableSkeleton rows={10} />
    </div>
  );
}
