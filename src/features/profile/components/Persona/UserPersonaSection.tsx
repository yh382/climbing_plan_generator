import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProfileStore } from "../../store/useProfileStore"; 
import AbilityRadar from "../AbilityRadar"; 
import { tokens } from "../../../../../components/ui/Theme"; 

// --- 辅助组件 ---
const RatingDots = ({ score, max = 5, activeColor = "#306E6F" }: { score: number, max?: number, activeColor?: string }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {Array.from({ length: max }).map((_, i) => (
      <View 
        key={i} 
        style={{
          width: 8, height: 8, borderRadius: 4,
          backgroundColor: i < score ? activeColor : "#E5E7EB"
        }} 
      />
    ))}
  </View>
);

const StatRow = ({ label, value, sub, icon }: any) => (
  <View style={styles.statRow}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon && <Ionicons name={icon} size={14} color="#9CA3AF" />}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={styles.statValue}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  </View>
);

const HealthTag = ({ label, level }: { label: string, level: number }) => {
  if (level === 0) return null;
  const color = level === 1 ? "#F59E0B" : "#EF4444"; 
  const bg = level === 1 ? "#FEF3C7" : "#FEE2E2";
  return (
    <View style={[styles.healthTag, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[styles.healthTagText, { color }]}>{label} Lv.{level}</Text>
    </View>
  );
};

export function UserPersonaSection() {
  const { profile } = useProfileStore();
  
  // 1. 获取后端计算好的雷达图数据
  const abilityScores = useMemo(() => {
    return profile?.ability_scores || { finger: 30, pull: 30, core: 30, flex: 30, sta: 30 };
  }, [profile]);

  // 2. 提取其他展示数据
  const p = profile || {};
  const perf = p.performance || {};
  
  // 使用类型断言或 any 来访问可能的属性名变体
  const anthro = (p.anthropometrics || {}) as any;
  
  // [修复] 兼容读取：同时尝试读取 height/weight 和 height_cm/weight_kg
  const height = anthro.height ?? anthro.height_cm ?? 0;
  const weight = anthro.weight ?? anthro.weight_kg ?? 0;
  const apeIndex = anthro.ape_index ?? 0;

  return (
    <View style={{ paddingBottom: 40 }}>
      
      {/* === 1. 能力雷达图 === */}
      <AbilityRadar data={abilityScores} />

      {/* === 2. 身体参数 === */}
      <View style={styles.bodyStatsContainer}>
        <View style={styles.bodyStatItem}>
          <Text style={styles.bodyStatLabel}>Height</Text>
          <Text style={styles.bodyStatValue}>{height} <Text style={styles.unit}>cm</Text></Text>
        </View>
        <View style={styles.vertDivider} />
        <View style={styles.bodyStatItem}>
          <Text style={styles.bodyStatLabel}>Weight</Text>
          <Text style={styles.bodyStatValue}>{weight} <Text style={styles.unit}>kg</Text></Text>
        </View>
        <View style={styles.vertDivider} />
        <View style={styles.bodyStatItem}>
          <Text style={styles.bodyStatLabel}>Ape Index</Text>
          <Text style={[styles.bodyStatValue, { color: apeIndex >= 0 ? '#10B981' : '#EF4444' }]}>
            {apeIndex > 0 ? "+" : ""}{apeIndex} <Text style={styles.unit}>cm</Text>
          </Text>
        </View>
      </View>

      {/* === 3. 详细数据网格 === */}
      <View style={styles.gridContainer}>
        {/* 左列 */}
        <View style={styles.gridCol}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="barbell" size={18} color="#306E6F" />
              <Text style={styles.cardTitle}>Strength</Text>
            </View>
            <StatRow 
              label="Max Pull-ups" 
              value={perf.pullup_max_reps?.value || "-"} 
              sub="reps"
            />
            <View style={styles.divider} />
            <StatRow 
              label="Max Hang" 
              value={perf.hang_2h_30mm_sec?.value || "-"} 
              sub="sec (20mm)"
            />
          </View>
          
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flash" size={18} color="#F59E0B" />
              <Text style={styles.cardTitle}>Core</Text>
            </View>
            <StatRow 
              label="Plank" 
              value={perf.plank_sec?.value || "-"} 
              sub="sec"
            />
          </View>
        </View>

        {/* 右列 */}
        <View style={styles.gridCol}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="body" size={18} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Mobility</Text>
            </View>
            <StatRow 
              label="Sit & Reach" 
              value={`${anthro.sit_and_reach_cm || 0}`} 
              sub="cm"
            />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="medkit" size={18} color="#EF4444" />
              <Text style={styles.cardTitle}>Recovery</Text>
            </View>
            <View style={styles.tagsContainer}>
              {(p.recovery?.pain?.finger ?? 0) > 0 && <HealthTag label="Finger" level={p.recovery!.pain!.finger!} />}
              {(p.recovery?.pain?.shoulder ?? 0) > 0 && <HealthTag label="Shoulder" level={p.recovery!.pain!.shoulder!} />}
              
              {/* 全健康状态 */}
              {!(p.recovery?.pain?.finger || p.recovery?.pain?.shoulder || p.recovery?.pain?.elbow || p.recovery?.pain?.wrist) && (
                <View style={[styles.healthTag, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
                  <Text style={[styles.healthTagText, { color: '#10B981' }]}>All Good ✨</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bodyStatsContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  bodyStatItem: { alignItems: 'center' },
  bodyStatLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  bodyStatValue: { fontSize: 18, fontWeight: '800', color: '#111' },
  unit: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  vertDivider: { width: 1, height: '100%', backgroundColor: '#F3F4F6' },
  gridContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 12 },
  gridCol: { flex: 1, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 12, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: "#000", shadowOpacity: 0.02, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  statLabel: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#111' },
  statSub: { fontSize: 10, color: '#9CA3AF' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  healthTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  healthTagText: { fontSize: 11, fontWeight: '700' }
});