"use client";

export default function PublicStorySkeleton() {
  return (
    <div className="bg-panel rounded-xl p-6 animate-pulse">
      <div className="flex gap-6">
        {/* Story cover skeleton */}
        <div className="w-[180px] h-[270px] bg-panel-border rounded-xl flex-shrink-0" />

        {/* Story info */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="h-6 bg-panel-border rounded w-3/4 mb-2" />

          {/* Stats row */}
          <div className="flex gap-4 mb-4">
            <div className="h-4 bg-panel-border rounded w-20" />
            <div className="h-4 bg-panel-border rounded w-24" />
            <div className="h-4 bg-panel-border rounded w-16" />
          </div>

          {/* Description */}
          <div className="h-4 bg-panel-border rounded w-full mb-2" />
          <div className="h-4 bg-panel-border rounded w-5/6 mb-2" />
          <div className="h-4 bg-panel-border rounded w-2/3 mb-6" />

          {/* Episode list skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-[120px] h-[68px] bg-panel-border rounded-lg flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-panel-border rounded w-32 mb-2" />
                  <div className="h-3 bg-panel-border rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
