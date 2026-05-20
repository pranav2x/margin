import { stories } from '../../data/fixtures/stories';
import type { Story } from '../../types';

export function useStories(): Story[] {
  return stories;
}

export function useStory(id: string | undefined): Story | undefined {
  return stories.find((s) => s.id === id);
}
