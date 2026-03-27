import { useEffect } from "react";
import { Gesture } from "react-native-gesture-handler";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from "react-native-reanimated";

type CropMode = "avatar" | "cover";

const MAX_SCALE = 5;
const SPRING_CONFIG = { damping: 20, stiffness: 200 };

/**
 * Gesture hook for the library photo cropper.
 * Handles pinch-to-zoom + pan with boundary clamping.
 */
export function useCropGesture(opts: {
  mode: CropMode;
  selectedId: string | undefined;
  imageWidth: number;
  imageHeight: number;
}) {
  const { mode, selectedId, imageWidth, imageHeight } = opts;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Shared values for worklet access
  const imgW = useSharedValue(0);
  const imgH = useSharedValue(0);
  const containerSize = useSharedValue(0);
  const isCover = useSharedValue(mode === "cover" ? 1 : 0);

  useEffect(() => {
    imgW.value = imageWidth;
    imgH.value = imageHeight;
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    isCover.value = mode === "cover" ? 1 : 0;
  }, [mode]);

  // Reset gestures on selection change
  useEffect(() => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [selectedId]);

  const clampAndSnap = () => {
    "worklet";
    const cs = containerSize.value;
    const w = imgW.value;
    const h = imgH.value;
    if (cs <= 0 || w <= 0 || h <= 0) return;

    const s = scale.value;
    // Image is displayed with "cover" fit inside the square preview
    const coverScale = Math.max(cs / w, cs / h);
    const displayedW = w * coverScale * s;
    const displayedH = h * coverScale * s;

    // Crop zone dimensions in container coords
    const cropW = cs;
    // Avatar: clamp to full square; Cover: clamp to 16:9 band
    const cropH = isCover.value === 1 ? cs * (9 / 16) : cs;

    const maxTx = Math.max(0, (displayedW - cropW) / 2);
    const maxTy = Math.max(0, (displayedH - cropH) / 2);

    const clampedX = Math.min(maxTx, Math.max(-maxTx, translateX.value));
    const clampedY = Math.min(maxTy, Math.max(-maxTy, translateY.value));

    translateX.value = withSpring(clampedX, SPRING_CONFIG);
    translateY.value = withSpring(clampedY, SPRING_CONFIG);
    savedTranslateX.value = clampedX;
    savedTranslateY.value = clampedY;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      "worklet";
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), MAX_SCALE);
    })
    .onEnd(() => {
      "worklet";
      savedScale.value = scale.value;
      if (scale.value < 1.05) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        clampAndSnap();
      }
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onUpdate((e) => {
      "worklet";
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      "worklet";
      clampAndSnap();
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const setContainerSize = (size: number) => {
    containerSize.value = size;
  };

  /** Read current gesture state (JS thread) for crop calculation */
  const getGestureState = () => ({
    scale: scale.value,
    translateX: translateX.value,
    translateY: translateY.value,
  });

  return {
    composedGesture,
    animatedImageStyle,
    setContainerSize,
    getGestureState,
  };
}
