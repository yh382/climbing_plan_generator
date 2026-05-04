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
- 用 `ActionSheetIOS` — **不用** `SmartBottomSheet` (menu mode)
- 用 `NativeSegmentedControl`（`@react-native-segmented-control/segmented-control`）

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
