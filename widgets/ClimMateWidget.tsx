// widgets/ClimMateWidget.tsx
import { Text, VStack, HStack, Spacer } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  padding,
  frame,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";

type ClimMateWidgetProps = {
  weekClimbDays: number;
  weekSends: number;
  streak: number;
  lastSessionGym: string;
  lastSessionDate: string;
  lastSessionBest: string;
  lastSessionDuration: string;
  hasActiveSession: boolean;
};

const ClimMateWidget = (props: ClimMateWidgetProps, env: WidgetEnvironment) => {
  "widget";

  // systemSmall: 核心数据
  if (env.widgetFamily === "systemSmall") {
    return (
      <VStack modifiers={[padding({ all: 12 })]}>
        {/* Streak */}
        <Text
          modifiers={[
            font({ weight: "bold", size: 32 }),
            foregroundStyle("#306E6F"),
          ]}
        >
          {props.streak}
        </Text>
        <Text
          modifiers={[font({ size: 12 }), foregroundStyle("#8E8E93")]}
        >
          day streak
        </Text>

        <Spacer />

        {/* 本周概览 */}
        <HStack>
          <VStack>
            <Text
              modifiers={[font({ weight: "semibold", size: 16 })]}
            >
              {props.weekClimbDays}
            </Text>
            <Text
              modifiers={[
                font({ size: 10 }),
                foregroundStyle("#8E8E93"),
              ]}
            >
              days
            </Text>
          </VStack>
          <Spacer />
          <VStack>
            <Text
              modifiers={[font({ weight: "semibold", size: 16 })]}
            >
              {props.weekSends}
            </Text>
            <Text
              modifiers={[
                font({ size: 10 }),
                foregroundStyle("#8E8E93"),
              ]}
            >
              sends
            </Text>
          </VStack>
        </HStack>

        {/* Active session 指示器 */}
        {props.hasActiveSession && (
          <Text
            modifiers={[
              font({ size: 10, weight: "bold" }),
              foregroundStyle("#FF3B30"),
            ]}
          >
            Session Active
          </Text>
        )}
      </VStack>
    );
  }

  // systemMedium: 含最近 session 信息
  return (
    <HStack modifiers={[padding({ all: 12 })]}>
      {/* 左半: streak + 本周数据 */}
      <VStack modifiers={[frame({ maxWidth: 120 })]}>
        <Text
          modifiers={[
            font({ weight: "bold", size: 36 }),
            foregroundStyle("#306E6F"),
          ]}
        >
          {props.streak}
        </Text>
        <Text
          modifiers={[font({ size: 12 }), foregroundStyle("#8E8E93")]}
        >
          day streak
        </Text>
        <Spacer />
        <Text modifiers={[font({ weight: "semibold", size: 14 })]}>
          {props.weekClimbDays} days · {props.weekSends} sends
        </Text>
        <Text
          modifiers={[font({ size: 11 }), foregroundStyle("#8E8E93")]}
        >
          this week
        </Text>
      </VStack>

      <Spacer />

      {/* 右半: 最近 session */}
      <VStack>
        <Text
          modifiers={[
            font({ weight: "medium", size: 12 }),
            foregroundStyle("#8E8E93"),
          ]}
        >
          Last Session
        </Text>
        <Text modifiers={[font({ weight: "semibold", size: 14 })]}>
          {props.lastSessionGym || "No sessions yet"}
        </Text>
        {props.lastSessionBest ? (
          <>
            <Text
              modifiers={[
                font({ weight: "bold", size: 20 }),
                foregroundStyle("#306E6F"),
              ]}
            >
              {props.lastSessionBest}
            </Text>
            <Text
              modifiers={[
                font({ size: 11 }),
                foregroundStyle("#8E8E93"),
              ]}
            >
              {props.lastSessionDuration}
            </Text>
          </>
        ) : null}
      </VStack>
    </HStack>
  );
};

export default createWidget("ClimMateWidget", ClimMateWidget);
