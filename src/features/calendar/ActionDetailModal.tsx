// src/features/calendar/ActionDetailModal.tsx

import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { PlanV3SessionItem } from "../../types/plan";
import { tokens } from "../../../components/ui/Theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  item: PlanV3SessionItem | null;
  isZH: boolean;
};

const { width } = Dimensions.get("window");
// 改为 4:5 比例，适应竖屏攀岩动作
const VIDEO_HEIGHT = width * 0.8;

// 计时器状态枚举
type TimerPhase = "IDLE" | "PREPARE" | "WORK" | "REST_REP" | "REST_SET" | "COMPLETE";

export default function ActionDetailModal({ visible, onClose, item, isZH }: Props) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState({});
  
  // --- 自动计时器核心状态 ---
  const [phase, setPhase] = useState<TimerPhase>("IDLE");
  const [timeLeft, setTimeLeft] = useState(0); // 当前倒计时
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // 配置参数 (从 item 读取，允许默认值)
  const totalSets = item?.sets || 1;
  const totalReps = item?.reps || 1;
  const workDuration = item?.seconds || 0;
  
  // 智能推断休息时间
  // 如果是多Rep动作，rest_sec 通常指小休；否则指大休
  const restRepDuration = totalReps > 1 ? (item?.rest_sec || 3) : 0; 
  const restSetDuration = totalReps > 1 ? 60 : (item?.rest_sec || 180); // 多Rep动作默认组间休60s，单Rep动作直接用配置

  // 重置计时器
  const resetTimer = () => {
    setPhase("IDLE");
    setTimeLeft(0);
    setCurrentSet(1);
    setCurrentRep(1);
    setIsPaused(false);
  };

  // 初始化：每次打开新动作，重置状态
  useEffect(() => {
    resetTimer();
  }, [item]);

  // --- 核心：计时器心跳逻辑 ---
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (phase !== "IDLE" && phase !== "COMPLETE" && !isPaused) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          // 1. 还在倒计时中
          if (prev > 1) return prev - 1;

          // 2. 倒计时结束 (prev === 1)，触发状态流转
          handlePhaseTransition();
          return 0; // 这里的返回值会被 handlePhaseTransition 里的 setState 覆盖，但为了逻辑闭环返回0
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [phase, isPaused, currentRep, currentSet]); // 依赖项很关键

  // 状态流转机 (State Machine Transition)
  const handlePhaseTransition = () => {
    switch (phase) {
      case "PREPARE":
        // 准备结束 -> 开始第一下训练
        setPhase("WORK");
        setTimeLeft(workDuration);
        break;

      case "WORK":
        // 训练结束 -> 判断是休 Rep 还是休 Set
        if (currentRep < totalReps) {
          // 还有 Rep 没做完 -> 进组内休息
          setPhase("REST_REP");
          setTimeLeft(restRepDuration);
        } else if (currentSet < totalSets) {
          // Rep 做完了，但还有 Set 没做完 -> 进组间休息
          setPhase("REST_SET");
          setTimeLeft(restSetDuration);
        } else {
          // 全部做完
          setPhase("COMPLETE");
          setTimeLeft(0);
        }
        break;

      case "REST_REP":
        // 组内休息结束 -> 下一个 Rep
        setCurrentRep((r) => r + 1);
        setPhase("WORK");
        setTimeLeft(workDuration);
        break;

      case "REST_SET":
        // 组间休息结束 -> 下一个 Set (Rep归1)
        setCurrentSet((s) => s + 1);
        setCurrentRep(1);
        setPhase("WORK"); // 注意：这里通常不需要再次 PREPARE，直接进 WORK 或者给个简短提示均可，这里直接进 Work
        setTimeLeft(workDuration);
        break;
        
      default:
        break;
    }
  };

  const startTimer = () => {
    if (phase === "IDLE" || phase === "COMPLETE") {
      // 从头开始
      setCurrentSet(1);
      setCurrentRep(1);
      setPhase("PREPARE");
      setTimeLeft(10); // 固定 10s 准备时间
      setIsPaused(false);
    } else {
      // 恢复
      setIsPaused(false);
    }
  };

  const pauseTimer = () => {
    setIsPaused(true);
  };

  // --- UI 辅助函数 ---
  const getPhaseColor = () => {
    switch (phase) {
      case "PREPARE": return "#f59e0b"; // 黄色 (准备)
      case "WORK": return "#22c55e";    // 绿色 (训练)
      case "REST_REP": return "#3b82f6"; // 蓝色 (小休)
      case "REST_SET": return "#6366f1"; // 紫色 (大休)
      case "COMPLETE": return "#10b981"; // 深绿 (完成)
      default: return "#f8fafc";
    }
  };

  const getPhaseLabel = () => {
    switch (phase) {
      case "IDLE": return isZH ? "准备开始" : "Ready";
      case "PREPARE": return isZH ? "准备！" : "Get Ready!";
      case "WORK": return isZH ? "发力！" : "WORK!";
      case "REST_REP": return isZH ? "放松 (小休)" : "Rest (Rep)";
      case "REST_SET": return isZH ? "组间休息" : "Set Rest";
      case "COMPLETE": return isZH ? "完成！" : "Done!";
      default: return "";
    }
  };

  if (!item) return null;

  const name = item.name_override?.zh || item.action_id;
  const notes = item.notes?.zh || "";
  const cues = item.cues?.zh || (isZH ? "保持核心收紧，动作控制平稳。" : "Keep core tight.");
  const videoUrl = item.media?.video;
  const imageUrl = item.media?.image;

  // 只有基于时间的动作，或者名字带“悬挂”的动作才显示全功能计时器
  // 这里的逻辑可以放宽，允许所有动作都显示，毕竟用户可以把它当作普通计时器用
  const showTimer = true; // 或者保持之前的 item.seconds 判断

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet" 
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        
        {/* 1. 顶部标题 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={28} color="#374151" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} bounces={false}>
          
          {/* 2. 视频区域 */}
          <View style={styles.mediaContainer}>
            {videoUrl ? (
              <Video
                ref={videoRef}
                style={styles.video}
                source={{ uri: videoUrl }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                onPlaybackStatusUpdate={status => setStatus(() => status)}
              />
            ) : imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.mediaPlaceholder}>
                <Ionicons name="videocam-off-outline" size={48} color="#d1d5db" />
                <Text style={styles.mediaText}>{isZH ? "暂无视频" : "No video"}</Text>
              </View>
            )}
          </View>

          {/* 3. 全自动计时器面板 */}
          {showTimer && (
            <View style={[styles.timerBar, { borderColor: getPhaseColor(), borderWidth: 2 }]}>
              
              {/* 左侧：大倒计时 */}
              <View style={styles.timerInfo}>
                <Text style={[styles.timerLabel, { color: phase === 'WORK' ? '#16a34a' : '#64748b' }]}>
                  {getPhaseLabel()}
                </Text>
                <Text style={[styles.timerValue, { color: phase === 'IDLE' ? '#94a3b8' : '#0f172a' }]}>
                  {phase === "IDLE" ? workDuration : timeLeft}
                  <Text style={{fontSize: 20, fontWeight:'400', color: '#94a3b8'}}>s</Text>
                </Text>
              </View>

              {/* 中间：进度指示器 (Set/Rep) */}
              <View style={styles.progressInfo}>
                 <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>SET</Text>
                    <Text style={styles.progressVal}>{currentSet}<Text style={styles.progressTotal}>/{totalSets}</Text></Text>
                 </View>
                 <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>REP</Text>
                    <Text style={styles.progressVal}>{currentRep}<Text style={styles.progressTotal}>/{totalReps}</Text></Text>
                 </View>
              </View>
              
              {/* 右侧：控制按钮 */}
              <View style={styles.timerControls}>
                 {phase === "IDLE" || phase === "COMPLETE" ? (
                   <Pressable onPress={startTimer} style={[styles.iconBtn, { backgroundColor: "#22c55e" }]}>
                      <Ionicons name="play" size={28} color="#fff" style={{marginLeft: 2}} />
                   </Pressable>
                 ) : (
                   <View style={{ flexDirection: 'row', gap: 8 }}>
                     {isPaused ? (
                        <Pressable onPress={startTimer} style={[styles.iconBtn, { backgroundColor: "#22c55e", width: 40, height: 40 }]}>
                          <Ionicons name="play" size={20} color="#fff" />
                        </Pressable>
                     ) : (
                        <Pressable onPress={pauseTimer} style={[styles.iconBtn, { backgroundColor: "#f59e0b", width: 40, height: 40 }]}>
                          <Ionicons name="pause" size={20} color="#fff" />
                        </Pressable>
                     )}
                     <Pressable onPress={resetTimer} style={[styles.iconBtn, { backgroundColor: "#e2e8f0", width: 40, height: 40 }]}>
                        <Ionicons name="refresh" size={20} color="#475569" />
                     </Pressable>
                   </View>
                 )}
              </View>
            </View>
          )}

            {/* 4. 数据指标 (Sets/Reps) - 修改为 4 列布局 */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{isZH ? "组数" : "Sets"}</Text>
              <Text style={styles.statValue}>{item.sets || "-"}</Text>
            </View>
            <View style={styles.statSeparator} />
            
            {/* 新增：专门显示 Reps */}
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{isZH ? "次数" : "Reps"}</Text>
              <Text style={styles.statValue}>{item.reps || "1"}</Text>
            </View>
            <View style={styles.statSeparator} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>{isZH ? "时长" : "Time"}</Text>
              <Text style={styles.statValue}>
                {item.seconds ? `${item.seconds}s` : "-"}
              </Text>
            </View>
            <View style={styles.statSeparator} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>RPE</Text>
              <Text style={styles.statValue}>{item.rpe_target || "-"}</Text>
              {/* 新增：RPE 解释小字 */}
              <Text style={{fontSize: 10, color: '#9ca3af', marginTop: 2}}>
                 {item.rpe_target ? (isZH ? "(主观发力感 1-10)" : "(Effort 1-10)") : ""}
              </Text>
            </View>
          </View>

          {/* 5. 备注 */}
          {!!notes && (
            <View style={styles.noteContainer}>
              <View style={styles.noteIcon}>
                <Ionicons name="bulb" size={18} color="#d97706" />
              </View>
              <Text style={styles.noteText}>{notes}</Text>
            </View>
          )}

          {/* 6. 要点 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{isZH ? "动作要点" : "Cues"}</Text>
            <Text style={styles.cuesText}>{cues}</Text>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: "#f3f4f6",
  },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  closeBtn: { position: "absolute", right: 16, top: 12, padding: 4 },

  mediaContainer: { width: width, height: VIDEO_HEIGHT, backgroundColor: "#000" },
  video: { width: "100%", height: "100%" },
  image: { width: "100%", height: "100%" },
  mediaPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  mediaText: { color: "#9ca3af", marginTop: 8, fontSize: 12 },

  // 新版计时器样式
  timerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginHorizontal: 16, marginTop: 16, padding: 16,
    backgroundColor: "#f8fafc", borderRadius: 16,
    // 边框颜色会动态变化
  },
  timerInfo: { flex: 1.5 },
  timerLabel: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  timerValue: { fontSize: 40, fontWeight: "900", fontVariant: ['tabular-nums'], lineHeight: 44 },
  
  progressInfo: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  progressItem: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  progressLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
  progressVal: { fontSize: 16, color: '#334155', fontWeight: '700' },
  progressTotal: { fontSize: 12, color: '#cbd5e1', fontWeight: '500' },

  timerControls: { flex: 1.2, alignItems: 'flex-end' },
  iconBtn: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.1, shadowOffset: {width:0, height:2}, elevation: 2 },

  statsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 24, marginTop: 24, marginBottom: 8 },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { fontSize: 12, color: "#9ca3af", marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "600", color: "#111827" },
  statSeparator: { width: 1, height: 24, backgroundColor: "#e5e7eb" },

  noteContainer: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, padding: 12, backgroundColor: "#fffbeb", borderRadius: 12, borderWidth: 1, borderColor: "#fcd34d" },
  noteIcon: { marginRight: 10, paddingTop: 2 },
  noteText: { flex: 1, fontSize: 14, color: "#92400e", lineHeight: 20 },

  section: { padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 8 },
  cuesText: { fontSize: 15, lineHeight: 24, color: "#4b5563" },
});