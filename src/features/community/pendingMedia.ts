// Module-level bridge to pass selected media items
// from device-media-picker.tsx back to create.tsx via router.back()

import type { PickedMediaItem } from './types';

let _pending: PickedMediaItem[] | null = null;

export const setPendingMedia = (items: PickedMediaItem[] | null) => {
  _pending = items;
};

export const consumePendingMedia = (): PickedMediaItem[] | null => {
  const result = _pending;
  _pending = null;
  return result;
};

// Flag: when arrange.tsx finishes reordering, it sets this to trigger auto-post in create.tsx
let _readyToPost = false;

export const setReadyToPost = (v: boolean) => {
  _readyToPost = v;
};

export const consumeReadyToPost = (): boolean => {
  const r = _readyToPost;
  _readyToPost = false;
  return r;
};
