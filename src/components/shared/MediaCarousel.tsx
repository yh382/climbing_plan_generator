// src/components/shared/MediaCarousel.tsx

import React, { useCallback, useState } from "react";
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";

interface MediaCarouselProps {
  images: string[];
  width: number;
  height: number;
  onPressImage?: (index: number) => void;
}

export default function MediaCarousel({
  images,
  width,
  height,
  onPressImage,
}: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / width);
      if (page >= 0 && page < images.length) {
        setActiveIndex(page);
      }
    },
    [width, images.length],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <TouchableWithoutFeedback onPress={() => onPressImage?.(index)}>
        <Image
          source={{ uri: item }}
          style={{ width, height, backgroundColor: "#F3F4F6" }}
          resizeMode="cover"
        />
      </TouchableWithoutFeedback>
    ),
    [width, height, onPressImage]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: width,
      offset: width * index,
      index,
    }),
    [width]
  );

  return (
    <View>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* Dot indicators — only show for multi-image */}
      {images.length > 1 && (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  dotActive: {
    backgroundColor: "#111",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
