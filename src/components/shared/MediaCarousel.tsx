// src/components/shared/MediaCarousel.tsx

import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Image,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  ViewToken,
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

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

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
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
