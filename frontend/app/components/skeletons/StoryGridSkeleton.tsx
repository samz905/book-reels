"use client";

import StoryCardSkeleton from "./StoryCardSkeleton";

interface StoryGridSkeletonProps {
  count?: number;
}

export default function StoryGridSkeleton({ count = 12 }: StoryGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 py-6">
      {Array.from({ length: count }).map((_, index) => (
        <StoryCardSkeleton key={index} />
      ))}
    </div>
  );
}
