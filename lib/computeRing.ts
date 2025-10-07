// app/lib/computeRing.ts
import { getColorForGrade } from "./gradeColors";

export type GradeCount = { grade: string; count: number };
export type Arc = { start: number; sweep: number; color: string };

// 把各等级计数转换为 [0, 360) 的扇形（从 12 点开始，顺时针），最后一段补齐避免细缝
export function computeRingArcs(segments: GradeCount[]): Arc[] {
  const valid = segments.filter(s => s && s.count > 0);
  if (!valid.length) return [];

  const total = valid.reduce((sum, s) => sum + s.count, 0);
  let acc = 0;
  const arcs: Arc[] = [];

  valid.forEach((seg, i) => {
    const ratio = seg.count / total;
    // 前 n-1 段按比例，最后一段用 1-acc 保证总和严格为 360
    const sweep = i < valid.length - 1 ? ratio * 360 : (1 - acc) * 360;
    const start = acc * 360;
    acc += ratio;

    arcs.push({
      start, // 单位：度；0° 表示 12 点方向
      sweep,
      color: getColorForGrade(seg.grade),
    });
  });
  return arcs;
}
