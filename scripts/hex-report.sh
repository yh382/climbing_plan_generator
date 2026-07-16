#!/usr/bin/env bash
# scripts/hex-report.sh — hex 色值存量排行（HEX-SWEEP 色值收敛窗的输入）
#
# 按文件统计 src/ + app/ 内 hex 色值字面量命中数，降序输出 top N（默认 30）。
# 用法：./scripts/hex-report.sh [N]
#
# 说明：
# - 匹配 #RGB / #RGBA / #RRGGBB / #RRGGBBAA 形式的字符串字面量
# - src/lib/theme.ts / darkTheme.ts 是 token 定义处（sanctioned），列出但标注
# - 迁移时优先处理 top 文件；warn 级 eslint react-native/no-color-literals 挡新增

set -euo pipefail
cd "$(dirname "$0")/.."

TOP_N="${1:-30}"

echo "== hex literal report ($(date +%F)) =="
HEX_RE="#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b"
TOTAL=$(grep -rEoh "$HEX_RE" src/ app/ --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
FILES=$(grep -rEl "$HEX_RE" src/ app/ --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
echo "total: ${TOTAL} hits / ${FILES} files"
echo
echo "-- top ${TOP_N} files --"
grep -rEc "$HEX_RE" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null \
  | awk -F: '$2 > 0 { print $2 "\t" $1 }' \
  | sort -rn \
  | head -"${TOP_N}" \
  | while IFS=$'\t' read -r count file; do
      note=""
      case "$file" in
        src/lib/theme.ts|src/lib/darkTheme.ts) note="  (token 定义处，sanctioned)" ;;
      esac
      printf "%5d  %s%s\n" "$count" "$file" "$note"
    done
