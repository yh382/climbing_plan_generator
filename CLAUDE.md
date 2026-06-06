# ClimMate Mobile App — Claude Rules

> **运行在 `climbing_plan_generator/` codebase（RN 0.83.2 + Expo 55 + Expo Router + Zustand 5）**
>
> Single source of truth：[`../CLAUDE.md`](../CLAUDE.md)（meta repo 主索引）。本文件只列**该 codebase 专属硬规则 + 启动 commands**，避免与主索引 drift。

## 链接

- 主索引：[`../CLAUDE.md`](../CLAUDE.md)
- 项目地图（FE 详细）：[`../docs/maps/FRONTEND_MAP.md`](../docs/maps/FRONTEND_MAP.md)
- 数据流：[`../docs/maps/data-flows/`](../docs/maps/data-flows/)
- Native UI / Theme / R2 操作手册：[`../docs/EXEC_PREREQS.md`](../docs/EXEC_PREREQS.md)
- 通用 Claude 协作 skill：[`../docs/CLAUDE_WORK_PATTERNS.md`](../docs/CLAUDE_WORK_PATTERNS.md)

## Codebase 专属硬规则（精简版 — 详细看 [`../CLAUDE.md`](../CLAUDE.md)）

### Native UI（Expo 55，iOS deployment target 17.0）

- 用 `NATIVE_HEADER_BASE` / `NATIVE_HEADER_LARGE` from `src/lib/nativeHeaderOptions.ts` + `HeaderButton`（SF Symbols）
- 用 `TrueSheet`（`@lodev09/react-native-true-sheet`）— **不用** `Modal + PanResponder`
- 用 `NativeSegmentedControl`（`@react-native-segmented-control/segmented-control`）— 但只在「切换显示什么内容」(view tabs) 场景；「设属性」走 `MenuPill`（见下）
- **Inline option menus** — 用 `MenuPill`（`src/components/ui/MenuPill.tsx`，包装 `@expo/ui/swift-ui Menu`，跟 `Stack.Toolbar.Menu` 同一 UIMenu API，只是 inline 用）。规约：内容区一切「tap 弹一组选项让用户选 1」（block type ▾ / load unit ▾ / 3-dot 更多 / 列表卡片操作菜单 …）**默认走 MenuPill**，而非 `ActionSheetIOS`：UIMenu 在 trigger 处弹 popover、感觉轻，ActionSheet 从底部滑入像 modal、心智重；ActionSheet 仅保留给真正破坏性 + 多步 / 全局动作（sign out / 删整张 plan 这种）。Working example: [app/library/template-builder.tsx](app/library/template-builder.tsx) (block type / load unit / 3-dot 三处都是 MenuPill)。两 variant：`dots`（3 点 icon）/ `labeled`（"Main ⌄" 文字 + chevron）。两者都 native iOS UIMenu，免去任何手画 popover / sheet 容器。
- `ActionSheetIOS` — **仅在** 上述例外（破坏性多步 / 全局动作）使用，OR 当 trigger 不是固定 button（页面点击屏幕空白处弹起 sheet 等）；其余场景一律 MenuPill。
- **FormSheet route** — focused task / picker / info sheet 走 expo-router `Stack.Screen presentation:"formSheet"` + `sheetAllowedDetents` + `sheetGrabberVisible: true`；**三约束**：(a) route 文件必须 `app/` root（不在 nested directory 含 `_layout.tsx` 下），(b) Stack.Screen 注册必须根 `app/_layout.tsx`，(c) **禁用 in-screen `<Stack.Screen options>`** — 实测它是 REPLACE 不是 merge，会冲掉 `presentation:"formSheet"` + 其他 sheet config，formSheet 退化到普通 push。不满足任一 → fallback 到普通 push 动画。UIKit 容器自动 nav bar / Liquid Glass / grabber / detents / cornerRadius。Working pattern: [app/recent-climbs.tsx](app/recent-climbs.tsx) / [app/body-info.tsx](app/body-info.tsx) / [app/csm-help.tsx](app/csm-help.tsx)。i18n title 走 `useNavigation().setOptions({ title })`（这个 API merge 正确）；_layout 提供 English fallback title 兜底首帧。

#### FormSheet Handoff Pattern（sheet-container-audit A1 标准化 2026-05-10）

FormSheet route 跨在 caller JSX 树之外 → 经典 `visible/onApply` prop callback 失效。3 种 handoff 变体（全走小颗粒 zustand store, 命名 `src/store/use<Feature>SheetHandoffStore.ts` / `use<Feature>FiltersStore.ts`）：

1. **Pure picker（caller useState → store）**：filter 状态从 caller `useState` 提到 store；route 直接写 store；caller selector 订阅。例：[`useOutdoorFiltersStore`](src/store/useOutdoorFiltersStore.ts) for `outdoor-grade-range`。
2. **Input + output slots**：caller 推前 `setInput(...)` + `router.push(...)`；route 读 input + 写 output；caller `useEffect` 监 output → 消费 + 清。例：[`useOutdoorSheetHandoffStore`](src/store/useOutdoorSheetHandoffStore.ts) `editingList` / `lastCreatedList` / `lastUpdatedList` for `outdoor-create-list`。
3. **Signal-only (timestamp / nonce)**：route 发 `emitX()` → `Date.now()`；caller `useRef` 记 lastSeen，`useEffect` 仅当 newer 才响应。**避免 stale-boolean trap**。例：[`useSessionSheetHandoffStore`](src/store/useSessionSheetHandoffStore.ts) `workoutLoggedAt` for `session-log-workout`。

**Lifecycle ownership 规约**：
- Route 拥有 **output** slots 的 lifecycle — `useEffect cleanup` 清自己写的 output（防 unconsumed leak 进下次 push）
- Caller 拥有 **input** slots 的 lifecycle — 自己 push 前 set，consume 后 clear
- 多 caller 订阅同一 slot 时（如 CreateList 有 ListsSection / AddToListSheet / [listId] 3 caller），**preserved-side TrueSheet caller**（AddToListSheet）`onDidDismiss` 加 defensive `setOutput(null)` 防 stale 残留

**Modal-on-modal 风险（R9 / R10）**：preserved TrueSheet 内开 formSheet route = 双 UISheetPresentationController 栈，行为待真机验证。AddToListSheet → `/outdoor-create-list` 是首个 A1 验证点；A1.5 OutdoorSendSheet → CommentSheet 同样风险。fallback 路径：(a) 被嵌套侧也改 formSheet route（双 formSheet 栈 modal-on-modal 仍可能 break）/ (b) 内联到 caller 不再 nested。

### Theme / Dark mode

- 用 `useThemeColors()` hook + `createStyles(colors)` 工厂模式
- **never** 硬编码色值（`#306E6F` / `#1C1C1E` 等只能从 colors 拿）
- 不用 `PlatformColor`（返回 `OpaqueColorValue`，不能参与 `colors.x` 引用）

### State / API

- Zustand stores **不可跨 store import**；跨 store 组合走 hooks 或 service
- API 走 `src/features/<name>/api.ts`，**禁止** inline fetch / axios 直调
- TS types 与 backend Pydantic schema 对齐再 commit（手维护）

### i18n

- 用户字符串走 `useSettings().tr()`
- 代码 English，UI 文案 zh/en 双语

### Storage / Sync

- AsyncStorage = source of truth（local-first）
- backend sync = fire-and-forget Outbox pattern（详见 [`../docs/maps/data-flows/01-session-log-outbox.md`](../docs/maps/data-flows/01-session-log-outbox.md)）
- AsyncStorage key 命名加 `_V1` 后缀，方便未来迁移

### Native Modules（local Expo modules）

- 全 iOS-only，路径 `modules/climmate-*` / `modules/glass-effect-union/` / `modules/native-*` / `modules/status-bar-edge/`
- import 用相对路径：`from "../../modules/climmate-x/src"`（不进 package.json，不靠 symlink）
- JSX wrapper 必须 `.tsx` 不能 `.ts`
- `requireNativeView` 来自 `expo` 顶层（不是 `expo-modules-core`）
- 改了 native module Swift → 必跑 `npx expo run:ios --device` 重 build
- 工具类（如 `Color+Hex.swift`）每 module 独立一份，**不跨 module 复用**

## 启动 / 命令

```bash
# Dev server
npx expo start

# 类型检查
npx tsc --noEmit

# 真机 build（改 native module 必跑）
npx expo run:ios --device

# Pod 重装
cd ios && pod install
```

> **真机测试是硬约束** — Calendar 滑动 60fps / SwiftUI stroke 抗锯齿 / iOS 26 `.glassEffect()` 在模拟器和真机差异大。详见 [`../docs/CLAUDE_WORK_PATTERNS.md §7`](../docs/CLAUDE_WORK_PATTERNS.md)。

## 关键路径速查

| 路径 | 角色 |
|---|---|
| `app/` | Expo Router file-based routing（live `app/_layout.tsx` + `app/(drawer)/(tabs)/_layout.tsx`） |
| `src/features/<name>/` | 21 feature 模块（每个含 `api.ts` / `hooks.ts` / `types.ts` / `components/`） |
| `src/store/use*Store.ts` | 11 个 zustand store（3 persist：logs / plans / settings） |
| `src/components/{ui,layout,shared}/` | 跨 feature 组件（atoms / layout / business） |
| `src/lib/` | 19 utils（apiClient / theme / darkTheme / gradeSystem / nativeHeaderOptions / etc） |
| `src/services/stats/` | stats 集中（不要散在 feature 里） |
| `modules/` | 11 个本地 Expo modules（全 iOS-only） |
| `ios/` | Pod / Info.plist / widget extension target |
| `assets/` | 字体 (DMSans / DMMono) + 图片 |

## Review Agents（按需 spawn）

写完 code 后可在主 session 用 `Agent` tool 触发：
- `frontend-reviewer` — 检查 useThemeColors / TrueSheet / api.ts 等本 codebase 规范
- `dead-code-detector` — 删 / 重命名组件后验证 alive callers

定义见 [`../.claude/agents/`](../.claude/agents/)，使用契约见 [`../docs/CLAUDE_WORK_PATTERNS.md`](../docs/CLAUDE_WORK_PATTERNS.md) §多 agent。
