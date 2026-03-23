# ScrollEdgeEffect Native Module — 执行归档

## 目标
在 Coach 聊天页面实现 iOS 26 原生的滚动边缘模糊效果，让聊天内容在接近输入框/tab bar 时自然渐隐模糊，替代 LinearGradient 方案。

## 最终状态：✅ 模块已挂载，效果待验证

### 已完成
1. **创建了 Expo 本地原生模块** `modules/scroll-edge-effect/`
2. **模块成功编译并加载**，Metro 日志确认 `ok: iOS 26.0, interaction attached`
3. **输入框改为 GlassView 液态玻璃效果**（`expo-glass-effect`）
4. **删除了 LinearGradient 方案**

### 待验证
- `bottomEdgeEffect.style = .soft` 的视觉效果是否明显
- `UIScrollEdgeElementContainerInteraction` 透明 overlay 方案是否生效
- 如效果仍不明显，可能需要在真机上测试（模拟器渲染可能不同）

## 文件清单

### 原生模块 `modules/scroll-edge-effect/`
| 文件 | 作用 |
|------|------|
| `expo-module.config.json` | Expo 模块注册配置 |
| `package.json` | 包信息（autolinking 必需） |
| `ios/ScrollEdgeEffect.podspec` | CocoaPods 配置（编译必需） |
| `ios/ScrollEdgeContainerModule.swift` | 核心 Swift 模块 |
| `src/index.ts` | JS 入口（autolinking 需要） |

### JS 侧
| 文件 | 作用 |
|------|------|
| `src/components/native/ScrollEdgeContainer.tsx` | `useScrollEdgeEffect` hook |
| `src/features/coachChat/screens/CoachChatScreen.tsx` | 使用 hook + GlassView 输入框 |

## 技术方案演进

### 方案 1: LinearGradient ❌ 已弃用
- `"transparent"` = `rgba(0,0,0,0)` 导致黑色斑块
- 改为 `rgba(247,247,247,0)` 后只有颜色渐变，无模糊效果
- 用户要求模糊+渐隐，不只是颜色淡出

### 方案 2: 堆叠 BlurView ❌ 用户拒绝
- 多层 BlurView 从 intensity 10→40 堆叠
- 用户认为太 hacky，不够原生

### 方案 3: Expo Module + Native View ❌ Fabric 不兼容
- 用 `View()` 定义原生视图组件
- Fabric (New Architecture) 报错 `Unimplemented component: ViewManagerAdapter`

### 方案 4: Expo Module + nativeID 查找 ❌ Fabric 属性不匹配
- 用 `AsyncFunction` + `nativeID` 字符串在 view hierarchy 查找
- Fabric 中 `nativeID` prop 不映射到 UIKit `nativeID` 也不映射到 `accessibilityIdentifier`
- KVC 查到的 `nativeId` 是数字 tag，不是 JS 设置的字符串

### 方案 5: findNodeHandle + tag ❌ Fabric tag 不在 UIView 上
- `findNodeHandle()` 返回 React tag（如 954, 988）
- Fabric 不把这些 tag 存在 `UIView.tag` 或 `reactTag` 属性上

### 方案 6: measureInWindow + 坐标定位 ✅ 当前方案
- JS 侧用 `ref.measureInWindow()` 获取输入框绝对坐标
- Swift 侧在该坐标创建透明 overlay UIView
- 自动找最大的 UIScrollView（FlatList）
- 两路并行：
  - `scrollView.bottomEdgeEffect.style = .soft`
  - `UIScrollEdgeElementContainerInteraction` 挂在 overlay 上

## 关键发现（Fabric/New Architecture）

1. **`nativeID` prop 在 Fabric 中不映射到 UIKit 任何标准属性**
   - 不是 `UIView.nativeID`，不是 `accessibilityIdentifier`
   - `RCTViewComponentView.nativeId` 存的是内部数字 tag，不是 JS 字符串

2. **`testID` prop 也不映射到 `accessibilityIdentifier`**
   - 虽然理论上 Fabric 代码有映射，实际 dump 显示全空

3. **`findNodeHandle()` 返回的 React tag 无法在 UIView 层找到**
   - Fabric 不在 `UIView.tag` 或 KVC `reactTag` 上存储

4. **Expo Module 的 `View()` 定义在 Fabric 下不可用**
   - `RCTViewManager` → `ViewManagerAdapter` 在 Fabric 未实现

5. **正确的 `UIScrollEdgeEffect` API**
   - `bottomEdgeEffect` 是 readonly 对象，设置 `.style` 属性
   - `UIScrollEdgeEffect.Style` 有 `.soft`、`.hard`、`.automatic`
   - ObjC 的 `softStyle` 在 Swift 中被重命名为 `.soft`

## Expo 本地模块注册流水线
```
expo-module.config.json（找到模块）
  → package.json（autolinking 识别包）
    → .podspec（CocoaPods 编译）
      → ExpoModulesProvider.swift（运行时注册）
```
**缺少任一文件都会导致模块无法加载。**

## 输入框样式（当前状态）
```tsx
<View ref={containerRef} style={{ paddingBottom: insets.bottom + NATIVE_TAB_BAR_HEIGHT + 12 }}>
  <View style={{ borderRadius: 22, overflow: "hidden", marginHorizontal: 18, borderWidth: 0.3, borderColor: "rgba(0,0,0,0.12)" }}>
    <GlassView glassEffectStyle="regular" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
    <TextInput ... />
  </View>
</View>
```
- GlassView 液态玻璃效果（同原生 tab bar）
- borderRadius: 22, marginHorizontal: 18
- borderWidth: 0.3, borderColor: rgba(0,0,0,0.12) 微边框

## 后续可选优化
- [ ] 真机测试效果（模拟器可能不完整渲染 iOS 26 玻璃效果）
- [ ] 如果 `.soft` 效果不明显，尝试 `.hard`
- [ ] 考虑是否需要将 overlay 替换为带 `UIVisualEffectView` 的容器
- [ ] 确认 `findAllScrollViews` 选中的确实是聊天 FlatList（多 tab 场景可能误选）
