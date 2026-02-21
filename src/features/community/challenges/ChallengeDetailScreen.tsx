import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
  ViewStyle,
  TextStyle,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
// 如果你想用毛玻璃效果，可以保留 GlassView，这里为了通用性和性能，我使用纯白背景渐变
// import { GlassView } from "expo-glass-effect"; 

import SegmentedTabs from "./component/SegmentedTabs";
import LeaderboardFilters from "./component/LeaderboardFilters";
import RankingRowCard from "./component/RankingRowCard";
import GalleryGrid from "./component/GalleryGrid";
import GlassIconButton from "./component/GlassIconButton";

import { useChallengeDetailData } from "./data/useChallengeDetailData";
import type { ChallengeCategory } from "./data/mockChallengeDetail";

import ChallengeDetailsModal from "./ChallengeDetailsModal";
// 添加 GlassView
import { GlassView } from "expo-glass-effect";
const COVER_H = 280;
const THUMB_SIZE = 80;
const SIDE_PADDING = 12;

function categoryIcon(cat?: ChallengeCategory): keyof typeof Ionicons.glyphMap {
  switch (cat) {
    case "boulder":
      return "flash";
    case "toprope":
      return "git-compare";
    case "indoor":
      return "home";
    case "outdoor":
      return "leaf";
    default:
      return "trophy";
  }
}

function formatYMD(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function daysLeft(endISO?: string) {
  if (!endISO) return null;
  const end = new Date(endISO);
  if (Number.isNaN(end.getTime())) return null;

  const now = new Date();
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.ceil((endUTC - nowUTC) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// 标签组件 (TS: as ViewStyle)
function CategoryChip({ text }: { text: string }) {
  return (
    <View style={styles.chip as ViewStyle}>
      <Text style={styles.chipText as TextStyle}>{text}</Text>
    </View>
  );
}

// 极简信息行
function InfoRow({
  icon,
  children,
  right,
  isLast = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  right?: React.ReactNode;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const Content = (
    <View style={[styles.infoRow as ViewStyle, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={22} color="#374151" />
      </View>
      <View style={styles.infoContent}>
        <View style={{ flex: 1, paddingRight: 8, justifyContent: "center" }}>{children}</View>
        {right ? <View style={styles.infoRight}>{right}</View> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        {Content}
      </Pressable>
    );
  }
  return Content;
}

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- 1. Reanimated Setup ---
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // --- 2. Topbar Background Animation ---
  // 当滚动超过一定距离（比如封面高度的一半）时，背景逐渐变白
  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, COVER_H - 100], // 输入范围：从顶部 到 封面快结束时
      [0, 1],             // 输出范围：透明 -> 不透明
      Extrapolate.CLAMP
    );
    return {
      opacity,
      // 可选：添加一点阴影效果，只有完全显示时才明显
      shadowOpacity: interpolate(scrollY.value, [0, COVER_H], [0, 0.05], Extrapolate.CLAMP),
    };
  });

  const {
    challenge,
    leaderboard,
    gallery,
    peopleFilter,
    genderFilter,
    setPeopleFilter,
    setGenderFilter,
  } = useChallengeDetailData();

  const [tab, setTab] = useState<"leaderboard" | "gallery">("leaderboard");

  const startText = useMemo(() => formatYMD(challenge.startDateISO), [challenge.startDateISO]);
  const endText = useMemo(() => formatYMD(challenge.endDateISO), [challenge.endDateISO]);
  const left = useMemo(() => daysLeft(challenge.endDateISO), [challenge.endDateISO]);

  const firstCat = challenge.categories?.[0];
  const thumbIcon = categoryIcon(firstCat);

  const organizerName = challenge.organizerName ?? "ClimMate Community";
  const participantsText = typeof challenge.participants === "number" ? `${challenge.participants}` : "—";

  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <View style={styles.container}>
      
{/* === Animated Header Background & Buttons === */}
      <View style={[styles.headerContainer, { height: insets.top + 50 }]}>
        
        {/* [修改] 使用 GlassView 替换纯白背景 */}
        <Animated.View style={[StyleSheet.absoluteFill, headerStyle]}>
          {/* 1. 液态玻璃层 */}
          <GlassView 
            glassEffectStyle="regular" 
            style={StyleSheet.absoluteFill} 
          />
          
          {/* 2. 半透明白底层 (Tint) 
             作用：增加亮度，确保黑色标题/按钮在深色图片背景上也能看清。
             如果不加这层，玻璃太透，下面是深色图片时，黑色按钮会消失。
          */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.65)" }]} />
          
          {/* 3. 底部细边框 */}
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(0,0,0,0.05)" }} />
        </Animated.View>
        
        {/* 按钮层：始终显示 */}
        <View style={[styles.headerButtonsRow, { marginTop: insets.top }]}>
          <GlassIconButton icon="chevron-back" onPress={() => router.back()} accessibilityLabel="Back" />
          <GlassIconButton icon="share-outline" onPress={() => {}} accessibilityLabel="Share" />
        </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* === Hero 区域 === */}
        <View style={styles.heroWrap}>
          <View style={[styles.coverWrap, { height: COVER_H, backgroundColor: challenge.color ?? "#111827" }]}>
            {challenge.coverUri ? <Image source={{ uri: challenge.coverUri }} style={styles.coverImg} /> : null}
            <View style={styles.coverScrim} />
            
            <View style={styles.coverChips}>
              {(challenge.categories ?? []).slice(0, 3).map((c) => (
                <CategoryChip key={c} text={c} />
              ))}
            </View>
          </View>

          {/* Organizer */}
          <View style={styles.organizerBar}>
            <Text style={styles.organizerOneLine} numberOfLines={1}>
              <Text style={styles.organizerPrefix}>Hosted by </Text>
              {organizerName}
            </Text>
          </View>

          {/* 悬浮头像 */}
          <View style={styles.thumbFloating}>
            <View style={styles.thumbOuter}>
              {challenge.thumbnailUri ? (
                <Image source={{ uri: challenge.thumbnailUri }} style={styles.thumbImg} />
              ) : (
                <View style={[styles.thumbImg, { backgroundColor: challenge.color ?? "#111827", alignItems: "center", justifyContent: "center" }]}>
                  <Ionicons name={thumbIcon} size={24} color="#FFFFFF" />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* === 主内容区 === */}
        <View style={styles.mainBlock}>
          <Text style={styles.title}>{challenge.title}</Text>

          {/* Join 按钮 */}
          <TouchableOpacity activeOpacity={0.9} style={styles.joinBtn} onPress={() => {}}>
            <Text style={styles.joinBtnText}>{challenge.joined ? "Joined" : "Join Challenge"}</Text>
          </TouchableOpacity>

          {/* === 信息列表 === */}
          <View style={styles.infoListContainer}>
            <InfoRow
              icon="calendar-clear-outline"
              right={left !== null ? <Text style={styles.daysLeftPill}>{left} days left</Text> : null}
            >
              <Text style={styles.infoValue}>
                {startText && endText ? `${startText} - ${endText}` : challenge.dateRange ?? "—"}
              </Text>
            </InfoRow>

            <InfoRow icon="trophy-outline">
               {challenge.prizes?.length ? (
                <Text style={styles.infoValue} numberOfLines={1}>
                  {challenge.prizes.join(" · ")}
                </Text>
              ) : (
                <Text style={styles.infoMuted}>No prizes yet</Text>
              )}
            </InfoRow>

            <InfoRow
              icon="information-circle-outline"
              isLast
              onPress={() => setDetailsOpen(true)}
              right={<Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
            >
              <Text style={styles.infoValue} numberOfLines={3}>
                 {challenge.description || "View challenge details and rules."}
              </Text>
            </InfoRow>
          </View>
        </View>

        {/* === Leaderboard === */}
        <View style={styles.leaderboardSection}>
          <View style={styles.leaderboardCard}>
            
            <View style={styles.leaderHeaderRow}>
              <Text style={styles.cardTitle}>Leaderboard</Text>
              <View style={styles.participantsBadge}>
                <Ionicons name="people" size={12} color="#4B5563" style={{marginRight:4}}/>
                <Text style={styles.participantsText}>{participantsText}</Text>
              </View>
            </View>

            {/* Controls Row: Tabs + Filter */}
            <View style={styles.controlsRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <SegmentedTabs
                  value={tab}
                  options={[
                    { key: "leaderboard", label: "Ranking" },
                    { key: "gallery", label: "Gallery" },
                  ]}
                  onChange={setTab}
                />
              </View>
              
              <View style={{ zIndex: 10 }}> 
                 <LeaderboardFilters
                  people={peopleFilter}
                  gender={genderFilter}
                  onChangePeople={setPeopleFilter}
                  onChangeGender={setGenderFilter}
                />
              </View>
            </View>

            {/* 列表内容 */}
            <View style={{ marginTop: 4 }}>
              {tab === "leaderboard" ? (
                <View style={{ gap: 8 }}>
                  {leaderboard.map((u, idx) => (
                    <RankingRowCard
                      key={u.userId}
                      rank={idx + 1}
                      user={u}
                      onPress={() => router.push(`/community/u/${u.userId}`)}
                    />
                  ))}
                </View>
              ) : (
                <GalleryGrid items={gallery} onPressItem={() => {}} />
              )}
            </View>
            
          </View>
        </View>
      </Animated.ScrollView>

      <ChallengeDetailsModal
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Details"
        content={challenge.description || "No details."}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  // --- 新增 Header 样式 ---
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    // 不设置背景色，由内部 Animated.View 控制
  },
  headerButtonsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIDE_PADDING,
  },
  // ----------------------

  heroWrap: { position: "relative" },
  coverWrap: { width: "100%" },
  coverImg: { width: "100%", height: "100%" },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },

  coverChips: {
    position: "absolute",
    right: SIDE_PADDING,
    bottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: "#111" },

  organizerBar: {
    height: 72,
    paddingTop: 16,
    paddingLeft: SIDE_PADDING + THUMB_SIZE + 10,
    paddingRight: SIDE_PADDING,
    backgroundColor: "#F9FAFB",
  },
  organizerOneLine: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  organizerPrefix: { fontWeight: "400", color: "#6B7280" },

  thumbFloating: {
    position: "absolute",
    left: SIDE_PADDING,
    top: COVER_H - THUMB_SIZE / 2,
    zIndex: 50,
  },
  thumbOuter: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  thumbImg: {
    width: THUMB_SIZE - 6,
    height: THUMB_SIZE - 6,
    borderRadius: 21,
    backgroundColor: "#E5E7EB",
  },

  mainBlock: { 
    paddingHorizontal: SIDE_PADDING, 
    paddingBottom: 8,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
    marginBottom: 26,
    marginTop: -10, 
    lineHeight: 34,
  },

  joinBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#22C55E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#22C55E",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 20,
  },
  joinBtnText: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },

  infoListContainer: {
    marginTop: 0,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  infoIconWrap: {
    width: 28, 
    alignItems: "center",
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoValue: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    lineHeight: 22,
  },
  infoMuted: {
    fontSize: 15,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  infoRight: { marginLeft: 8 },
  
  daysLeftPill: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    backgroundColor: "#F3F4F6",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: "hidden",
  },

  leaderboardSection: {
    paddingHorizontal: SIDE_PADDING,
    marginTop: 10,
  },
  leaderboardCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    zIndex: 1, 
  },

  leaderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    zIndex: 20, 
  },

  cardTitle: { fontSize: 18, fontWeight: "800", color: "#111" },
  
  participantsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantsText: { fontSize: 12, fontWeight: "700", color: "#4B5563" },
});