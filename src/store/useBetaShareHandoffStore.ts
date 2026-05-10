// src/store/useBetaShareHandoffStore.ts
// Hands a freshly picked video from caller to app/outdoor-beta-share.tsx —
// the video PickedMediaItem is too large to fit in URL search params, so
// it travels via this transient slot (sheet-container-audit A1).
//
// The route consumes + clears `pendingVideo` on mount; if absent it dismisses
// itself with a guard (defensive — should never happen via normal flow).

import { create } from "zustand";
import type { PickedMediaItem } from "../features/community/types";

type State = {
  pendingVideo: PickedMediaItem | null;
  setPendingVideo: (video: PickedMediaItem | null) => void;
};

const useBetaShareHandoffStore = create<State>((set) => ({
  pendingVideo: null,
  setPendingVideo: (pendingVideo) => set({ pendingVideo }),
}));

export default useBetaShareHandoffStore;
