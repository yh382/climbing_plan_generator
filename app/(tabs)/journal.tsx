// app/(tabs)/journal.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { useSettings } from "../contexts/SettingsContext";

type GradeLog = {
  id: string;
  date: string;
  type: "boulder" | "yds";
  grade: string;   // 内部统一用 V* 或 5.* 作为键
  count: number;
};

const LOGS_KEY = "@climb_logs";

const V_GRADES = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10"];
const YDS_GRADES = [
  "5.6","5.7","5.8","5.9",
  "5.10a","5.10b","5.10c","5.10d",
  "5.11a","5.11b","5.11c","5.11d",
  "5.12a","5.12b","5.12c","5.12d",
  "5.13a","5.13b","5.13c","5.13d",
  "5.14a","5.14b","5.14c","5.14d",
];

const YDS_TO_FRENCH: Record<string, string> = {
  "5.6":"5a","5.7":"5b","5.8":"5c","5.9":"6a",
  "5.10a":"6a+","5.10b":"6a+","5.10c":"6b","5.10d":"6b+",
  "5.11a":"6c","5.11b":"6c+","5.11c":"7a","5.11d":"7a+",
  "5.12a":"7b","5.12b":"7b+","5.12c":"7c","5.12d":"7c+",
  "5.13a":"7c+","5.13b":"8a","5.13c":"8a+","5.13d":"8b",
  "5.14a":"8b+","5.14b":"8c","5.14c":"8c+","5.14d":"9a",
};

const V_TO_FONT: Record<string, string> = {
  V0:"4", V1:"5", V2:"5+", V3:"6A", V4:"6B",
  V5:"6C", V6:"7A", V7:"7A+", V8:"7B", V9:"7C", V10:"7C+",
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function startOfWeek(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; }
function inSameWeek(dateStr: string, base = new Date()) {
  const d = new Date(dateStr + "T00:00:00");
  const start = startOfWeek(base);
  const end = new Date(start); end.setDate(start.getDate()+7);
  return d >= start && d < end;
}

const COLOR = {
  lightgreen: "#86efac",
  green: "#16a34a",
  yellow: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  purple: "#a855f7",
  blue: "#3b82f6",
  gray: "#6b7280",
  black: "#111827",
};
const colorForBoulder = (grade: string) => {
  const g = grade.toUpperCase();
  if (g === "V0") return COLOR.lightgreen;
  if (g === "V1") return COLOR.green;
  if (g === "V2") return COLOR.yellow;
  if (g === "V3") return COLOR.orange;
  if (g === "V4") return COLOR.red;
  if (g === "V5") return COLOR.purple;
  if (g === "V6") return COLOR.blue;
  if (g === "V7") return COLOR.gray;
  return COLOR.black;
};
const colorForYDS = (grade: string) => {
  const g = grade.toLowerCase();
  if (g === "5.6") return COLOR.lightgreen;
  if (g === "5.7") return COLOR.green;
  if (g === "5.8") return COLOR.yellow;
  if (g === "5.9") return COLOR.orange;
  if (g.startsWith("5.10")) return COLOR.red;
  if (g.startsWith("5.11")) return COLOR.purple;
  if (g.startsWith("5.12")) return COLOR.blue;
  if (g.startsWith("5.13")) return COLOR.gray;
  return COLOR.black;
};


const DonutRing = ({
  total,
  parts,
  colorOf,
  size = 140,
  stroke = 14,
}: {
  total: number;
  parts: { grade: string; count: number }[];
  colorOf: (g: string) => string;
  size?: number;
  stroke?: number;
}) => {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;

  // 只画 count>0 的段
  const segs = parts.filter(p => p.count > 0);
  const n = segs.length;
  let acc = 0;                 // 已累计的周长
  const EPS = 1e-4;

  return (
    <Svg width={size} height={size}>
      {/* ⚠️ 没有数据才显示底环；有数据时不画底色，避免透出 */}
      {total === 0 && (
        <Circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
      )}

      {/* 先把坐标系：旋到 12 点起始，再水平镜像 → 逆时针绘制 */}
      <G transform={`rotate(-90 ${size/2} ${size/2}) scale(-1,1) translate(-${size},0)`}>
        {total > 0 && segs.map((p, i) => {
          // 该段理论长度
          const raw = (p.count / total) * C;
          // 让最后一段吞掉剩余，确保正好闭环在 12 点
          const len = (i === n - 1) ? Math.max(EPS, C - acc) : Math.min(raw, Math.max(EPS, C - acc));
          const gap = Math.max(EPS, C - len);
          const offset = acc;   // 从 12 点起逆时针累加

          acc += len;

          return (
            <Circle
              key={`donut-${p.grade}`}
              cx={size/2}
              cy={size/2}
              r={r}
              stroke={colorOf(p.grade)}
              strokeWidth={stroke}
              strokeLinecap="butt"   // butt/square 都可；避免圆帽造成缝
              fill="none"
              strokeDasharray={`${len} ${gap}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </G>
    </Svg>
  );
};



export default function Journal() {
  const { boulderScale, ropeScale, lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  const [mode, setMode] = useState<"boulder" | "yds">("boulder");
  const [logs, setLogs] = useState<GradeLog[]>([]);
  const [action, setAction] = useState<"add" | "sub">("add"); // 顶部动作切换

  // 读取日志
  useEffect(() => {
    (async () => {
      try {
        const rawLogs = await AsyncStorage.getItem(LOGS_KEY);
        setLogs(rawLogs ? JSON.parse(rawLogs) : []);
      } catch {
        setLogs([]);
      }
    })();
  }, []);

  const save = async (next: GradeLog[]) => {
    setLogs(next);
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(next));
  };

  // +1：直接在当天追加一条
  const addOne = async (grade: string) => {
    const entry: GradeLog = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
      date: todayStr(),
      type: mode,
      grade,
      count: 1,
    };
    await save([entry, ...logs]);
  };

  // -1：从最近到最早，按 mode+grade 扣减 1；遇到 0 删条
  const subOne = async (grade: string) => {
    let remain = 1;
    const next = [...logs];
    for (let i = 0; i < next.length && remain > 0; i++) {
      const l = next[i];
      if (l.type !== mode || l.grade !== grade) continue;
      if (l.count <= remain) {
        remain -= l.count;
        next.splice(i, 1);
        i--;
      } else {
        l.count -= remain;
        remain = 0;
      }
    }
    await save(next);
  };

  // 胶囊点击动作（根据当前 action 切换）
  const onCapsulePress = (g: string) => {
    if (action === "add") addOne(g);
    else subOne(g);
  };

  const todayTotal = useMemo(() => {
    return logs
      .filter(l => l.date === todayStr() && l.type === mode)
      .reduce((sum, l) => sum + l.count, 0);
  }, [logs, mode]);


  // 本周统计
  const weekStats = useMemo(() => {
    const base = new Date();
    const curList = mode === "boulder" ? V_GRADES : YDS_GRADES;
    const curMap: Record<string, number> = {};
    let total = 0;
    logs.forEach((l) => {
      if (!inSameWeek(l.date, base)) return;
      if (l.type !== mode) return;
      curMap[l.grade] = (curMap[l.grade] || 0) + l.count;
      total += l.count;
    });
    const list = curList.map((g) => ({ grade: g, count: curMap[g] || 0 })).filter((x) => x.count > 0);
    return { total, list };
  }, [logs, mode]);

  // 总计
  const totalStats = useMemo(() => {
    const curList = mode === "boulder" ? V_GRADES : YDS_GRADES;
    const curMap: Record<string, number> = {};
    let all = 0;
    logs.forEach((l) => {
      if (l.type !== mode) return;
      curMap[l.grade] = (curMap[l.grade] || 0) + l.count;
      all += l.count;
    });
    const list = curList.map((g) => ({ grade: g, count: curMap[g] || 0 })).filter((x) => x.count > 0);
    return { all, list };
  }, [logs, mode]);

  const ModeSwitch = () => (
    <View style={{ marginTop: 10, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
      <View style={{ flex: 1, alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => setMode("boulder")}
          style={{
            paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
            backgroundColor: mode === "boulder" ? "#4f46e5" : "#f3f4f6",
          }}
        >
          <Text style={{ color: mode === "boulder" ? "white" : "#111827", fontWeight: "700" }}>
            {tr("记录抱石等级", "Log bouldering grades")}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => setMode("yds")}
          style={{
            paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
            backgroundColor: mode === "yds" ? "#4f46e5" : "#f3f4f6",
          }}
        >
          <Text style={{ color: mode === "yds" ? "white" : "#111827", fontWeight: "700" }}>
            {tr("记录难度等级", "Log rope grades")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ActionSwitch = () => (
    <View style={{ flexDirection: "row", alignSelf: "center", gap: 8, marginBottom: 8 }}>
      <TouchableOpacity
        onPress={() => setAction("add")}
        style={{
          paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
          backgroundColor: action === "add" ? "#16a34a" : "#f3f4f6",
        }}
      >
        <Text style={{ color: action === "add" ? "white" : "#111827", fontWeight: "700" }}>
          {tr("添加 +", "Add +")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setAction("sub")}
        style={{
          paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999,
          backgroundColor: action === "sub" ? "#ef4444" : "#f3f4f6",
        }}
      >
        <Text style={{ color: action === "sub" ? "white" : "#111827", fontWeight: "700" }}>
          {tr("删减 -", "Delete -")}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // 等级胶囊（根据模式动态生成，自动应用 Font/French 文案）
  const GradeCapsules = () => {
    const grades = mode === "boulder" ? V_GRADES : YDS_GRADES;
    const labelOf = (g: string) => {
      if (mode === "boulder") return (boulderScale === "Font" ? (V_TO_FONT[g] || g) : g);
      return (ropeScale === "French" ? (YDS_TO_FRENCH[g] || g) : g);
    };
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {grades.map((g) => (
          <TouchableOpacity
            key={`cap-${mode}-${g}`}
            onPress={() => onCapsulePress(g)}
            style={{
              paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999,
              borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#f9fafb",
            }}
          >
            <Text style={{ fontWeight: "700", color: "#111827" }}>{labelOf(g)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const Pill = ({ text }: { text: string }) => (
    <View
      style={{
        paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8,
        borderWidth: 1, borderColor: "#e5e7eb", marginRight: 8, marginBottom: 8, backgroundColor: "#f9fafb",
      }}
    >
      <Text style={{ color: "#111827" }}>{text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <ModeSwitch />

      {/* 记录卡片：上方动作切换 + 等级胶囊 */}
      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "white", marginBottom: 12, padding: 12 }}>
        <Text style={{ fontWeight: "700", marginBottom: 6 }}>
          {(mode === "boulder" ? tr("抱石等级", "Bouldering") : tr("难度等级", "Rope"))}
          {" · "}
          {tr("今天", "Today")}（{todayStr()}）
        </Text>



        <ActionSwitch />

        {/* 等级胶囊（点击即 +1 / -1） */}
        <ScrollView
          horizontal={false}
          contentContainerStyle={{ paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
        >
          <GradeCapsules />
        </ScrollView>

        <Text style={{ marginTop: 8, color: "#6b7280" }}>
          {action === "add"
            ? tr("点对应胶囊即可添加 1 条记录", "Tap a capsule to add 1 route")
            : tr("点对应胶囊即可删减 1 条记录（从最近记录回退）", "Tap a capsule to subtract 1 (removes from most recent)")}
        </Text>
      </View>

      {/* 今日总数徽标 */}
      <View style={{ alignItems: "center", marginBottom: 8 }}>
        <View
          style={{
            minWidth: 40,
            paddingHorizontal: 12,
            height: 32,
            borderRadius: 16,
            backgroundColor: "#4f46e5",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>
            {tr("今日总数", "Today")} · {todayTotal}
          </Text>
        </View>
      </View>


      {/* 数据可视化 */}
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "white", padding: 12 }}>
        <View style={{ width: 160, alignItems: "center", justifyContent: "center" }}>
          <DonutRing
            total={weekStats.total}
            parts={weekStats.list}
            colorOf={mode === "boulder" ? colorForBoulder : colorForYDS}
          />
          <Text style={{ marginTop: 8, fontWeight: "700" }}>
            {(mode === "boulder" ? tr("抱石", "Boulder") : tr("难度", "Rope"))}
            {" · "}
            {tr("本周", "This week")} {weekStats.total}
          </Text>
        </View>

        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start" }}>
          {weekStats.list.length === 0 ? (
            <Text style={{ color: "#9ca3af" }}>{tr("暂无本周记录", "No records this week")}</Text>
          ) : (
            weekStats.list.map((it) => (
              <Pill key={`week-${it.grade}`} text={`${it.grade} × ${it.count}`} />
            ))
          )}
        </View>
      </View>

      {/* 底部总计 */}
      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 12, backgroundColor: "white" }}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>
          {(mode === "boulder" ? tr("抱石", "Boulder") : tr("难度", "Rope"))}
          {" · "}
          {tr("总条数", "Total")}（{totalStats.all}）
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {totalStats.list.length === 0 ? (
            <Text style={{ color: "#9ca3af" }}>{tr("暂无记录", "No records")}</Text>
          ) : (
            totalStats.list.map((it) => <Pill key={`total-${it.grade}`} text={`${it.grade} × ${it.count}`} />)
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}



