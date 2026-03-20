import React, { useState } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Image, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Segmented } from "@components/ui/Segmented"; // 复用你的 Segmented

export default function HelpCenter() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Q&A");
  const [msg, setMsg] = useState("");

  const renderQA = () => (
    <View style={styles.tabContent}>
      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color="#94A3B8" />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search articles..." 
          placeholderTextColor="#94A3B8"
        />
      </View>
      {/* 模拟文章列表 */}
      <Text style={{color: '#64748B', marginTop: 20, textAlign: 'center'}}>Popular Articles...</Text>
    </View>
  );

  const renderAsk = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.askContainer}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 40 }}>
        {/* 客服头像 */}
        <Image 
          source={{ uri: "https://i.pravatar.cc/300?u=support" }} 
          style={styles.avatar} 
        />
        <Text style={styles.askTitle}>How can we help?</Text>
        
        {/* 消息输入框 */}
        <View style={styles.inputWrapper}>
            <TextInput
            style={styles.msgInput}
            multiline
            placeholder="Add your messages here, we will try our best to response in a day or two."
            placeholderTextColor="#94A3B8"
            value={msg}
            onChangeText={setMsg}
            textAlignVertical="top"
            />
        </View>
      </ScrollView>

      {/* 底部发送按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.sendBtn}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.navigate("/(tabs)/profile")} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        {/* 顶部 Segmented 切换 */}
        <View style={{ width: 160 }}>
          <Segmented 
            value={activeTab} 
            onChange={setActiveTab} 
            options={[{ label: "Q&A", value: "Q&A" }, { label: "Ask", value: "Ask" }]} 
          />
        </View>
        
        <View style={styles.headerBtn} />
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === "Q&A" ? renderQA() : renderAsk()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, height: 50, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerBtn: { width: 40 },
  tabContent: { padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#0F172A' },
  
  // Ask 样式
  askContainer: { flex: 1, justifyContent: 'space-between' },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16, backgroundColor: '#eee' },
  askTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 24 },
  inputWrapper: { width: '90%', height: 200, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  msgInput: { flex: 1, fontSize: 16, color: '#334155' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  sendBtn: { backgroundColor: '#000', borderRadius: 25, height: 50, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});