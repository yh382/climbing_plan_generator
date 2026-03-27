# Task 3: TaskBar 改为流式布局

## 目标
TaskBar 从绝对定位改为 flow layout，在输入框上方正常排列。

## 文件
`src/features/coachChat/components/TaskBar.tsx`

## 当前实现
- `position: "absolute"`, `left: 0`, `right: 0`, `bottom: insets.bottom + 113`
- 使用 `useSafeAreaInsets()` 计算底部位置
- Reanimated 动画：`opacity` + `translateY` 控制显隐
- 3 个 pill 按钮: Plan | Actions | Analysis

## 目标实现
- 改为普通 flex 布局（不再绝对定位）
- 由父组件（climmate/index.tsx）在 KeyboardAvoidingView 内控制位置
- 保留 Reanimated 显隐动画
- `visible=false` 时高度需要折叠（避免占空间）

## 具体改动

### 1. 移除绝对定位
`container` style 改为:
```tsx
container: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 8,
  gap: 12,
  paddingHorizontal: 16,
  // 移除: position, left, right, bottom
},
```

### 2. 移除 useSafeAreaInsets
不再需要 insets 计算底部位置。移除 import 和 `const insets = useSafeAreaInsets()`。

### 3. 高度折叠处理
当 `visible=false` 时，TaskBar 不应占据空间。两种方案：

**方案 A（推荐）: 使用 Reanimated height 动画**
```tsx
const height = useSharedValue(visible ? 60 : 0);  // 60 = paddingVertical*2 + chip height

useEffect(() => {
  opacity.value = withTiming(visible ? 1 : 0, { duration: 300 });
  translateY.value = withTiming(visible ? 0 : 20, { duration: 300 });
  height.value = withTiming(visible ? 60 : 0, { duration: 300 });
}, [visible]);

const animStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ translateY: translateY.value }],
  height: height.value,
  overflow: 'hidden',
}));
```

**方案 B: 条件渲染**
父组件用 `{coach.taskBarVisible && <TaskBar ... />}` 但这会丢失动画效果。

选择方案 A。

### 4. chip 和 label 样式不变

## 完整的修改后的 container style
```tsx
const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    // 无 position/left/right/bottom
  },
  // chip 和 label 样式不变
});
```

## 需要读取的文件
- `src/features/coachChat/components/TaskBar.tsx`

## 注意
- 这个改动需要配合 Task 1 的 climmate/index.tsx 布局。Task 1 会在 KeyboardAvoidingView 内将 TaskBar 放在 input bar 上方
- 改完后 TaskBar 不再自行决定位置，由父组件控制
