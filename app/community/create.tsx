// app/community/create.tsx

import React, { useState, useEffect, useMemo, useLayoutEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Modal,
  Pressable, Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Host, Button as SUIButton } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { useCommunityStore } from "../../src/store/useCommunityStore";
import { api } from "../../src/lib/apiClient";
import type { UserPostCreateIn } from "../../src/features/community/types";
import { PostAttachmentCard } from "../../src/components/shared/PostAttachmentCard";
import LocationSheet from "../../src/features/community/components/LocationSheet";
import GymTagSheet from "../../src/features/community/components/GymTagSheet";
import { setAttachmentCallback } from "../../src/features/community/pendingAttachment";

const AUDIENCE_OPTIONS = [
  { value: 'public' as const, label: 'Public', icon: 'globe-outline' as const },
  { value: 'followers' as const, label: 'Followers Only', icon: 'people-outline' as const },
  { value: 'private' as const, label: 'Private', icon: 'lock-closed-outline' as const },
];

const MAX_MEDIA = 10;
const MOCK_URLS = [
  "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1601224822079-5f8e28e14fd6?auto=format&fit=crop&w=400&q=80",
];

const VISIBILITY_TO_AUDIENCE: Record<string, 'public' | 'followers' | 'private'> = {
  'public': 'public',
  'followers': 'followers',
  'private': 'private',
};

const AUDIENCE_LABEL: Record<string, string> = {
  'public': 'Public',
  'followers': 'Followers Only',
  'private': 'Private',
};

const AUDIENCE_ICON: Record<string, string> = {
  'public': 'globe-outline',
  'followers': 'people-outline',
  'private': 'lock-closed-outline',
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    postId?: string;
    editContent?: string;
    editMedia?: string;
    editVisibility?: string;
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
  const [visibility, setVisibility] = useState<'public' | 'followers' | 'private'>(
    params.editVisibility ? (VISIBILITY_TO_AUDIENCE[params.editVisibility] || 'public') : 'public'
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

  // Gym selector
  const [selectedGym, setSelectedGym] = useState<{ id: string; name: string } | null>(null);

  // BottomSheetModal visibility
  const [locationSheetVisible, setLocationSheetVisible] = useState(false);
  const [gymSheetVisible, setGymSheetVisible] = useState(false);

  // Popover visibility
  const [attachPopoverVisible, setAttachPopoverVisible] = useState(false);
  const [visibilityPopoverVisible, setVisibilityPopoverVisible] = useState(false);

  // Popover positioning
  const attachBtnRef = useRef<View>(null);
  const visibilityBtnRef = useRef<View>(null);
  const [attachPopoverPos, setAttachPopoverPos] = useState({ x: 0, y: 0 });
  const [visibilityPopoverPos, setVisibilityPopoverPos] = useState({ x: 0, y: 0 });

  // Attachment callback: when returning from select-session/select-plan
  const setAttachedWidgetRef = useRef(setAttachedWidget);
  setAttachedWidgetRef.current = setAttachedWidget;

  useEffect(() => {
    setAttachmentCallback((item) => {
      setAttachedWidgetRef.current(item);
    });
    return () => setAttachmentCallback(null);
  }, []);

  const handleAddMedia = () => {
    if (mediaList.length >= MAX_MEDIA) return;
    const mockUrl = MOCK_URLS[mediaList.length % MOCK_URLS.length];
    setMediaList(prev => [...prev, mockUrl]);
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
  };

  const openAttachPopover = () => {
    attachBtnRef.current?.measureInWindow((x, y) => {
      setAttachPopoverPos({ x, y });
      setAttachPopoverVisible(true);
    });
  };

  const openVisibilityPopover = () => {
    visibilityBtnRef.current?.measureInWindow((x, y) => {
      setVisibilityPopoverPos({ x, y });
      setVisibilityPopoverVisible(true);
    });
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
          visibility,
        });
      } else {
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
          visibility,
          gym_id: selectedGym?.id || undefined,
        };
        await createPost(postData);

        if (attachedWidget && (attachedWidget.type === 'session' || attachedWidget.type === 'log') && attachedWidget.id) {
          api.post(`/sessions/${attachedWidget.id}/share`, { public: true }).catch(() => {});
        }
      }
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

  const canPost = mediaList.length > 0 || !!attachedWidget || (content?.trim().length ?? 0) > 0;

  const handlePostRef = useRef<() => void>(() => {});
  handlePostRef.current = handlePost;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Post' : 'New Post',
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => (
        <Host matchContents>
          <SUIButton
            systemImage={"xmark" as any}
            label=""
            onPress={() => router.back()}
            modifiers={[buttonStyle("plain"), labelStyle("iconOnly"), frame({ width: 34, height: 34, alignment: "center" })]}
          />
        </Host>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => handlePostRef.current()}
          disabled={!canPost || posting}
          activeOpacity={0.6}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            opacity: (!canPost || posting) ? 0.35 : 1,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textPrimary }}>
            {posting ? '...' : (isEditMode ? 'Save' : 'Post')}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, isEditMode, canPost, posting]);

  const visLabel = AUDIENCE_LABEL[visibility];
  const visIcon = AUDIENCE_ICON[visibility];

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
        >
          {/* Media Row */}
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

          {/* Attached Widget Preview */}
          {attachedWidget && (
            <View style={styles.attachmentPreview}>
              {attachedWidget.type === 'plan' ? (
                <PostAttachmentCard
                  type="plan"
                  data={{
                    name: attachedWidget.title,
                    totalWeeks: attachedWidget.subtitle.split(' · ')[0]?.replace(' weeks', '') || '—',
                    sessionsPerWeek: attachedWidget.subtitle.split(' · ')[1]?.replace(' sessions/wk', '') || '—',
                    type: attachedWidget.subtitle.split(' · ')[2] || '—',
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
              )}
              <TouchableOpacity
                onPress={() => setAttachedWidget(null)}
                style={styles.removeAttachBtn}
                hitSlop={8}
              >
                <View style={styles.removeAttachCircle}>
                  <Ionicons name="close" size={10} color="#FFF" />
                </View>
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

        {/* Bottom Toolbar — bare icons + pill */}
        <View style={[styles.toolbar, { paddingBottom: insets.bottom || 12 }]}>
          {/* Location */}
          <TouchableOpacity
            onPress={() => setLocationSheetVisible(true)}
            style={styles.toolbarIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="location"
              size={22}
              color={location ? colors.textPrimary : colors.textTertiary}
            />
          </TouchableOpacity>

          {/* Gym Tag */}
          <TouchableOpacity
            onPress={() => setGymSheetVisible(true)}
            style={styles.toolbarIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business"
              size={22}
              color={selectedGym ? colors.textPrimary : colors.textTertiary}
            />
          </TouchableOpacity>

          {/* Attachment */}
          <View ref={attachBtnRef} collapsable={false}>
            <TouchableOpacity
              onPress={openAttachPopover}
              style={styles.toolbarIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name="attach"
                size={22}
                color={attachedWidget ? colors.textPrimary : colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          {/* Visibility Pill */}
          <View ref={visibilityBtnRef} collapsable={false}>
            <Pressable
              style={styles.audiencePill}
              onPress={openVisibilityPopover}
            >
              <Ionicons name={visIcon as any} size={13} color="#FFF" />
              <Text style={styles.audiencePillText}>{visLabel}</Text>
              <Ionicons name="chevron-down" size={11} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Location BottomSheetModal */}
      <LocationSheet
        visible={locationSheetVisible}
        onClose={() => setLocationSheetVisible(false)}
        onSelect={(gym) => setLocation(gym.name)}
      />

      {/* Gym Tag BottomSheetModal */}
      <GymTagSheet
        visible={gymSheetVisible}
        onClose={() => setGymSheetVisible(false)}
        selectedGymId={selectedGym?.id ?? null}
        onSelect={(gym) => setSelectedGym(gym)}
      />

      {/* Attachment Popover */}
      <Modal
        transparent
        visible={attachPopoverVisible}
        animationType="none"
        onRequestClose={() => setAttachPopoverVisible(false)}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setAttachPopoverVisible(false)}
          activeOpacity={1}
        />
        <View style={[styles.popover, {
          bottom: (SCREEN_HEIGHT - attachPopoverPos.y) + 12,
          left: attachPopoverPos.x - 8,
        }]}>
          <TouchableOpacity
            onPress={() => {
              setAttachPopoverVisible(false);
              router.push('/community/select-session');
            }}
            style={[styles.popoverRow, styles.popoverRowBorder]}
          >
            <View style={styles.popoverIcon}>
              <Ionicons name="barbell" size={16} color={colors.textPrimary} />
            </View>
            <Text style={styles.popoverText}>Session</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setAttachPopoverVisible(false);
              router.push('/community/select-plan');
            }}
            style={styles.popoverRow}
          >
            <View style={styles.popoverIcon}>
              <Ionicons name="flash" size={16} color={colors.textPrimary} />
            </View>
            <Text style={styles.popoverText}>Plan</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Visibility Popover */}
      <Modal
        transparent
        visible={visibilityPopoverVisible}
        animationType="none"
        onRequestClose={() => setVisibilityPopoverVisible(false)}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => setVisibilityPopoverVisible(false)}
          activeOpacity={1}
        />
        <View style={[styles.popover, {
          bottom: (SCREEN_HEIGHT - visibilityPopoverPos.y) + 12,
          right: 22,
        }]}>
          {AUDIENCE_OPTIONS.map((opt, index) => {
            const isSelected = visibility === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setVisibility(opt.value);
                  setVisibilityPopoverVisible(false);
                }}
                style={[
                  styles.popoverRow,
                  index < AUDIENCE_OPTIONS.length - 1 && styles.popoverRowBorder,
                  isSelected && { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <View style={[
                  styles.popoverIcon,
                  isSelected && { backgroundColor: '#1C1C1E' },
                ]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={15}
                    color={isSelected ? '#FFF' : colors.textSecondary}
                  />
                </View>
                <Text style={[
                  styles.popoverText,
                  isSelected && { fontWeight: '700', fontFamily: theme.fonts.bold },
                ]}>
                  {opt.label}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={15} color="#306E6F" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
    paddingHorizontal: 6,
  },
  removeAttachBtn: {
    position: 'absolute',
    top: -6,
    right: 0,
    zIndex: 1,
  },
  removeAttachCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
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
  // Bottom toolbar
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  toolbarIconBtn: {
    padding: 8,
    marginRight: 4,
  },
  audiencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1C1C1E',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  audiencePillText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: '#FFF',
  },
  // Popover
  popover: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
    overflow: 'hidden',
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  popoverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  popoverRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderTertiary,
  },
  popoverIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
    flex: 1,
  },
});
