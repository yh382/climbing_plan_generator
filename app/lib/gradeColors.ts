// app/lib/gradeColors.ts

// —— 1) 保留你现有的颜色常量（不改动已有键值）——
export const COLOR = {
  lightgreen: "#86efac",
  green: "#16a34a",
  yellow: "#f59e0b",
  orange: "#f97316",
  red: "#ef4444",
  purple: "#a855f7",
  blue: "#3b82f6",
  gray: "#6b7280",
  black: "#111827",

  // —— 新增色相（用于更高等级 & 明度分级）——
  teal: "#14b8a6",     // teal-500
  cyan: "#06b6d4",     // cyan-500
  indigo: "#6366f1",   // indigo-500
  violet: "#8b5cf6",   // violet-500
  fuchsia: "#d946ef",  // fuchsia-500
  pink: "#ec4899",     // pink-500
  rose: "#f43f5e",     // rose-500
  amber500: "#f59e0b", // 已有 yellow 接近 amber-500
  amber700: "#b45309", // amber-700（与 yellow/amber-500 区分）
  slate700: "#334155", // 作为黑色的可读性替代
} as const;

// —— 2) 为“同色不同明度”准备一套稳定的分级（300 / 500 / 700 / 900）——
// 说明：仅用于新增色相（indigo/fuchsia/rose/teal/cyan/violet/pink/amber），不影响你现有色。
const SHADE_TABLE: Record<
  keyof typeof COLOR,
  { light: string; base: string; deep: string; darkest: string } | undefined
> = {
  // 这些键要与上方 COLOR 中的键一致
  indigo:   { light: "#a5b4fc", base: "#6366f1", deep: "#4338ca", darkest: "#1e1b4b" }, // 300/500/700/900
  fuchsia:  { light: "#f0abfc", base: "#d946ef", deep: "#a21caf", darkest: "#4a044e" },
  rose:     { light: "#fda4af", base: "#f43f5e", deep: "#b91c1c", darkest: "#4c0519" },
  teal:     { light: "#5eead4", base: "#14b8a6", deep: "#0f766e", darkest: "#042f2e" },
  cyan:     { light: "#67e8f9", base: "#06b6d4", deep: "#0e7490", darkest: "#083344" },
  violet:   { light: "#c4b5fd", base: "#8b5cf6", deep: "#6d28d9", darkest: "#2e1065" },
  pink:     { light: "#f9a8d4", base: "#ec4899", deep: "#be185d", darkest: "#500724" },
  amber700: { light: "#fbbf24", base: "#b45309", deep: "#92400e", darkest: "#451a03" }, // 500 视作 light；700 视作 base
  // 下面这些不做分级（保持你现有定义）
  lightgreen: undefined,
  green: undefined,
  yellow: undefined,
  orange: undefined,
  red: undefined,
  purple: undefined,
  blue: undefined,
  gray: undefined,
  black: undefined,
  amber500: undefined,
  slate700: undefined,
};

// —— 3) 小工具：从“基准色相键 + 四档明度代号”获取具体颜色 ——
// level: 'a' | 'b' | 'c' | 'd'  ->  a:最浅  b:标准  c:较深  d:最深
function shade(hueKey: keyof typeof COLOR, level: "a" | "b" | "c" | "d"): string {
  const shades = SHADE_TABLE[hueKey];
  if (!shades) {
    // 如果该色相不支持分级，就直接返回其 base
    return COLOR[hueKey];
  }
  switch (level) {
    case "a": return shades.light;
    case "b": return shades.base;
    case "c": return shades.deep;
    case "d": return shades.darkest;
  }
}

// —— 4) 解析器：自动识别 YDS 与 V 级 ——
// 返回标准化结构：scale / major / minor(+/- 或 a-d) / 原始串
type ParsedGrade =
  | { scale: "YDS"; major: string; minor?: "a" | "b" | "c" | "d"; raw: string }
  | { scale: "V"; major: number; pm?: "+" | "-"; raw: string }
  | { scale: "UNKNOWN"; raw: string };

function parseGrade(raw: string): ParsedGrade {
  const s = (raw || "").trim();

  // YDS: 5.6, 5.10, 5.10a, 5.14d ...
  // 允许大小写、空格
  const yds = s.toLowerCase().match(/^5\.(\d{1,2})([abcd])?$/);
  if (yds) {
    const num = yds[1]; // '6'...'16'
    const letter = yds[2] as ("a" | "b" | "c" | "d" | undefined);
    return { scale: "YDS", major: `5.${num}`, minor: letter, raw: s };
  }

  // V 级：V0, v7, V10+, V12- ...
  const v = s.toUpperCase().match(/^V(\d{1,2})([+-])?$/);
  if (v) {
    const major = parseInt(v[1], 10);
    const pm = v[2] as ("+" | "-" | undefined);
    return { scale: "V", major, pm, raw: s };
  }

  return { scale: "UNKNOWN", raw: s };
}

// —— 5) YDS 映射逻辑（保持 5.6–5.13 不变；5.14+ 同色不同明度）——
export function colorForYDS(grade: string): string {
  const g = parseGrade(grade);

  if (g.scale !== "YDS") {
    // 兼容旧用法：如果传了非 YDS，就兜底
    return COLOR.black;
  }

  const major = g.major; // e.g. '5.8', '5.14'
  // —— 历史区间（保持不变）——
  if (major === "5.6") return COLOR.lightgreen;
  if (major === "5.7") return COLOR.green;
  if (major === "5.8") return COLOR.yellow;
  if (major === "5.9") return COLOR.orange;
  if (major === "5.10") return COLOR.red;
  if (major === "5.11") return COLOR.purple;
  if (major === "5.12") return COLOR.blue;
  if (major === "5.13") return COLOR.gray;

  // —— 5.14+：按“基准色相 + 子级明度”输出 —— 
  // 只要 major >= 5.14，才使用同色不同明度规则
  const num = Number(major.slice(2)); // '14'->14
  if (num >= 14) {
    // 为不同大段指定色相
    let hue: keyof typeof COLOR;
    if (num === 14) hue = "indigo";
    else if (num === 15) hue = "fuchsia";
    else if (num >= 16) hue = "rose";
    else hue = "indigo";

    // 子级：a最浅，b标准，c深，d最深；若未提供字母，按 b
    const level: "a" | "b" | "c" | "d" = g.minor ?? "b";
    return shade(hue, level);
  }

  // 未覆盖的情况统一兜底
  return COLOR.black;
}

// —— 6) 抱石映射（V0–V7 保持不变；V8+ 用新增色相；支持 +/- 明度微调）——
export function colorForBoulder(grade: string): string {
  const g = parseGrade(grade);

  if (g.scale !== "V") {
    // 兼容旧用法：如果传了非 V 级，兜底
    const gg = grade.toUpperCase();
    // 兼容你原有的“按 Vx 精确匹配”的老逻辑：
    if (gg === "V0") return COLOR.lightgreen;
    if (gg === "V1") return COLOR.green;
    if (gg === "V2") return COLOR.yellow;
    if (gg === "V3") return COLOR.orange;
    if (gg === "V4") return COLOR.red;
    if (gg === "V5") return COLOR.purple;
    if (gg === "V6") return COLOR.blue;
    if (gg === "V7") return COLOR.gray;
    return COLOR.black;
  }

  const v = g.major;

  // —— 历史区间（保持不变）——
  if (v === 0) return COLOR.lightgreen;
  if (v === 1) return COLOR.green;
  if (v === 2) return COLOR.yellow;
  if (v === 3) return COLOR.orange;
  if (v === 4) return COLOR.red;
  if (v === 5) return COLOR.purple;
  if (v === 6) return COLOR.blue;
  if (v === 7) return COLOR.gray;

  // —— V8+：按基准色相扩展 —— 
  let hue: keyof typeof COLOR;
  switch (true) {
    case v === 8:  hue = "teal"; break;
    case v === 9:  hue = "cyan"; break;
    case v === 10: hue = "indigo"; break;
    case v === 11: hue = "violet"; break;
    case v === 12: hue = "fuchsia"; break;
    case v === 13: hue = "pink"; break;
    case v === 14: hue = "rose"; break;
    case v === 15: hue = "amber700"; break;
    default:
      // V16+ 顶格：可选 black 或 slate 提升可读性
      return COLOR.black; // 或返回 COLOR.slate700
  }

  // “+/-” 调整明度：+ 深一档；- 浅一档；无符号 → 标准(b)
  const pm = g.pm;
  const level: "a" | "b" | "c" | "d" =
    pm === "+" ? "c" : pm === "-" ? "a" : "b";

  return shade(hue, level);
}

// —— 7) 通用入口：自动判断是 YDS 还是 V ——
// （如果你在某处只拿到一个字符串，不知道体系，可以用这个）
export function getColorForGrade(grade: string): string {
  const parsed = parseGrade(grade);
  if (parsed.scale === "YDS") return colorForYDS(grade);
  if (parsed.scale === "V") return colorForBoulder(grade);
  return COLOR.black;
}

// —— 8) （可选）导出用于环段描边的建议色（提升相邻段可读性）——
export function ringStrokeColor(isDark: boolean) {
  // 浅色背景用深描边，深色背景用浅描边
  return isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.18)";
}
