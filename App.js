import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useState } from "react";
import { ActivityIndicator, Alert, Button, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import Markdown from "react-native-markdown-display";

// ★ 修改为你的服务地址
const API_BASE = "http://100.110.185.31:8000/plan";

export default function App() {
  const [form, setForm] = useState({
    height: "180",
    weight: "77",
    bodyfat: "20",
    bw_pullups: "8个 × 5组",
    weighted_pullups: "25磅 5个 × 5组",
    one_arm_hang: "5",
    finger_weakness: "4指/6指悬挂薄弱",
    grade: "4-5",
  });
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("");

  const update = (k, v) => setForm({ ...form, [k]: v });

  const generate = async () => {
    try {
      setLoading(true);
      const payload = {
        height: parseInt(form.height, 10),
        weight: parseFloat(form.weight),
        bodyfat: parseFloat(form.bodyfat),
        bw_pullups: form.bw_pullups,
        weighted_pullups: form.weighted_pullups,
        one_arm_hang: parseInt(form.one_arm_hang, 10),
        finger_weakness: form.finger_weakness,
        grade: form.grade,
      };
      const { data } = await axios.post(API_BASE, payload, { timeout: 60000 });
      setPlan(data.plan);
      await AsyncStorage.setItem("@last_plan", JSON.stringify({ at: Date.now(), payload, plan: data.plan }));
    } catch (e) {
      console.log(e);
      Alert.alert("出错了", "请检查后端是否在运行，或 API_BASE 地址是否正确（同一Wi-Fi）");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "bold", marginBottom: 12 }}>攀岩训练计划生成器</Text>

        {[
          ["身高(cm)", "height"],
          ["体重(kg)", "weight"],
          ["体脂率(%)", "bodyfat"],
          ["自重引体", "bw_pullups"],
          ["负重引体", "weighted_pullups"],
          ["单臂悬挂(秒)", "one_arm_hang"],
          ["指力弱项", "finger_weakness"],
          ["当前水平(Vx)", "grade"],
        ].map(([label, key]) => (
          <View key={key} style={{ marginBottom: 10 }}>
            <Text>{label}</Text>
            <TextInput
              value={form[key]}
              onChangeText={(t) => update(key, t)}
              placeholder={label}
              style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 8 }}
            />
          </View>
        ))}

        <Button title={loading ? "生成中..." : "生成训练计划"} onPress={generate} disabled={loading} />
        {loading && <ActivityIndicator style={{ marginTop: 12 }} />}

        {plan?.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>结果</Text>
            <Markdown>{plan}</Markdown>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
