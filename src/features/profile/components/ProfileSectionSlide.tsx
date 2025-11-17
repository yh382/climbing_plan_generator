import React, { useMemo } from "react";
import { Dimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import HorizontalSlide from "@components/slide/HorizontalSlide";
import { StrengthCard } from "@/features/profile/components/Persona/StrengthCard";
import { MobilityRecoveryCard } from "@/features/profile/components/Persona/MobilityRecoveryCard";
import { PreferencesCard } from "@/features/profile/components/Persona/PreferencesCard";
import { AnthropometricsCard } from "@/features/profile/components/Persona/AnthropometricsCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type ProfileSectionSlideProps = {
  index: number;
};

export default function ProfileSectionSlide({ index }: ProfileSectionSlideProps) {
  const translateX = useSharedValue(-SCREEN_WIDTH * index);

  React.useEffect(() => {
    translateX.value = withTiming(-SCREEN_WIDTH * index, { duration: 220 });
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const content = useMemo(
    () => [
      <StrengthCard key="strength" />,
      <MobilityRecoveryCard key="mobility" />,
      <PreferencesCard key="preferences" />,
      <AnthropometricsCard key="anthropometrics" />,
    ],
    []
  );

  return (
    <View style={{ width: SCREEN_WIDTH, overflow: "hidden", marginTop: 16 }}>
      <Animated.View
        style={[
          {
            flexDirection: "row",
            width: SCREEN_WIDTH * content.length,
          },
          animatedStyle,
        ]}
      >
        {content.map((c, i) => (
          <View key={i} style={{ width: SCREEN_WIDTH }}>{c}</View>
        ))}
      </Animated.View>
    </View>
  );
}
