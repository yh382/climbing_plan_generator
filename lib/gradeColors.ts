// lib/gradeColors.ts — Grade 颜色映射 (v2: 绿→accent→棕 渐变)
import { BOULDER_GRADE_COLORS, ROPE_GRADE_COLORS } from '../src/lib/theme'

/**
 * Boulder V grade → 颜色
 * 查表 BOULDER_GRADE_COLORS, 支持 V0-V15 + VB
 */
export function colorForBoulder(grade: string): string {
  const normalized = grade.trim().toUpperCase()
  // 直接查表
  if (BOULDER_GRADE_COLORS[normalized]) {
    return BOULDER_GRADE_COLORS[normalized]
  }
  // 尝试去掉 +/- 后缀
  const base = normalized.replace(/[+-]$/, '')
  return BOULDER_GRADE_COLORS[base] ?? '#888888'
}

/**
 * Rope YDS grade → 颜色
 * 查表 ROPE_GRADE_COLORS, 支持 5.6-5.15
 */
export function colorForYDS(grade: string): string {
  const normalized = grade.trim().toLowerCase()
  return ROPE_GRADE_COLORS[normalized] ?? '#888888'
}

/**
 * 通用入口: 自动识别 V/YDS
 */
export function getColorForGrade(grade: string): string {
  const s = (grade || '').trim()
  if (/^[Vv]/i.test(s)) return colorForBoulder(s)
  if (/^5\./i.test(s)) return colorForYDS(s)
  return '#888888'
}

/**
 * 环段描边辅助色
 */
export function ringStrokeColor(isDark: boolean): string {
  return isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.18)'
}
