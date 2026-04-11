import React, { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, LayoutChangeEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../lib/useThemeColors";

const V_GRADES_PRIMARY = ["VB", "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10"];
const V_GRADES_MORE = ["V11", "V12", "V13", "V14", "V15", "V16", "V17"];

const YDS_GROUPS = {
  Beginner: ["5.6", "5.7", "5.8", "5.9"],
  "5.10": ["5.10a", "5.10b", "5.10c", "5.10d"],
  "5.11": ["5.11a", "5.11b", "5.11c", "5.11d"],
  "5.12": ["5.12a", "5.12b", "5.12c", "5.12d"],
  Elite: ["5.13a", "5.13b", "5.13c", "5.13d", "5.14a"],
};
type YdsGroupKey = keyof typeof YDS_GROUPS;

type Props = {
  mode: "boulder" | "toprope" | "lead";

  // i18n
  tr: (zh: string, en: string) => string;

  // label mapping（你在 journal 里已经有 labelOf）
  labelOf: (grade: string) => string;

  // 点击某个 grade
  onPickGrade: (grade: string) => void;

  // 用于卡片内 padding（影响 grid 可用宽度）
  cardPadding?: number;
};

export default function QuickLogCard({
  mode,
  tr,
  labelOf,
  onPickGrade,
  cardPadding = 16,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [vMoreOpen, setVMoreOpen] = useState(false);
  const [ydsGroup, setYdsGroup] = useState<YdsGroupKey>("5.10");

  // ✅ 永远 6 列
  const COLS = 6;
  const GAP = 10;

  // ✅ 实测 grid 可用宽度（最稳，避免 safe-area / header padding 误差）
  const [gridWidth, setGridWidth] = useState<number>(0);

  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== gridWidth) setGridWidth(w);
  };

  const fallbackWidth = useMemo(() => {
    // 兜底：如果 onLayout 还没触发，用屏幕宽度粗略估算
    const screenW = Dimensions.get("window").width;
    // 大致减去外层常见左右边距（不是关键，onLayout 很快会覆盖）
    return Math.max(0, screenW - 16 * 2 - cardPadding * 2);
  }, [cardPadding]);

  const itemWidth = useMemo(() => {
    const usable = gridWidth > 0 ? gridWidth : fallbackWidth;
    // ✅ 确保 6 个能塞下：宽度按 (usable - 5*GAP)/6 计算
    const w = Math.floor((usable - GAP * (COLS - 1)) / COLS);
    // 不做最小宽度限制：你要求“任何宽度都一行 6 个”，那就让它缩
    return Math.max(0, w);
  }, [gridWidth, fallbackWidth]);

  const listBoulder = useMemo(
    () => (vMoreOpen ? [...V_GRADES_PRIMARY, ...V_GRADES_MORE] : V_GRADES_PRIMARY),
    [vMoreOpen]
  );

  const renderGridItem = (g: string, idx: number) => {
    const isLastInRow = (idx + 1) % COLS === 0;
    return (
      <TouchableOpacity
        key={g}
        onPress={() => onPickGrade(g)}
        style={[
          styles.gridItem,
          {
            width: itemWidth,
            marginRight: isLastInRow ? 0 : GAP,
            marginBottom: GAP,
          },
        ]}
        activeOpacity={0.85}
      >
        <Text style={styles.gridText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {labelOf(g)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      {/* Quick Log 卡片 */}
      <View style={[styles.card, { padding: cardPadding }]}>
        <Text style={styles.cardTitle}>{tr("快速记录", "Quick Log")}</Text>
        <View style={{ height: 12 }} />

        {mode === "boulder" ? (
          <>
            {/* ✅ onLayout 实测可用宽度，保证 6 列永远一行 */}
            <View style={styles.gridContainer} onLayout={onGridLayout}>
              {listBoulder.map((g, idx) => renderGridItem(g, idx))}
            </View>

            {/* ✅ 展开：横线 + 箭头（无胶囊背景） */}
            <View style={styles.expandRow}>
              <View style={styles.expandLine} />
              <TouchableOpacity
                onPress={() => setVMoreOpen((v) => !v)}
                activeOpacity={0.7}
                style={styles.expandIconHit}
              >
                <Ionicons name={vMoreOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={styles.expandLine} />
            </View>
          </>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {(Object.keys(YDS_GROUPS) as YdsGroupKey[]).map((g) => {
                const active = ydsGroup === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setYdsGroup(g)}
                    style={[styles.groupTab, active && styles.groupTabActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.groupText, active && { color: colors.toggleActiveText }]}>{g}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ✅ YDS 也用同一套 6 列算法 */}
            <View style={styles.gridContainer} onLayout={onGridLayout}>
              {YDS_GROUPS[ydsGroup].map((g, idx) => renderGridItem(g, idx))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 12,
    },
    cardTitle: { fontSize: 16, fontFamily: "DMSans_900Black", color: c.textPrimary },

    // grid layout
    gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start" },

    gridItem: {
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
    },
    gridText: {
      fontFamily: "DMMono_500Medium",
      color: c.textPrimary,
      fontSize: 13,
      textAlign: "center",
      includeFontPadding: false,
    },

    expandRow: { marginTop: 8, flexDirection: "row", alignItems: "center" },
    expandLine: { flex: 1, height: 1, backgroundColor: c.border },
    expandIconHit: { paddingHorizontal: 14, paddingVertical: 8 },

    groupTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.toggleBackground },
    groupTabActive: { backgroundColor: c.toggleActiveBackground },
    groupText: { fontFamily: "DMSans_700Bold", color: c.toggleInactiveText, fontSize: 13 },
  });
