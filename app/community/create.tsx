// app/community/create.tsx

import React, { useState } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, 
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TopBar from "../../components/TopBar"; 
import SmartBottomSheet from "../../src/features/community/components/SmartBottomSheet";
import { useCommunityStore } from "../../src/store/useCommunityStore"; // [引入 Store]

// --- Mock Data ---
const MY_PLANS = [
  { id: 'p1', title: 'Winter Power Endurance', label: '8 Weeks', type: 'Plan' },
  { id: 'p2', title: 'Finger Strength 101', label: '4 Weeks', type: 'Plan' },
];
const MY_SESSIONS = [
  { id: 's1', title: 'Morning Max Hangs', label: 'Strength', type: 'Session' },
  { id: 's2', title: 'Limit Bouldering', label: 'Technique', type: 'Session' },
];
const MY_LOGS = [
  { id: 'l1', title: 'Sent "La Dura Dura"', label: 'V15 · Yesterday', type: 'Log' },
  { id: 'l2', title: 'Moonboard Benchmark', label: 'V4 · 2 days ago', type: 'Log' },
];

// --- Sub-Component: Action Row ---
const ActionRow = ({ icon, label, value, onPress, placeholder = "Select", highlight = false }: any) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.rowLeft}>
      <View style={[styles.iconCircle, highlight && { backgroundColor: '#EEF2FF' }]}>
        <Ionicons name={icon} size={20} color={highlight ? "#4F46E5" : "#374151"} />
      </View>
      <Text style={[styles.rowLabel, highlight && { color: "#111", fontWeight: '600' }]}>{label}</Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={[styles.rowValue, value ? styles.rowValueActive : null]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </View>
  </TouchableOpacity>
);

// --- Fake Current User ---
// 在真实 App 中，这应该来自 useUserStore
const CURRENT_USER = {
  id: 'me',
  username: 'MyClimbLog',
  avatar: 'https://i.pravatar.cc/150?u=me', // 你可以换成你喜欢的头像
  level: 'V5',
  homeGym: 'Sender One'
};

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addPost } = useCommunityStore(); // [Store Hook]
  
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<string | null>(null);
  
  // Data State
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState("Public");
  // 附件数据结构微调，方便存储
  const [attachedWidget, setAttachedWidget] = useState<{
    id: string, 
    type: 'shared_plan' | 'finished_session' | 'log', // 映射到 FeedPost 的 attachment type
    title: string, 
    subtitle: string 
  } | null>(null);

  // Sheet Logic
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'list'>('menu'); 
  const [activeSheetType, setActiveSheetType] = useState<'widget' | 'location' | 'audience' | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'session' | 'log' | null>(null);

  const handleAddMedia = () => {
    setMedia("https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80");
  };

  const handleOpenWidgetMenu = () => {
    setActiveSheetType('widget');
    setSheetMode('menu'); 
    setSheetVisible(true);
  };

  const handleSelectWidgetType = (type: 'plan' | 'session' | 'log') => {
    setActiveTab(type);
    setSheetMode('list'); 
  };

  const handleSelectWidget = (item: any) => {
    // 映射类型：将 UI 的 type 映射到数据结构需要的 type
    let attachType: 'shared_plan' | 'finished_session' = 'shared_plan';
    if (item.type === 'Session' || item.type === 'Log') attachType = 'finished_session';
    
    setAttachedWidget({ 
      id: item.id, 
      type: attachType, 
      title: item.title,
      subtitle: item.label
    });
    setSheetVisible(false);
  };

  const handleCloseSheet = () => {
    setSheetVisible(false);
    setTimeout(() => {
        setActiveSheetType(null);
        setActiveTab(null);
    }, 300);
  };

  const getListData = () => {
    if (activeTab === 'plan') return MY_PLANS;
    if (activeTab === 'session') return MY_SESSIONS;
    if (activeTab === 'log') return MY_LOGS;
    return [];
  };

  // [核心功能] 发布帖子
  const handlePost = () => {
    if (!content && !media) return;

    // 1. 调用 Store Action
    addPost({
      user: CURRENT_USER,
      content: content,
      images: media ? [media] : undefined,
      attachment: attachedWidget ? {
        type: attachedWidget.type,
        id: attachedWidget.id,
        title: attachedWidget.title,
        subtitle: attachedWidget.subtitle
      } : undefined
    });

    // 2. 返回
    router.back();
  };

  const renderSheetContent = () => {
    if (activeSheetType === 'location') {
        return (
            <TouchableOpacity style={styles.sheetItem} onPress={() => { setLocation("Sender One LAX"); handleCloseSheet(); }}>
                <Ionicons name="location" size={20} color="#EF4444" style={{marginRight: 12}} />
                <Text style={styles.sheetText}>Sender One LAX</Text>
            </TouchableOpacity>
        );
    }
    
    if (activeSheetType === 'audience') {
        return (
             <View style={{ height: '100%', justifyContent: 'center', paddingBottom: 20 }}>
                 {['Public', 'Followers Only', 'Private'].map(opt => (
                     <TouchableOpacity 
                        key={opt} 
                        style={[styles.sheetItem, { justifyContent: 'center' }]} 
                        onPress={() => { setAudience(opt); handleCloseSheet(); }}
                     >
                         <Text style={[styles.sheetText, { textAlign: 'center' }]}>{opt}</Text>
                         {audience === opt && <Ionicons name="checkmark" size={20} color="#111" style={{ position: 'absolute', right: 0 }} />}
                     </TouchableOpacity>
                 ))}
             </View>
        );
    }

    if (activeSheetType === 'widget') {
        if (sheetMode === 'menu') {
            return (
                <View style={styles.widgetMenuContainer}>
                    <TouchableOpacity style={styles.widgetMenuItem} onPress={() => handleSelectWidgetType('session')}>
                        <View style={[styles.menuIconBox, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="barbell" size={24} color="#4F46E5" />
                        </View>
                        <Text style={styles.menuLabel}>Session</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.widgetMenuItem} onPress={() => handleSelectWidgetType('plan')}>
                         <View style={[styles.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="flash" size={24} color="#D97706" />
                        </View>
                        <Text style={styles.menuLabel}>Plan</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.widgetMenuItem} onPress={() => handleSelectWidgetType('log')}>
                         <View style={[styles.menuIconBox, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="checkmark-done-circle" size={24} color="#059669" />
                        </View>
                        <Text style={styles.menuLabel}>Log</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        return (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {getListData().map(item => (
                    <TouchableOpacity key={item.id} style={styles.sheetItem} onPress={() => handleSelectWidget(item)}>
                        <View style={[styles.sheetIcon, { backgroundColor: '#F3F4F6' }]}>
                            <Ionicons 
                                name={activeTab === 'plan' ? 'flash' : activeTab === 'session' ? 'barbell' : 'checkmark-circle'} 
                                size={20} 
                                color="#111" 
                            />
                        </View>
                        <View>
                            <Text style={styles.sheetText}>{item.title}</Text>
                            <Text style={styles.sheetSub}>{item.label}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    }
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar 
            routeName="create"
            title="Create Post"
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }}
        />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.contentContainer}>
            <View style={styles.mediaSection}>
                {media ? (
                    <View style={styles.mediaPreview}>
                        <Image source={{ uri: media }} style={styles.imageFull} resizeMode="cover" />
                        <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setMedia(null)}>
                            <Ionicons name="close" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.addMediaCard} onPress={handleAddMedia}>
                        <Ionicons name="add" size={32} color="#9CA3AF" />
                        <Text style={styles.addMediaText}>Add Photos/Videos</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.inputSection}>
                <TextInput
                    style={styles.input}
                    placeholder="Share your climbing journey..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    value={content}
                    onChangeText={setContent}
                    textAlignVertical="top"
                />
                
                {attachedWidget && (
                    <View style={styles.attachmentChip}>
                        <Ionicons name="attach" size={16} color="#4F46E5" />
                        <Text style={styles.attachmentText}>{attachedWidget.title}</Text>
                        <TouchableOpacity onPress={() => setAttachedWidget(null)}>
                            <Ionicons name="close" size={16} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inlineTools}>
                    <TouchableOpacity style={styles.toolChip}><Text style={styles.toolText}>@ Mention</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.toolChip}><Text style={styles.toolText}># Topic</Text></TouchableOpacity>
                </View>
            </View>

            <View style={styles.actionsList}>
                <ActionRow 
                    icon="location-outline" label="Add Location" value={location} 
                    onPress={() => { setActiveSheetType('location'); setSheetMode('list'); setSheetVisible(true); }}
                />
                <View style={styles.divider} />
                <ActionRow 
                    icon="grid-outline" label="Add Widget" value={attachedWidget ? attachedWidget.title : ""} 
                    placeholder="Session / Plan / Log" highlight onPress={handleOpenWidgetMenu}
                />
                <View style={styles.divider} />
                <ActionRow 
                    icon="people-outline" label="Audience" value={audience} 
                    onPress={() => { setActiveSheetType('audience'); setSheetMode('menu'); setSheetVisible(true); }}
                />
            </View>
        </View>
      </ScrollView>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.footer, { paddingBottom: insets.bottom || 20 }]}>
            <TouchableOpacity style={styles.draftBtn}>
                <Ionicons name="file-tray-full-outline" size={20} color="#111" />
                <Text style={styles.draftText}>Save Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.shareBtn, !content && !media && styles.shareBtnDisabled]} 
                onPress={handlePost}
                disabled={!content && !media}
            >
                <Text style={styles.shareText}>Share</Text>
                <Ionicons name="arrow-up" size={20} color="#FFF" />
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <SmartBottomSheet 
        visible={isSheetVisible} 
        onClose={handleCloseSheet} 
        mode={sheetMode} 
        title={activeTab ? `Select ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` : 'Select'}
      >
         {renderSheetContent()}
      </SmartBottomSheet>

    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: { padding: 16 },
  mediaSection: { marginBottom: 20 },
  addMediaCard: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  addMediaText: { fontSize: 10, color: '#9CA3AF', marginTop: 4, fontWeight: '600' },
  mediaPreview: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  imageFull: { width: '100%', height: '100%' },
  removeMediaBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inputSection: { marginBottom: 24 },
  input: { fontSize: 16, color: '#111', minHeight: 80, lineHeight: 24 },
  inlineTools: { flexDirection: 'row', gap: 12, marginTop: 12 },
  toolChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  toolText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  attachmentChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', padding: 8, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8, gap: 6 },
  attachmentText: { color: '#4F46E5', fontSize: 13, fontWeight: '600' },
  actionsList: { borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6' },
  rowLabel: { fontSize: 16, color: '#111' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { fontSize: 14, color: '#9CA3AF', maxWidth: 150 },
  rowValueActive: { color: '#4F46E5', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 44 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', backgroundColor: '#FFF' },
  draftBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  draftText: { fontSize: 15, fontWeight: '600', color: '#111' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#111', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  shareBtnDisabled: { backgroundColor: '#E5E7EB' },
  shareText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  widgetMenuContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 20 },
  widgetMenuItem: { alignItems: 'center', gap: 8 },
  menuIconBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  sheetIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sheetText: { fontSize: 16, color: '#111', fontWeight: '500' },
  sheetSub: { fontSize: 12, color: '#6B7280' }
});