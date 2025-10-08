// app/(tabs)/settings.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Alert, Linking, SafeAreaView, Switch, Text, View,  } from "react-native";
import { useSettings } from "@/contexts/SettingsContext";
import { scheduleDailyReminder } from "../../lib/notifications";

// ✅ 新 UI 组件
import { Card } from "@components/ui/Card";
import { FieldRow } from "@components/ui/FieldRow";
import { Segmented } from "@components/ui/Segmented";
import { Caption, H1 } from "@components/ui/Text";
import { tokens } from "@components/ui/Theme";
import { ScrollView } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";



type Lang = "zh" | "en";
type UnitSystem = "imperial" | "metric";
type BoulderScale = "V" | "Font";
type RopeScale = "YDS" | "French";

const NOTIF_KEY = "@notif_enabled";

export default function Settings() {
  const { ready, lang, setLang, unit, setUnit, boulderScale, setBoulderScale, ropeScale, setRopeScale } = useSettings();

  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  const tabBarH = useBottomTabBarHeight();
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

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>{tr("加载设置中…", "Loading settings…")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: tabBarH + 16 }}>
      {/* 通知 */}
        <Card style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 20 }}>
          <FieldRow
            label={tr("提示", "Reminder")}
            right={<Switch value={notif} onValueChange={onToggleNotif} disabled={busy} />}
          />
          <View style={{ paddingTop: 8 }}>
            <Caption>
              {tr(
                "每日 9:00 本地提醒查看训练计划；如系统未授权，将弹出权限请求。",
                "A local reminder will trigger at 9:00 daily; the system may prompt for permission."
              )}
            </Caption>
          </View>
        </Card>

        {/* 语言 */}

              <Card style={{ marginHorizontal: 16, marginBottom: 12 ,borderRadius: 20 }}>
                <FieldRow label={tr("切换语言 / Language", "Language")} />
                <View style={{ paddingTop: 10 }}>
                  <Segmented
                    value={lang}
                onChange={(v) => setLang(v as Lang)}
                options={[
                  { label: "中文", value: "zh" },
                  { label: "English", value: "en" },
                ]}
              />
            </View>
          </Card>

        {/* 单位系统 */}
        <Card style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 20 }}>
          <FieldRow label={tr("单位系统", "Units")} right={<Text style={{ color: "#6b7280" }}>
            {unit === "metric" ? tr("公制", "Metric") : tr("英制", "Imperial")}
          </Text>} />
          <View style={{ paddingTop: 10 }}>
            <Segmented
              value={unit}
              onChange={(v) => setUnit(v as UnitSystem)}
              options={[
                { label: tr("公制（cm, kg）", "Metric (cm, kg)"), value: "metric" },
                { label: tr("英制（ft, lbs）", "Imperial (ft, lbs)"), value: "imperial" },
              ]}
            />
          </View>
        </Card>

        {/* 等级系统 */}
        <Card style={{ marginHorizontal: 16, marginBottom: 12 ,borderRadius: 20 }}>
          <FieldRow label={tr("抱石等级体系", "Bouldering scale")} />
          <View style={{ paddingTop: 10 }}>
            <Segmented
              value={boulderScale}
              onChange={(v) => setBoulderScale(v as BoulderScale)}
              options={[
                { label: "V-scale", value: "V" },
                { label: "Font.", value: "Font" },
              ]}
            />
          </View>

          <View style={{ height: 12 }} />
        </Card>
        <Card style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 20 }}>
          <FieldRow label={tr("攀爬等级体系", "Rope grading")}/>
          <View style={{ paddingTop: 10 }}>
            <Segmented
              value={ropeScale}
              onChange={(v) => setRopeScale(v as RopeScale)}
              options={[
                { label: "YDS", value: "YDS" },
                { label: "French", value: "French" },
              ]}
            />
          </View>
        </Card>

        {/* 反馈 */}
        <Card style={{ marginHorizontal: 16, marginBottom: 16 , borderRadius: 20 }}>
          <FieldRow label={tr("意见反馈", "Feedback")} />
          <View style={{ paddingTop: 8 }}>
            <Text
              onPress={openFeedback}
              style={{ color: tokens.color.primary, fontWeight: "600" }}
            >
              {tr("发送邮件给我们", "Send us an email")}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
