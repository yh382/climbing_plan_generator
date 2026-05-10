// Module-level bridge to pass post draft data
// from create.tsx to arrange.tsx

import type { PickedMediaItem } from './types';

export type PostDraft = {
  content: string;
  mediaList: PickedMediaItem[];
  attachedWidget: {
    id: string;
    type: string;
    title: string;
    subtitle: string;
  } | null;
  location: string;
  selectedGym: { id: string; name: string } | null;
  visibility: 'public' | 'followers' | 'private';
};

let _draft: PostDraft | null = null;

export const setPostDraft = (d: PostDraft) => {
  _draft = d;
};

export const consumePostDraft = (): PostDraft | null => {
  const r = _draft;
  _draft = null;
  return r;
};
