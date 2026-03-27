# Task 1: 目录结构改造 + 原生导航栏 + index.tsx 主体

## 目标
将 `app/(tabs)/climmate.tsx` 单文件转为目录结构，接入原生 Stack header，合并 CoachChatScreen 逻辑。

## 执行步骤

### Step 1: 创建目录结构
1. 新建 `app/(tabs)/climmate/` 目录
2. 删除 `app/(tabs)/climmate.tsx`

### Step 2: 新建 `app/(tabs)/climmate/_layout.tsx`

参考 `app/(tabs)/calendar/_layout.tsx` 的模式：

```tsx
import { Stack } from "expo-router";
import { NATIVE_HEADER_BASE } from "@/lib/nativeHeaderOptions";

export default function ClimmateLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          ...NATIVE_HEADER_BASE,
          headerLargeTitle: false,
          scrollEdgeEffects: { top: "soft" },
        }}
      />
    </Stack>
  );
}
```

### Step 3: 新建 `app/(tabs)/climmate/index.tsx`

这是最核心的文件。需要合并两个文件的逻辑：
- `app/(tabs)/climmate.tsx` 的对话管理逻辑（menuOpen, listOpen, handlers）
- `src/features/coachChat/screens/CoachChatScreen.tsx` 的全部聊天渲染逻辑

**原生 Header 设置**（参考 `app/(tabs)/calendar/index.tsx` L39-48）：
```tsx
import { useNavigation } from "@react-navigation/native";
import { withHeaderTheme } from "@/lib/nativeHeaderOptions";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { MenuButton } from "@/components/sidebar/Sidebar";

useLayoutEffect(() => {
  navigation.setOptions({
    ...withHeaderTheme(colors),
    title: "Coach Paddi",
    headerLeft: () => <MenuButton />,
    headerRight: () => (
      <HeaderButton icon="ellipsis" onPress={() => setMenuOpen(true)} />
    ),
  });
}, [navigation, colors]);
```

**合并要点：**
1. 从 CoachChatScreen.tsx 复制全部 state、hooks、handlers（inputText, scrollTrigger, previewOpen, 等）
2. 从 CoachChatScreen.tsx 复制全部渲染逻辑（NativeChatScroll, MessageBubble, TaskBar, input area, overlays, sheets）
3. 移除 `embedded` prop 相关的所有条件判断
4. 移除 CoachChatScreen 内部的手动 header（lines 163-181）
5. 从 climmate.tsx 保留对话管理的 handlers（handleNewConversation, handleViewAll, handleDeleteCurrent）
6. 移除所有 PlansView / ExercisesView 引用
7. 移除 SegmentedControl（navRow, NAV_ITEMS, activeView state）
8. 背景色用 `colors.backgroundSecondary`（和原 CoachChatScreen 一致）

**底部区域布局（TaskBar 改为 flow layout 后）：**
```
KeyboardAvoidingView (absolute, bottom: 0)
  └─ View (paddingBottom: insets.bottom + NATIVE_TAB_BAR_HEIGHT + 12)
      ├─ TaskBar (flow layout, 不再绝对定位)
      └─ Input bar (GlassView + NativeTextView)
```

**NativeChatScroll contentPaddingBottom 动态计算：**
```tsx
const NATIVE_TAB_BAR_HEIGHT = 49;
const bottomBarHeight = (coach.taskBarVisible ? 44 : 0) + inputHeight + 24 + insets.bottom + NATIVE_TAB_BAR_HEIGHT;
```

**ModeIndicator 位置：** 保持在 nav bar 正下方（原来的位置不变）

## 需要读取的参考文件
- `app/(tabs)/climmate.tsx` — 当前实现（要删除）
- `src/features/coachChat/screens/CoachChatScreen.tsx` — 核心逻辑来源（之后会被删除）
- `app/(tabs)/calendar/_layout.tsx` — _layout 模板
- `app/(tabs)/calendar/index.tsx` — useLayoutEffect + navigation.setOptions 模板
- `src/lib/nativeHeaderOptions.ts` — NATIVE_HEADER_BASE, withHeaderTheme
- `src/components/ui/HeaderButton.tsx` — 原生按钮
- `src/components/sidebar/Sidebar.tsx` — MenuButton export

## 注意事项
- `app/(tabs)/_layout.tsx` 中 NativeTabs.Trigger `name="climmate"` 不需要改，Expo Router 会自动解析目录
- 不要使用 `headerLargeTitle: true`，聊天页面用普通小标题
- `scrollEdgeEffects: { top: "soft" }` 配合 NativeChatScroll（SwiftUI ScrollView），nav bar 可能无法追踪滚动位置，会保持 compact 半透明状态——这是预期行为
- import 路径注意：目录从 `app/(tabs)/climmate/index.tsx` 到 `src/` 需要用 `../../../src/` 或 `@/` alias
