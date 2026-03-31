// widgets/ClimbingSession.tsx
import { Text, VStack, HStack, Image, Spacer } from "@expo/ui/swift-ui";
import { font, foregroundStyle, padding } from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity } from "expo-widgets";

type ClimbingSessionProps = {
  gymName: string;
  discipline: string; // "boulder" | "toprope" | "lead"
  startTime: number; // epoch ms — iOS 原生计时器用
  routeCount: number;
  sendCount: number;
  bestGrade: string; // e.g. "V5"
};

const ClimbingSession = (props: ClimbingSessionProps) => {
  "widget";

  return {
    // 锁屏大横幅 (Lock Screen banner)
    banner: (
      <VStack modifiers={[padding({ all: 12 })]}>
        <HStack>
          <VStack>
            <Text
              modifiers={[font({ weight: "bold", size: 16 })]}
            >
              {props.gymName}
            </Text>
            <Text
              modifiers={[font({ size: 12 }), foregroundStyle("#8E8E93")]}
            >
              {props.discipline}
            </Text>
          </VStack>
          <Spacer />
          <VStack>
            <Text
              modifiers={[
                font({ weight: "bold", size: 24 }),
                foregroundStyle("#306E6F"),
              ]}
            >
              {props.routeCount}
            </Text>
            <Text
              modifiers={[font({ size: 10 }), foregroundStyle("#8E8E93")]}
            >
              routes
            </Text>
          </VStack>
        </HStack>
      </VStack>
    ),

    // 灵动岛紧凑视图 — 左侧: 路线数
    compactLeading: (
      <Text
        modifiers={[font({ weight: "bold" }), foregroundStyle("#306E6F")]}
      >
        {props.routeCount}
      </Text>
    ),

    // 灵动岛紧凑视图 — 右侧: best grade
    compactTrailing: (
      <Text modifiers={[font({ weight: "medium" })]}>
        {props.bestGrade || "-"}
      </Text>
    ),

    // 灵动岛最小视图 (与其他 app 共享灵动岛时)
    minimal: (
      <Text
        modifiers={[
          font({ weight: "bold", size: 14 }),
          foregroundStyle("#306E6F"),
        ]}
      >
        {props.routeCount}
      </Text>
    ),

    // 灵动岛展开视图 — 左侧
    expandedLeading: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Image systemName="figure.climbing" color="#306E6F" />
        <Text modifiers={[font({ size: 10 })]}>
          {props.discipline}
        </Text>
      </VStack>
    ),

    // 灵动岛展开视图 — 右侧
    expandedTrailing: (
      <VStack modifiers={[padding({ all: 8 })]}>
        <Text modifiers={[font({ weight: "bold", size: 20 })]}>
          {props.bestGrade || "-"}
        </Text>
        <Text modifiers={[font({ size: 10 })]}>best</Text>
      </VStack>
    ),

    // 灵动岛展开视图 — 底部
    expandedBottom: (
      <HStack modifiers={[padding({ horizontal: 12, bottom: 8 })]}>
        <Text modifiers={[font({ size: 12 })]}>
          {props.gymName}
        </Text>
        <Spacer />
        <Text modifiers={[font({ size: 12 })]}>
          {props.sendCount} sends · {props.routeCount} routes
        </Text>
      </HStack>
    ),
  };
};

export default createLiveActivity("ClimbingSession", ClimbingSession);
