// app/community/create.tsx

import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
  Pressable,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import SmartBottomSheet from "../../src/features/community/components/SmartBottomSheet";
import HomeGymPickerSheet from "../../src/features/profile/components/HomeGymPickerSheet";
import { useCommunityStore } from "../../src/store/useCommunityStore";
import { plansApi } from "../../src/features/plans/api";
import { api } from "../../src/lib/apiClient";
import type { UserPostCreateIn } from "../../src/features/community/types";
import { PostAttachmentCard } from "../../src/components/shared/PostAttachmentCard";
import { useFavoriteGyms } from "../../src/features/gyms/hooks";

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

function buildMetricsFromWidget(widget: { type: string; title: string; subtitle: string } | null) {
  if (!widget) return undefined;
  if (widget.type === 'plan') {
    const parts = widget.subtitle.split(' · ');
    return [
      { label: 'Weeks', value: parts[0]?.replace(' weeks', '') || '—' },
      { label: 'Sessions/wk', value: parts[1]?.replace(' sessions/wk', '') || '—' },
      { label: 'Type', value: parts[2] || '—' },
    ];
  }
  const parts = widget.subtitle.split(' · ');
  return [
    { label: 'Gym', value: widget.title.split(' · ')[0] || '—' },
    { label: 'Date', value: widget.title.split(' · ')[1] || '—' },
    { label: 'Sends', value: parts[0]?.replace(' sends', '') || '—' },
    { label: 'Best', value: parts[1] || '—' },
    { label: 'Duration', value: parts[2] || '—' },
  ];
}

export default function CreatePostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    postId?: string;
    editContent?: string;
    editMedia?: string;
    editVisibility?: string;
    // Prefill from share flow (media-select → create)
    prefillMedia?: string;
    prefillAttachType?: string;
    prefillAttachId?: string;
    prefillAttachTitle?: string;
    prefillAttachSubtitle?: string;
  }>();
  const isEditMode = !!params.postId;
  const { createPost, updatePost } = useCommunityStore();

  const [content, setContent] = useState(params.editContent || "");
  const [mediaList, setMediaList] = useState<string[]>(() => {
    if (params.prefillMedia) {
      try { return JSON.parse(params.prefillMedia); } catch { return []; }
    }
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
  } | null>(() => {
    if (params.prefillAttachType) {
      return {
        id: params.prefillAttachId || '',
        type: params.prefillAttachType as 'plan' | 'session' | 'log',
        title: params.prefillAttachTitle || '',
        subtitle: params.prefillAttachSubtitle || '',
      };
    }
    return null;
  });

  // Fetched widget data
  const [plans, setPlans] = useState<WidgetItem[]>([]);
  const [sessions, setSessions] = useState<WidgetItem[]>([]);
  const [logs, setLogs] = useState<WidgetItem[]>([]);
  const [widgetLoading, setWidgetLoading] = useState(false);

  // Gym selector
  const { favorites: favoriteGyms } = useFavoriteGyms();
  const [selectedGym, setSelectedGym] = useState<{ id: string; name: string } | null>(null);

  // Location picker
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  // Sheet Logic
  const [isSheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'list'>('menu');
  const [activeSheetType, setActiveSheetType] = useState<'widget' | 'audience' | 'gym' | null>(null);
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
    if (mediaList.length === 0 && !attachedWidget && !(content?.trim())) return;
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
        // Only include attachment fields if we have a valid attachment_id
        // (sessions without a backend ID can't be navigated to)
        const hasValidAttachment = attachedWidget && attachedWidget.id;
        const postData: UserPostCreateIn = {
          content_text: content || undefined,
          media: mediaList.length > 0
            ? mediaList.map(url => ({ type: 'image' as const, url }))
            : undefined,
          attachment_type: hasValidAttachment ? attachedWidget.type : undefined,
          attachment_id: hasValidAttachment ? attachedWidget.id : undefined,
          attachment_meta: hasValidAttachment ? {
            title: attachedWidget.title,
            subtitle: attachedWidget.subtitle,
            metrics: buildMetricsFromWidget(attachedWidget),
          } : undefined,
          visibility: AUDIENCE_MAP[audience] || 'public',
          gym_id: selectedGym?.id || undefined,
        };
        await createPost(postData);

        // Auto-set session/log to public so others can view via attachment card
        if (attachedWidget && (attachedWidget.type === 'session' || attachedWidget.type === 'log') && attachedWidget.id) {
          api.post(`/sessions/${attachedWidget.id}/share`, { public: true }).catch(() => {});
        }
      }
      // If we came from media-select (share flow), go back 2 levels to log-detail
      if (params.prefillAttachType) {
        router.dismiss(2);
      } else {
        router.back();
      }
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

    if (activeSheetType === 'gym') {
      return (
        <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
          <TouchableOpacity
            style={styles.audienceOption}
            onPress={() => { setSelectedGym(null); handleCloseSheet(); }}
            activeOpacity={0.7}
          >
            <View style={styles.audienceIconWrap}>
              <Ionicons name="close-circle-outline" size={20} color={!selectedGym ? "#111" : "#9CA3AF"} />
            </View>
            <Text style={[styles.audienceText, !selectedGym && styles.audienceTextActive]}>No gym</Text>
            {!selectedGym && <Ionicons name="checkmark" size={20} color="#111" style={{ marginLeft: 'auto' }} />}
          </TouchableOpacity>
          {favoriteGyms.map(g => {
            const isSelected = selectedGym?.id === g.gym_id;
            return (
              <TouchableOpacity
                key={g.gym_id}
                style={styles.audienceOption}
                onPress={() => { setSelectedGym({ id: g.gym_id, name: g.name }); handleCloseSheet(); }}
                activeOpacity={0.7}
              >
                <View style={styles.audienceIconWrap}>
                  <Ionicons name="business-outline" size={20} color={isSelected ? "#111" : "#9CA3AF"} />
                </View>
                <Text style={[styles.audienceText, isSelected && styles.audienceTextActive]} numberOfLines={1}>{g.name}</Text>
                {isSelected && <Ionicons name="checkmark" size={20} color="#111" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            );
          })}
          {favoriteGyms.length === 0 && (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No favorite gyms yet</Text>
            </View>
          )}
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

  const canPost = mediaList.length > 0 || !!attachedWidget || (content?.trim().length ?? 0) > 0;

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
            placeholderTextColor={colors.textTertiary}
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />

          {/* Attached Widget */}
          {attachedWidget && (
            <View style={styles.attachmentPreview}>
              {params.prefillAttachType ? (
                attachedWidget.type === 'plan' ? (
                  <PostAttachmentCard
                    type="plan"
                    data={{
                      name: attachedWidget.title,
                      totalWeeks: '—',
                      sessionsPerWeek: '—',
                      type: '—',
                    }}
                  />
                ) : (
                  <PostAttachmentCard
                    type="routeLog"
                    data={{
                      gymName: attachedWidget.title.split(' · ')[0] || '—',
                      date: attachedWidget.title.split(' · ')[1] || '—',
                      sends: attachedWidget.subtitle.split(' · ')[0]?.replace(' sends', '') || '—',
                      bestGrade: attachedWidget.subtitle.split(' · ')[1] || '—',
                      duration: attachedWidget.subtitle.split(' · ')[2] || '—',
                    }}
                  />
                )
              ) : (
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
                </View>
              )}
              <TouchableOpacity
                onPress={() => setAttachedWidget(null)}
                style={styles.removeAttachBtn}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Selected Gym Chip */}
          {selectedGym && (
            <View style={[styles.locationChip, { backgroundColor: 'rgba(48,110,111,0.1)' }]}>
              <Ionicons name="business" size={14} color={colors.accent} />
              <Text style={[styles.locationText, { color: colors.accent }]}>{selectedGym.name}</Text>
              <TouchableOpacity onPress={() => setSelectedGym(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
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

            <TouchableOpacity
              style={[styles.toolbarBtn, selectedGym && { backgroundColor: colors.accent }]}
              onPress={() => { setActiveSheetType('gym'); setSheetMode('menu'); setSheetVisible(true); }}
              activeOpacity={0.7}
            >
              <Ionicons name="business" size={18} color="#FFF" />
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
          activeSheetType === 'gym' ? 'Select Gym' :
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

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
  },
  postBtn: {
    backgroundColor: colors.cardDark,
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
    fontFamily: theme.fonts.bold,
    color: '#FFF',
  },
  postBtnTextDisabled: {
    color: '#9CA3AF',
  },
  scrollContent: {
    padding: 16,
  },
  input: {
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    color: colors.textPrimary,
    minHeight: 120,
    lineHeight: 28,
  },
  attachmentPreview: {
    position: 'relative',
    marginTop: 12,
  },
  removeAttachBtn: {
    position: 'absolute',
    top: -6,
    right: -4,
    zIndex: 1,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  attachmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  attachmentSub: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
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
    backgroundColor: colors.backgroundSecondary,
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
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.background,
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
    backgroundColor: colors.cardDark,
  },
  audiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  audiencePillText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
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
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  widgetListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
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
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  widgetListSub: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
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
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceText: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  audienceTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
});
