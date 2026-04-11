# Window P: Community Gyms Tab 重构

## Context

Community 页面 Gyms tab 存在 3 层嵌套导航，认知负担过重。本次分两步重构：
1. **方案 A**（已完成）：Gym 选择器从横向滚动 pill 列表改为 Dropdown Pill + TrueSheet Bottom Sheet
2. **方案 B**（本次执行）：将 Activity 内的 Sessions/Posts sub-tab 提升为一级 tab，完全去掉 sub-tab 层

### 重构前
```
Gym Dropdown Pill (方案A已完成)
└─ Dashboard / Activity / Members          ← NativeSegmentedControl (3 tabs)
     └─ (Activity 内) Sessions / Posts     ← SegmentedToggle sub-tab
```

### 重构后
```
Gym Dropdown Pill
└─ Dashboard / Sessions / Activity / Members   ← NativeSegmentedControl (4 tabs)
```

- "Sessions" = 原 Activity→Sessions（GymActivityFeed，含 KPI 行 + session 列表）
- "Activity" = 原 Activity→Posts（GymPostsView，改名为 Activity）

---

## 修改文件

### P1. 修改 `src/features/community/gyms/GymCommunityTabs.tsx`

**当前代码关键部分：**

```typescript
// L6:  import SegmentedToggle from '@/components/ui/SegmentedToggle';
// L12: type GymTab = 'Dashboard' | 'Activity' | 'Members';
// L13: type ActivitySubTab = 'Sessions' | 'Posts';
// L15: const GYM_TABS: GymTab[] = ['Dashboard', 'Activity', 'Members'];
// L16: const ACTIVITY_SUB_TABS: ActivitySubTab[] = ['Sessions', 'Posts'];
// L29: const [activitySubTab, setActivitySubTab] = useState<ActivitySubTab>('Sessions');
// L47-61: Activity tab 内嵌套 SegmentedToggle + 条件渲染
// L83-87: subSegmentWrap 样式
```

**改动：**

1. **删除 import**：移除 `SegmentedToggle` import（L6）

2. **修改类型和常量**：
   ```typescript
   type GymTab = 'Dashboard' | 'Sessions' | 'Activity' | 'Members';
   const GYM_TABS: GymTab[] = ['Dashboard', 'Sessions', 'Activity', 'Members'];
   ```
   删除 `ActivitySubTab` 类型和 `ACTIVITY_SUB_TABS` 常量

3. **删除 state**：移除 `activitySubTab` useState（L29）

4. **替换渲染逻辑**（L42-61），改为 4 个平级分支：
   ```tsx
   {activeTab === 'Dashboard' && (
     <GymDashboardTab isFavorited={isFavorited} onToggleFavorite={onToggleFavorite} />
   )}

   {activeTab === 'Sessions' && <GymActivityFeed gymId={gymId} />}

   {activeTab === 'Activity' && <GymPostsView gymId={gymId} />}

   {activeTab === 'Members' && (
     <GymMemberList
       gymId={gymId}
       onPressUser={(userId) => router.push(`/community/u/${userId}`)}
     />
   )}
   ```

5. **删除样式**：移除 `subSegmentWrap`（L83-87）

### P2. 删除 `src/components/ui/SegmentedToggle.tsx`

该文件是上一轮为 sub-tab 创建的自定义 toggle 组件，现在不再需要，直接删除。

---

## 验证清单

- [ ] NativeSegmentedControl 显示 4 个 tab：Dashboard / Sessions / Activity / Members
- [ ] Sessions tab 显示 KPI 行 + session 列表（GymActivityFeed）
- [ ] Activity tab 显示 posts feed（GymPostsView）
- [ ] Dashboard 和 Members tab 功能不变
- [ ] 无残留 sub-tab、SegmentedToggle 引用或样式
- [ ] 删除 `SegmentedToggle.tsx` 后无 import 报错
