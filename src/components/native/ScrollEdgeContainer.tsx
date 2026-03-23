import { useEffect, useRef, type RefObject } from "react";
import { Platform, type View } from "react-native";

let ScrollEdgeEffect: {
  attach: (containerY: number, containerHeight: number) => Promise<string>;
  detach: () => Promise<void>;
} | null = null;

if (Platform.OS === "ios") {
  try {
    const { requireNativeModule } = require("expo-modules-core");
    ScrollEdgeEffect = requireNativeModule("ScrollEdgeEffect");
    console.log("[ScrollEdgeEffect] native module loaded");
  } catch (e) {
    console.log("[ScrollEdgeEffect] module not available:", e);
  }
}

/**
 * Hook: attach iOS 26 UIScrollEdgeElementContainerInteraction.
 * Pass a ref to the container View (the input bar area).
 */
export function useScrollEdgeEffect(containerRef: RefObject<View | null>) {
  const attached = useRef(false);

  useEffect(() => {
    if (!ScrollEdgeEffect || !containerRef.current) return;

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 5;

    const tryMeasureAndAttach = () => {
      if (cancelled || attached.current) return;
      attempt++;

      const view = containerRef.current;
      if (!view) {
        console.log("[ScrollEdgeEffect] ref not available yet");
        if (attempt < maxAttempts) setTimeout(tryMeasureAndAttach, 1000);
        return;
      }

      (view as any).measureInWindow((x: number, y: number, w: number, h: number) => {
        if (cancelled || attached.current) return;
        console.log(`[ScrollEdgeEffect] measured: x=${x} y=${y} w=${w} h=${h}`);

        if (!h || h <= 0) {
          console.log("[ScrollEdgeEffect] invalid measurement, retrying...");
          if (attempt < maxAttempts) setTimeout(tryMeasureAndAttach, 1000);
          return;
        }

        ScrollEdgeEffect?.attach(y, h)
          .then((status) => {
            console.log("[ScrollEdgeEffect]", status);
            if (status.startsWith("ok")) {
              attached.current = true;
            }
          })
          .catch((err) => {
            console.log("[ScrollEdgeEffect] error:", err);
          });
      });
    };

    // Delay to ensure layout is complete
    const timer = setTimeout(tryMeasureAndAttach, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (attached.current) {
        ScrollEdgeEffect?.detach();
        attached.current = false;
      }
    };
  }, [containerRef]);
}
