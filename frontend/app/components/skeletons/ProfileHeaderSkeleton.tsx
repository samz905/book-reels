"use client";

export default function ProfileHeaderSkeleton() {
  return (
    <div
      className="rounded-xl p-8 relative animate-pulse"
      style={{
        background:
          "linear-gradient(180deg, rgba(115, 112, 255, 0) 4.21%, rgba(115, 112, 255, 0.3) 100%), #0F0E13",
      }}
    >
      {/* Main content row */}
      <div className="flex items-start justify-between gap-6">
        {/* Left side: Avatar + Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Avatar skeleton */}
          <div className="w-[84px] h-[84px] rounded-full bg-panel-border flex-shrink-0" />

          {/* Name + Username + Bio */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <div className="h-6 bg-panel-border rounded w-48" />
            {/* Username */}
            <div className="h-4 bg-panel-border rounded w-32 mt-2" />
            {/* Bio */}
            <div className="h-4 bg-panel-border rounded w-full max-w-[600px] mt-4" />
            <div className="h-4 bg-panel-border rounded w-3/4 max-w-[450px] mt-2" />
          </div>
        </div>

        {/* Right side: Subscribe button skeleton */}
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="h-[52px] w-[280px] bg-panel-border rounded-[14px]" />
          <div className="h-4 bg-panel-border rounded w-40 mt-2" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-3">
          <div className="h-5 bg-panel-border rounded w-24" />
          <div className="h-5 bg-panel-border rounded w-28" />
          <div className="h-5 bg-panel-border rounded w-36" />
        </div>
        <div className="h-6 bg-panel-border rounded w-16" />
      </div>
    </div>
  );
}
