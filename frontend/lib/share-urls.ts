export function getStoryShareUrl(creatorUsername: string, storyId: string): string {
  return `${window.location.origin}/creator/${creatorUsername}?story=${storyId}`;
}

export function getEpisodeShareUrl(
  creatorUsername: string,
  storyId: string,
  episodeNumber: number,
): string {
  return `${window.location.origin}/creator/${creatorUsername}?story=${storyId}&episode=${episodeNumber}`;
}

export function getCreatorShareUrl(creatorUsername: string): string {
  return `${window.location.origin}/creator/${creatorUsername}`;
}
