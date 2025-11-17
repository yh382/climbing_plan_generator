import React from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

type ProfileTabsProps = {
  tabs: string[];
  activeIndex: number;
  onTabPress: (index: number) => void;
};

export default function ProfileTabs({ tabs, activeIndex, onTabPress }: ProfileTabsProps) {
  const indicatorX = useSharedValue(0);
  const tabWidth = width / tabs.length;

  React.useEffect(() => {
    indicatorX.value = withTiming(activeIndex * tabWidth, { duration: 200 });
  }, [activeIndex]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          borderBottomWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={index}
              onPress={() => onTabPress(index)}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: isActive ? "700" : "500",
                  color: isActive ? "#111827" : "#6b7280",
                  fontSize: 15,
                }}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 底部滑动指示条 */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 0,
            height: 3,
            width: tabWidth,
            backgroundColor: "#111827",
            borderRadius: 999,
          },
          indicatorStyle,
        ]}
      />
    </View>
  );
}
