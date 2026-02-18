import type { Story } from "../data/mockStories";
import StoryCard from "./StoryCard";

interface StoryGridProps {
  stories: Story[];
  onStoryClick?: (story: Story) => void;
}

export default function StoryGrid({ stories, onStoryClick }: StoryGridProps) {
  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-secondary">No stories found in this category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} onClick={onStoryClick ? () => onStoryClick(story) : undefined} />
      ))}
    </div>
  );
}
