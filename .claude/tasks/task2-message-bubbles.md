# Task 2: MessageBubble + ThinkingBubble 重新设计

## 目标
AI 消息去掉气泡（文字直接显示在背景上），参考 GitHub Copilot 移动端风格。用户消息保留气泡。ThinkingBubble 同步适配。

---

## Part A: MessageBubble.tsx

**文件:** `src/features/coachChat/components/MessageBubble.tsx`

### 当前样式
- User: 右对齐, `backgroundColor: colors.accent`, 白字, borderRadius 18, maxWidth 86%
- AI: 左对齐, `backgroundColor: colors.bubbleAI`, `borderWidth: 0.8`, `borderColor: colors.bubbleAIBorder`, `color: colors.bubbleAIText`, borderRadius 18, maxWidth 86%

### 目标样式
- **User: 不变** — 保持右对齐 accent 气泡
- **AI: 去掉气泡** — 无背景色, 无边框, 无 borderRadius, 文字直接显示在页面背景上

### 具体改动

修改 Pressable 的 style，根据 `isUser` 分开：

**AI 消息 (isUser === false):**
- 移除: `backgroundColor: colors.bubbleAI`
- 移除: `borderWidth: 0.8`, `borderColor: colors.bubbleAIBorder`
- 移除: `borderRadius: 18`
- `paddingHorizontal: 0`（无气泡不需要内边距）
- `paddingVertical: 0`
- `maxWidth: "92%"`（比 86% 更宽，AI 文本可以更充分展示）

**AI 文字样式:**
- `color: colors.textPrimary`（替代 `colors.bubbleAIText`）
- `lineHeight: 22`（替代 18，更好的阅读体验）
- `fontSize: 15` 不变

**User 消息:** 完全不变

### Typewriter 流式效果
逻辑完全保留，不改任何 streaming 相关的 state/effect/handler。只改视觉样式。

### 代码参考

当前 lines 67-87 的 return 部分改为：

```tsx
return (
  <View style={{
    paddingHorizontal: 16,
    paddingVertical: isUser ? 6 : 8,
    alignItems: isUser ? "flex-end" : "flex-start",
  }}>
    <Pressable
      onPress={handleTap}
      disabled={!isStreaming}
      style={isUser ? {
        maxWidth: "86%",
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: colors.accent,
      } : {
        maxWidth: "92%",
        paddingHorizontal: 0,
        paddingVertical: 0,
      }}
    >
      <Text style={{
        color: isUser ? "#FFF" : colors.textPrimary,
        lineHeight: isUser ? 18 : 22,
        fontSize: 15,
        fontFamily: theme.fonts.regular,
      }}>
        {displayText}
        {isStreaming && displayLen < msg.text.length ? "\u258C" : ""}
      </Text>
    </Pressable>
  </View>
);
```

---

## Part B: ThinkingBubble.tsx

**文件:** `src/features/coachChat/components/ThinkingBubble.tsx`

### 当前样式
三个脉冲点包裹在气泡里：`borderRadius: 18`, `paddingHorizontal: 18`, `paddingVertical: 14`, `backgroundColor: colors.bubbleAI`, `borderWidth: 0.8`, `borderColor: colors.bubbleAIBorder`

### 目标样式
脉冲点直接显示在背景上，无气泡包裹

### 具体改动

修改 ThinkingBubble 函数内的内部 View（lines 60-76）：

```tsx
export default function ThinkingBubble() {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 8, alignItems: "flex-start" }}>
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          paddingVertical: 4,
          // 不要 borderRadius, backgroundColor, borderWidth, borderColor
        }}
      >
        <PulsingDot delay={0} />
        <PulsingDot delay={150} />
        <PulsingDot delay={300} />
      </View>
    </View>
  );
}
```

移除: `borderRadius: 18`, `paddingHorizontal: 18`, `paddingVertical: 14`, `backgroundColor: colors.bubbleAI`, `borderWidth: 0.8`, `borderColor: colors.bubbleAIBorder`

PulsingDot 组件不需要改动。

`const colors = useThemeColors()` 如果 ThinkingBubble 本体不再使用 colors（只有 PulsingDot 用），可以从 ThinkingBubble 中移除，但 PulsingDot 自己有 `const colors = useThemeColors()`，所以不影响。

---

## 需要读取的文件
- `src/features/coachChat/components/MessageBubble.tsx`
- `src/features/coachChat/components/ThinkingBubble.tsx`
