# Task 4: 清理遗留文件

## 目标
删除不再需要的文件。**必须在 Task 1 完成后执行。**

## 执行步骤

### Step 1: Grep 确认无其他引用

对每个待删文件执行 grep，确认除了已知的引用方（会被 Task 1 删除/替换的文件）外没有其他消费者：

```bash
# 检查 CoachChatScreen 引用
grep -r "CoachChatScreen" --include="*.tsx" --include="*.ts" climbing_plan_generator/

# 检查 coach.tsx 路由引用（/coach 路径）
grep -r "coach" --include="*.tsx" --include="*.ts" climbing_plan_generator/app/
grep -r "\"/coach\"" --include="*.tsx" --include="*.ts" climbing_plan_generator/src/

# 检查 PlansView 引用
grep -r "PlansView" --include="*.tsx" --include="*.ts" climbing_plan_generator/

# 检查 ExercisesView 引用
grep -r "ExercisesView" --include="*.tsx" --include="*.ts" climbing_plan_generator/
```

### Step 2: 删除文件

确认无意外引用后删除：

1. `app/coach.tsx` — 独立 Coach 路由，Climmate tab 是唯一入口
2. `src/features/coachChat/screens/CoachChatScreen.tsx` — 逻辑已合并到 `app/(tabs)/climmate/index.tsx`
3. `src/features/coachChat/components/PlansView.tsx` — Plans 已移至侧边栏
4. `src/features/coachChat/components/ExercisesView.tsx` — Exercises 已移至侧边栏

### Step 3: 检查构建

删除后确认没有 import 报错：
```bash
npx tsc --noEmit
```

## 注意事项
- **必须等 Task 1 完成**，因为 Task 1 会创建新的 `climmate/index.tsx` 来替代这些文件
- 如果 grep 发现意外引用（不在 climmate.tsx 或 coach.tsx 中的），不要删除，报告问题
- `src/features/coachChat/screens/` 目录删除 CoachChatScreen.tsx 后如果为空，可以删除整个 `screens/` 目录
- `router.push("/coach")` 如果在其他地方有引用，需要改为跳转到 climmate tab（但根据当前架构，coach 路由只在 app/coach.tsx 存在，没有其他地方 push 到它）
