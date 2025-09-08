// app/(tabs)/settings.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
// ⛏️ 移除 Picker（已不用）
// import { Picker } from "@react-native-picker/picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  SafeAreaView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { scheduleDailyReminder } from "../lib/notifications";

type Lang = "zh" | "en";
type UnitSystem = "imperial" | "metric";
type BoulderScale = "V" | "Font";
type RopeScale = "YDS" | "French";

const NOTIF_KEY = "@notif_enabled";

const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: active ? "#4f46e5" : "#e5e7eb",
      backgroundColor: active ? "#eef2ff" : "white",
      marginRight: 8,
    }}
  >
    <Text style={{ color: active ? "#4f46e5" : "#111827" }}>{label}</Text>
  </TouchableOpacity>
);

export default function Settings() {
  const {
    ready,
    lang, setLang,
    unit, setUnit,
    boulderScale, setBoulderScale,
    ropeScale, setRopeScale
  } = useSettings();

  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  // 通知开关仍本地管理
  const [notif, setNotif] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  // 读取通知状态
  useEffect(() => {
    (async () => {
      const n = await AsyncStorage.getItem(NOTIF_KEY);
      if (n === "1" || n === "0") setNotif(n === "1");
    })();
  }, []);

  const onToggleNotif = async (v: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (v) {
        await scheduleDailyReminder(9, 0);
        setNotif(true);
        await AsyncStorage.setItem(NOTIF_KEY, "1");
      } else {
        setNotif(false);
        await AsyncStorage.setItem(NOTIF_KEY, "0");
      }
    } catch {
      Alert.alert(tr("提示", "Notice"), tr("无法开启通知（可能未授予权限）。", "Failed to enable notifications (permission not granted)."));
    } finally {
      setBusy(false);
    }
  };

  const openFeedback = () => {
    const subject = tr("Climbing App 反馈 Feedback", "Climbing App Feedback");
    const mailto = `mailto:climbapp@example.com?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(mailto).catch(() => {});
  };

  // 若设置尚未加载完，给个轻量占位（避免闪一下默认值）
  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>{tr("加载设置中…", "Loading settings…")}</Text>
      </SafeAreaView>
    );
  }

  const Row = ({
    title,
    subtitle,
    right,
  }: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
  }) => (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: "#f3f4f6",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontWeight: "600" }}>{title}</Text>
          {subtitle ? <Text style={{ color: "#6b7280", marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      {/* 通知 */}
      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "white", marginBottom: 12, overflow: "hidden" }}>
        <Row
          title={tr("提示", "Reminder")}
          subtitle={tr("每日 9:00 查看训练计划提醒", "Daily reminder at 9:00 to check your plan")}
          right={<Switch value={notif} onValueChange={onToggleNotif} disabled={busy} />}
        />
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{ color: "#9ca3af", fontSize: 12 }}>
            {tr(
              "开启后将在每日 9:00 本地提醒；如系统未授权，将弹出权限请求。",
              "A local reminder will trigger at 9:00 daily; system may prompt for permission."
            )}
          </Text>
        </View>
      </View>

      {/* 语言 */}
      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "white", marginBottom: 12, overflow: "hidden" }}>
        <Row title={tr("切换语言 / Language", "Language")} />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row" }}>
          <Chip label="中文" active={lang === "zh"} onPress={() => setLang("zh")} />
          <Chip label="English" active={lang === "en"} onPress={() => setLang("en")} />
        </View>
      </View>



      {/* 单位系统 —— 胶囊选择 */}
      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "white", marginBottom: 12, overflow: "hidden" }}>
        <Row
          title={tr("单位系统", "Units")}
          right={<Text style={{ color: "#6b7280" }}>{unit === "metric" ? tr("公制", "Metric") : tr("英制", "Imperial")}</Text>}
        />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row" }}>
          <Chip
            label={tr("公制（cm, kg）", "Metric (cm, kg)")}
            active={unit === "metric"}
            onPress={() => setUnit("metric")}
          />
          <Chip
            label={tr("英制（ft, lbs）", "Imperial (ft, lbs)")}
            active={unit === "imperial"}
            onPress={() => setUnit("imperial")}
          />
        </View>
      </View>

      {/* 等级系统 —— 胶囊选择 */}
      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "white", marginBottom: 12, overflow: "hidden" }}>
        <Row
          title={tr("抱石等级系统", "Bouldering Scale")}
          right={<Text style={{ color: "#6b7280" }}>{boulderScale === "V" ? "V-SCALE" : "FONT.SCALE"}</Text>}
        />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row" }}>
          <Chip
            label="V-SCALE"
            active={boulderScale === "V"}
            onPress={() => setBoulderScale("V")}
          />
          <Chip
            label="FONT.SCALE"
            active={boulderScale === "Font"}
            onPress={() => setBoulderScale("Font")}
          />
        </View>

        <Row
          title={tr("难度等级系统", "Rope Grade Scale")}
          right={<Text style={{ color: "#6b7280" }}>{ropeScale}</Text>}
        />
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row" }}>
          <Chip
            label="YDS"
            active={ropeScale === "YDS"}
            onPress={() => setRopeScale("YDS")}
          />
          <Chip
            label="French"
            active={ropeScale === "French"}
            onPress={() => setRopeScale("French")}
          />
        </View>
      </View>

      {/* 反馈 */}
      <View style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, backgroundColor: "white", overflow: "hidden" }}>
        <Row title={tr("反馈", "Feedback")} />
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#374151", marginBottom: 10 }}>
            {tr("有任何问题或建议？点下面发邮件告诉我们。", "Have questions or suggestions? Tap below to email us.")}
          </Text>
          <TouchableOpacity
            onPress={openFeedback}
            style={{ alignSelf: "flex-start", backgroundColor: "#4f46e5", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>{tr("发送反馈邮件", "Send Feedback Email")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
