// app/community/create.tsx

import React, { useState, useEffect, useMemo, useLayoutEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Modal,
  Pressable, Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Host, Button as SUIButton } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { useCommunityStore } from "../../src/store/useCommunityStore";
import type { PickedMediaItem } from "../../src/features/community/types";
import { PostAttachmentCard } from "../../src/components/shared/PostAttachmentCard";
import LocationSheet from "../../src/features/community/components/LocationSheet";
import GymTagSheet from "../../src/features/community/components/GymTagSheet";
import { setAttachmentCallback } from "../../src/features/community/pendingAttachment";
import { consumePendingMedia } from "../../src/features/community/pendingMedia";
import { setPostDraft } from "../../src/features/community/pendingPostDraft";
import { consumeCoverUpdate } from "../../src/features/community/pendingCoverUpdate";
import { uploadPostMedia, uploadThumbnailToR2 } from "../../src/features/community/api";
import { submitPostInBackground } from "../../src/features/community/postUploadManager";

const AUDIENCE_OPTIONS = [
  { value: 'public' as const, label: 'Public', icon: 'globe-outline' as const },
  { value: 'followers' as const, label: 'Followers Only', icon: 'people-outline' as const },
  { value: 'private' as const, label: 'Private', icon: 'lock-closed-outline' as const },
];

const MAX_MEDIA = 20;

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
    prefillGymId?: string;
    prefillGymName?: string;
    fromPicker?: string;
    source?: string;
  }>();
  const isEditMode = !!params.postId;
  const { updatePost } = useCommunityStore();

  const [content, setContent] = useState(params.editContent || "");
  const [mediaList, setMediaList] = useState<PickedMediaItem[]>(() => {
    if (params.prefillMedia) {
      try {
        const urls = JSON.parse(params.prefillMedia) as string[];
        return urls.map((url, i) => ({ id: `prefill-${i}`, uri: url, mediaType: 'image' as const, width: 0, height: 0 }));
      } catch { return []; }
    }
    if (params.editMedia) {
      try {
        const urls = JSON.parse(params.editMedia) as string[];
        return urls.map((url, i) => ({ id: `edit-${i}`, uri: url, mediaType: 'image' as const, width: 0, height: 0 }));
      } catch { return []; }
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

  // Gym selector — auto-populate from prefill params (e.g., share from session)
  const [selectedGym, setSelectedGym] = useState<{ id: string; name: string } | null>(() => {
    if (params.prefillGymId && params.prefillGymName) {
      return { id: params.prefillGymId, name: params.prefillGymName };
    }
    return null;
  });

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

  // Cover picker queue — navigate to cover-picker for each video sequentially
  const coverPickerQueueRef = useRef<string[]>([]);
  const hasVideos = useMemo(() => mediaList.some(m => m.mediaType === 'video'), [mediaList]);

  const navigateToNextCoverPicker = useCallback(() => {
    const nextId = coverPickerQueueRef.current.shift();
    if (!nextId) return;
    const video = mediaList.find(m => m.id === nextId);
    if (!video) return;
    router.push({
      pathname: '/community/cover-picker' as any,
      params: {
        videoUri: video.uri,
        duration: String(video.duration || 0),
        id: video.id,
        width: String(video.width),
        height: String(video.height),
        returnMode: 'cover',
      },
    });
  }, [mediaList, router]);

  const handleOpenCoverPicker = useCallback(() => {
    const videoIds = mediaList.filter(m => m.mediaType === 'video').map(m => m.id);
    coverPickerQueueRef.current = videoIds;
    navigateToNextCoverPicker();
  }, [mediaList, navigateToNextCoverPicker]);

  // Attachment callback: when returning from select-session/select-plan
  const setAttachedWidgetRef = useRef(setAttachedWidget);
  setAttachedWidgetRef.current = setAttachedWidget;

  useEffect(() => {
    setAttachmentCallback((item) => {
      setAttachedWidgetRef.current(item);
    });
    return () => setAttachmentCallback(null);
  }, []);

  // Consume media from device picker or cover updates when returning
  useFocusEffect(
    useCallback(() => {
      // 1. Consume new media from device picker
      const pending = consumePendingMedia();
      if (pending && pending.length > 0) {
        setMediaList(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = pending.filter(m => !existingIds.has(m.id));
          const remaining = MAX_MEDIA - prev.length;
          const toAdd = unique.slice(0, remaining);
          return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
        });
      }

      // 2. Consume cover update from cover-picker
      const coverUpdate = consumeCoverUpdate();
      if (coverUpdate) {
        setMediaList(prev =>
          prev.map(m =>
            m.id === coverUpdate.videoId ? { ...m, coverUri: coverUpdate.coverUri } : m
          )
        );
        // If more videos queued, navigate to next cover-picker after a brief delay
        if (coverPickerQueueRef.current.length > 0) {
          setTimeout(() => navigateToNextCoverPicker(), 300);
        }
      }
    }, [navigateToNextCoverPicker])
  );

  const handleAddMedia = () => {
    if (mediaList.length >= MAX_MEDIA) return;
    router.push('/community/device-media-picker');
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

    // ── Edit mode: synchronous upload (need to confirm success) ──
    if (isEditMode) {
      setPosting(true);
      try {
        let uploadedMedia: Array<{ type: 'image' | 'video'; url: string; thumb_url?: string }> | undefined;
        if (mediaList.length > 0) {
          const localItems = mediaList.filter(m => !m.uri.startsWith('http'));
          if (localItems.length > 0) {
            const uploadResults = await uploadPostMedia(localItems);
            const uploadMap = new Map<string, { type: 'image' | 'video'; url: string }>();
            localItems.forEach((item, i) => uploadMap.set(item.id, uploadResults[i]));
            const coverUrlMap = new Map<string, string>();
            await Promise.all(
              mediaList
                .filter(m => m.coverUri && !m.coverUri.startsWith('http'))
                .map(async (m) => {
                  try { coverUrlMap.set(m.id, await uploadThumbnailToR2(m.coverUri!)); } catch { /* skip */ }
                })
            );
            uploadedMedia = mediaList.map(m => {
              const thumbUrl = coverUrlMap.get(m.id) || (m.coverUri?.startsWith('http') ? m.coverUri : undefined);
              if (m.uri.startsWith('http')) return { type: m.mediaType, url: m.uri, thumb_url: thumbUrl };
              const uploaded = uploadMap.get(m.id)!;
              return { ...uploaded, thumb_url: thumbUrl };
            });
          } else {
            uploadedMedia = mediaList.map(m => ({
              type: m.mediaType, url: m.uri,
              thumb_url: m.coverUri?.startsWith('http') ? m.coverUri : undefined,
            }));
          }
        }
        await updatePost(params.postId!, { content_text: content || undefined, media: uploadedMedia, visibility });
        router.back();
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to update post');
      } finally {
        setPosting(false);
      }
      return;
    }

    // ── New post: background upload → navigate immediately ──
    submitPostInBackground(
      { content, mediaList, attachedWidget, location, selectedGym, visibility },
      mediaList,
    );
    router.dismissAll();
    router.navigate("/(tabs)/community" as any);
  };

  const canPost = mediaList.length > 0 || !!attachedWidget || (content?.trim().length ?? 0) > 0;
  // Show "Next" when 2+ media in non-edit mode (to go to arrange page)
  const showNext = !isEditMode && mediaList.length >= 2;

  const handlePostRef = useRef<() => void>(() => {});
  handlePostRef.current = handlePost;

  const handleNextToArrange = useCallback(() => {
    setPostDraft({
      content,
      mediaList,
      attachedWidget,
      location,
      selectedGym,
      visibility,
    });
    router.push('/community/arrange' as any);
  }, [content, mediaList, attachedWidget, location, selectedGym, visibility, router]);

  const handleNextToArrangeRef = useRef(handleNextToArrange);
  handleNextToArrangeRef.current = handleNextToArrange;

  useLayoutEffect(() => {
    const headerBtnLabel = posting ? '...' : isEditMode ? 'Save' : showNext ? 'Next' : 'Post';
    const headerBtnDisabled = showNext ? false : (!canPost || posting);

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
          onPress={() => showNext ? handleNextToArrangeRef.current() : handlePostRef.current()}
          disabled={headerBtnDisabled}
          activeOpacity={0.6}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            opacity: headerBtnDisabled ? 0.35 : 1,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textPrimary }}>
            {headerBtnLabel}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, router, isEditMode, canPost, posting, showNext]);

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
            {mediaList.map((item, idx) => (
              <View key={item.id} style={styles.mediaThumbnail}>
                <Image source={{ uri: (item.mediaType === 'video' && item.coverUri) ? item.coverUri : item.uri }} style={styles.mediaThumbnailImage} contentFit="cover" />
                {item.mediaType === 'video' && (
                  <View style={styles.mediaVideoIcon}>
                    <Ionicons name="play-circle" size={18} color="#FFF" />
                  </View>
                )}
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

          {/* Source Badge (from Share to Post) */}
          {params.source === 'log-detail' && (
            <View style={styles.sourceBadge}>
              <Ionicons name="fitness-outline" size={14} color={colors.accent} />
              <Text style={styles.sourceText}>Shared from session</Text>
            </View>
          )}

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

          {/* Cover Picker — only when videos exist */}
          {hasVideos && !isEditMode && (
            <TouchableOpacity
              onPress={handleOpenCoverPicker}
              style={styles.toolbarIconBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name="film-outline"
                size={22}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          )}

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
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
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
  mediaVideoIcon: {
    position: 'absolute',
    bottom: 4,
    left: 4,
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
    backgroundColor: colors.cardBackground,
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
