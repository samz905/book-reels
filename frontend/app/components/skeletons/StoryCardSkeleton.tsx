"use client";

export default function StoryCardSkeleton() {
  return (
    <article className="w-full animate-pulse">
      {/* Cover image skeleton */}
      <div className="relative aspect-[205/290] rounded-card overflow-hidden mb-2 bg-[#1A1E2F]" />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {/* Title skeleton */}
          <div className="h-5 bg-[#1A1E2F] rounded w-3/4" />
          {/* Description skeleton */}
          <div className="h-4 bg-[#1A1E2F] rounded w-full" />
          <div className="h-4 bg-[#1A1E2F] rounded w-2/3" />
        </div>

        {/* Creator info skeleton */}
        <div className="flex items-center gap-[5px]">
          <div className="w-6 h-6 rounded-full bg-[#1A1E2F]" />
          <div className="h-4 bg-[#1A1E2F] rounded w-24" />
        </div>
      </div>
    </article>
  );
}
