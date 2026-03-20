// app/community/create.tsx

import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SmartBottomSheet from "../../src/features/community/components/SmartBottomSheet";
import HomeGymPickerSheet from "../../src/features/profile/components/HomeGymPickerSheet";
import { useCommunityStore } from "../../src/store/useCommunityStore";
import { plansApi } from "../../src/features/plans/api";
import { api } from "../../src/lib/apiClient";
import type { UserPostCreateIn } from "../../src/features/community/types";

type WidgetItem = { id: string; title: string; label: string; type: 'Plan' | 'Session' | 'Log' };

const AUDIENCE_OPTIONS = ['Public', 'Followers Only', 'Private'] as const;
const AUDIENCE_MAP: Record<string, 'public' | 'followers' | 'private'> = {
  'Public': 'public',
  'Followers Only': 'followers',
  'Private': 'private',
};
const AUDIENCE_ICONS: Record<string, string> = {
  'Public': 'globe-outline',
  'Followers Only': 'people-outline',
  'Private': 'lock-closed-outline',
};

const MAX_MEDIA = 10;
const MOCK_URLS = [
  "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1601224822079-5f8e28e14fd6?auto=format&fit=crop&w=400&q=80",
];

const VISIBILITY_TO_AUDIENCE: Record<string, string> = {
  'public': 'Public',
  'followers': 'Followers Only',
  'private': 'Private',
};

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    postId?: string;
    editContent?: string;
    editMedia?: string;
    editVisibility?: string;
  }>();
  const isEditMode = !!params.postId;
  const { createPost, updatePost } = useCommunityStore();

  const [content, setContent] = useState(params.editContent || "");
  const [mediaList, setMediaList] = useState<string[]>(() => {
    if (params.editMedia) {
      try { return JSON.parse(params.editMedia); } catch { return []; }
    }
    return [];
  });
  const [posting, setPosting] = useState(false);

  // Data State
  const [location, setLocation] = useState("");
  const [audience, setAudience] = useState(
    params.editVisibility ? (VISIBILITY_TO_AUDIENCE[params.editVisibility] || "Public") : "Public"
  );
  const [attachedWidget, setAttachedWidget] = useState<{
    id: string;
    type: 'plan' | 'session' | 'log';
    title: string;
    subtitle: string;
  } | null>(null);

  // Fetched widget data
  const [plans, setPlans] = useState<WidgetItem[]>([]);
  const [sessions, setSessions] = useState<WidgetItem[]>([]);
  const [logs, setLogs] = useState<WidgetItem[]>([]);
  const [widgetLoading, setWidgetLoading] = useState(false);

  // Location picker
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  // Sheet Logic
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'list'>('menu');
  const [activeSheetType, setActiveSheetType] = useState<'widget' | 'audience' | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'session' | 'log' | null>(null);

  // Fetch widget data on mount
  useEffect(() => {
    const loadWidgetData = async () => {
      setWidgetLoading(true);
      try {
        const [plansRes, logsRes, sessionsRes] = await Promise.allSettled([
          plansApi.getMyPlans(),
          api.get<any[]>('/climb-logs/me?limit=20'),
          api.get<any[]>('/sessions/me?limit=20'),
        ]);

        if (plansRes.status === 'fulfilled') {
          setPlans(plansRes.value.map((p: any) => ({
            id: p.id,
            title: p.title || 'Untitled Plan',
            label: p.duration_weeks ? `${p.duration_weeks} Weeks` : p.training_type || 'Plan',
            type: 'Plan' as const,
          })));
        }

        if (logsRes.status === 'fulfilled') {
          setLogs((logsRes.value || []).map((l: any) => ({
            id: l.id,
            title: l.route_name || `${l.grade || ''} Climb`,
            label: `${l.grade || ''} · ${l.climbed_at || ''}`.trim(),
            type: 'Log' as const,
          })));
        }

        if (sessionsRes.status === 'fulfilled') {
          setSessions((sessionsRes.value || []).map((s: any) => ({
            id: s.id,
            title: s.title || s.name || 'Session',
            label: s.session_type || 'Training',
            type: 'Session' as const,
          })));
        }
      } catch (e: any) {
        if (__DEV__) console.warn('loadWidgetData error:', e?.message);
      } finally {
        setWidgetLoading(false);
      }
    };
    loadWidgetData();
  }, []);

  const handleAddMedia = () => {
    if (mediaList.length >= MAX_MEDIA) return;
    // TODO: replace with actual image picker (expo-image-picker)
    const mockUrl = MOCK_URLS[mediaList.length % MOCK_URLS.length];
    setMediaList(prev => [...prev, mockUrl]);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
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

  const handleSelectWidget = (item: WidgetItem) => {
    const typeMap: Record<string, 'plan' | 'session' | 'log'> = {
      'Plan': 'plan', 'Session': 'session', 'Log': 'log',
    };
    setAttachedWidget({
      id: item.id,
      type: typeMap[item.type] || 'plan',
      title: item.title,
      subtitle: item.label,
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

  const getListData = (): WidgetItem[] => {
    if (activeTab === 'plan') return plans;
    if (activeTab === 'session') return sessions;
    if (activeTab === 'log') return logs;
    return [];
  };

  // Post via API (create or update)
  const handlePost = async () => {
    if (mediaList.length === 0) return;
    if (posting) return;

    setPosting(true);
    try {
      if (isEditMode) {
        await updatePost(params.postId!, {
          content_text: content || undefined,
          media: mediaList.length > 0
            ? mediaList.map(url => ({ type: 'image' as const, url }))
            : undefined,
          visibility: AUDIENCE_MAP[audience] || 'public',
        });
      } else {
        const postData: UserPostCreateIn = {
          content_text: content || undefined,
          media: mediaList.length > 0
            ? mediaList.map(url => ({ type: 'image' as const, url }))
            : undefined,
          attachment_type: attachedWidget?.type,
          attachment_id: attachedWidget?.id,
          attachment_meta: attachedWidget ? {
            title: attachedWidget.title,
            subtitle: attachedWidget.subtitle,
          } : undefined,
          visibility: AUDIENCE_MAP[audience] || 'public',
        };
        await createPost(postData);
      }
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || (isEditMode ? 'Failed to update post' : 'Failed to create post'));
    } finally {
      setPosting(false);
    }
  };

  const renderSheetContent = () => {
    if (activeSheetType === 'audience') {
      return (
        <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
          {AUDIENCE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt}
              style={styles.audienceOption}
              onPress={() => { setAudience(opt); handleCloseSheet(); }}
              activeOpacity={0.7}
            >
              <View style={styles.audienceIconWrap}>
                <Ionicons name={AUDIENCE_ICONS[opt] as any} size={20} color={audience === opt ? "#111" : "#9CA3AF"} />
              </View>
              <Text style={[styles.audienceText, audience === opt && styles.audienceTextActive]}>{opt}</Text>
              {audience === opt && <Ionicons name="checkmark" size={20} color="#111" style={{ marginLeft: 'auto' }} />}
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

      const listData = getListData();
      if (widgetLoading) {
        return (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#111" />
          </View>
        );
      }
      if (listData.length === 0) {
        return (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No {activeTab}s found</Text>
          </View>
        );
      }
      return (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {listData.map(item => (
            <TouchableOpacity key={item.id} style={styles.widgetListItem} onPress={() => handleSelectWidget(item)} activeOpacity={0.7}>
              <View style={[styles.widgetListIcon, {
                backgroundColor: activeTab === 'plan' ? '#FEF3C7' : activeTab === 'session' ? '#EEF2FF' : '#ECFDF5',
              }]}>
                <Ionicons
                  name={activeTab === 'plan' ? 'flash' : activeTab === 'session' ? 'barbell' : 'checkmark-circle'}
                  size={18}
                  color={activeTab === 'plan' ? '#D97706' : activeTab === 'session' ? '#4F46E5' : '#059669'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.widgetListTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.widgetListSub} numberOfLines={1}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }
    return null;
  };

  const canPost = mediaList.length > 0;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="close" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Post' : 'New Post'}</Text>
        <TouchableOpacity
          style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!canPost || posting}
          activeOpacity={0.8}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[styles.postBtnText, !canPost && styles.postBtnTextDisabled]}>
              {isEditMode ? 'Save' : 'Post'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Media Row — horizontal thumbnails */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaRow}
          >
            {mediaList.map((url, idx) => (
              <View key={`${idx}-${url}`} style={styles.mediaThumbnail}>
                <Image source={{ uri: url }} style={styles.mediaThumbnailImage} resizeMode="cover" />
                <TouchableOpacity style={styles.mediaRemoveBtn} onPress={() => handleRemoveMedia(idx)}>
                  <Ionicons name="close" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}
            {mediaList.length < MAX_MEDIA && (
              <TouchableOpacity style={styles.addMediaBtn} onPress={handleAddMedia} activeOpacity={0.7}>
                <Ionicons name="add" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Text Input */}
          <TextInput
            style={styles.input}
            placeholder="What's on your mind?"
            placeholderTextColor="#9CA3AF"
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />

          {/* Attached Widget Chip */}
          {attachedWidget && (
            <View style={styles.attachmentChip}>
              <Ionicons
                name={attachedWidget.type === 'plan' ? 'flash' : attachedWidget.type === 'session' ? 'barbell' : 'checkmark-circle'}
                size={16}
                color="#4F46E5"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.attachmentTitle} numberOfLines={1}>{attachedWidget.title}</Text>
                <Text style={styles.attachmentSub} numberOfLines={1}>{attachedWidget.subtitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setAttachedWidget(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Location Chip */}
          {!!location && (
            <View style={styles.locationChip}>
              <Ionicons name="location" size={14} color="#EF4444" />
              <Text style={styles.locationText}>{location}</Text>
              <TouchableOpacity onPress={() => setLocation("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom Toolbar — black buttons, no border */}
        <View style={[styles.toolbar, { paddingBottom: insets.bottom || 12 }]}>
          <View style={styles.toolbarActions}>
            <TouchableOpacity style={styles.toolbarBtn} onPress={() => setLocationPickerVisible(true)} activeOpacity={0.7}>
              <Ionicons name="location" size={18} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolbarBtn} onPress={handleOpenWidgetMenu} activeOpacity={0.7}>
              <Ionicons name="attach" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Pressable
            style={styles.audiencePill}
            onPress={() => { setActiveSheetType('audience'); setSheetMode('menu'); setSheetVisible(true); }}
          >
            <Ionicons name={AUDIENCE_ICONS[audience] as any} size={14} color="#FFF" />
            <Text style={styles.audiencePillText}>{audience}</Text>
            <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <SmartBottomSheet
        visible={isSheetVisible}
        onClose={handleCloseSheet}
        mode={sheetMode}
        title={
          activeSheetType === 'audience' ? 'Who can see this?' :
          activeTab ? `Select ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}` : 'Attach'
        }
      >
        {renderSheetContent()}
      </SmartBottomSheet>

      <HomeGymPickerSheet
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        title="Add Location"
        onSelect={(gym) => setLocation(gym.name)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
  },
  postBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 64,
    alignItems: 'center',
  },
  postBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  postBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  postBtnTextDisabled: {
    color: '#9CA3AF',
  },
  scrollContent: {
    padding: 16,
  },
  input: {
    fontSize: 17,
    color: '#111',
    minHeight: 120,
    lineHeight: 26,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 10,
  },
  attachmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  attachmentSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  mediaRow: {
    gap: 10,
    paddingBottom: 16,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMediaBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFF',
  },
  toolbarActions: {
    flexDirection: 'row',
    gap: 10,
  },
  toolbarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#111',
  },
  audiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  audiencePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  // Sheet styles
  widgetMenuContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  widgetMenuItem: {
    alignItems: 'center',
    gap: 8,
  },
  menuIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  widgetListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  widgetListIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  widgetListSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  audienceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
  },
  audienceIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  audienceTextActive: {
    color: '#111',
    fontWeight: '700',
  },
});
