// Module-level bridge: pass a single video's cover update from cover-picker back to create.tsx.
// Only updates one video's coverUri — does NOT overwrite the full mediaList.

type CoverUpdate = {
  videoId: string; // id of the PickedMediaItem to update
  coverUri: string; // local file:// URI of the generated thumbnail
};

let _pending: CoverUpdate | null = null;

export function setCoverUpdate(update: CoverUpdate) {
  _pending = update;
}

export function consumeCoverUpdate(): CoverUpdate | null {
  const result = _pending;
  _pending = null;
  return result;
}
