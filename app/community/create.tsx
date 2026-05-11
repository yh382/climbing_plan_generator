// app/community/create.tsx

import React, { useState, useMemo, useLayoutEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, Modal,
  Pressable, Dimensions, ActionSheetIOS,
} from "react-native";
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
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
import LocationSheet from "../../src/features/community/components/LocationSheet";
import GymTagSheet from "../../src/features/community/components/GymTagSheet";
import { consumePendingMedia } from "../../src/features/community/pendingMedia";
import { setPostDraft } from "../../src/features/community/pendingPostDraft";
import { consumeCoverUpdate } from "../../src/features/community/pendingCoverUpdate";
import { uploadPostMedia, uploadThumbnailToR2 } from "../../src/features/community/api";
import { submitPostInBackground } from "../../src/features/community/postUploadManager";
import { pickMediaFromLibrary } from "../../src/lib/mediaPicker";
const AUDIENCE_OPTIONS = [
  { value: 'public' as const, label: 'Public', icon: 'globe-outline' as const },
  { value: 'followers' as const, label: 'Followers Only', icon: 'people-outline' as const },
  { value: 'private' as const, label: 'Private', icon: 'lock-closed-outline' as const },
];

// BF — Strava-mode: ≤10 images / =1 video / mutually exclusive
const MAX_IMAGES = 10;
const MAX_VIDEOS = 1;

function mediaLimitFor(items: PickedMediaItem[]): number {
  return items[0]?.mediaType === 'video' ? MAX_VIDEOS : MAX_IMAGES;
}

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
  const [visibilityPopoverVisible, setVisibilityPopoverVisible] = useState(false);

  // Popover positioning
  const visibilityBtnRef = useRef<View>(null);
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

  // Consume media from device picker or cover updates when returning
  useFocusEffect(
    useCallback(() => {
      // 1. Consume new media from device picker
      const pending = consumePendingMedia();
      if (pending && pending.length > 0) {
        setMediaList(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = pending.filter(m => !existingIds.has(m.id));
          const limit = mediaLimitFor([...prev, ...unique]);
          const remaining = limit - prev.length;
          const toAdd = unique.slice(0, Math.max(0, remaining));
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

  const pickAndAppend = async (mediaType: 'images' | 'videos') => {
    const limit = mediaType === 'videos' ? MAX_VIDEOS : MAX_IMAGES;
    if (mediaList.length >= limit) return;
    const items = await pickMediaFromLibrary({
      maxSelect: limit - mediaList.length,
      mediaType,
    });
    if (items.length === 0) return;

    // Video → push to trimmer first. Trimmer routes to cover-picker, which
    // writes the final PickedMediaItem (with `coverUri`) into the pendingMedia
    // bridge; create.tsx's useFocusEffect consumes it on return.
    if (mediaType === 'videos') {
      const video = items[0];
      router.push({
        pathname: '/community/video-trimmer' as any,
        params: {
          videoUri: video.uri,
          duration: String(video.duration || 0),
          id: video.id,
          width: String(video.width),
          height: String(video.height),
        },
      });
      return;
    }

    setMediaList(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      const unique = items.filter(m => !existingIds.has(m.id));
      return [...prev, ...unique];
    });
  };

  // BF — image / video are mutually exclusive. Show 2-option ActionSheet;
  // disable the conflicting option, or Alert-confirm clearing on switch.
  const handleAddMedia = () => {
    const currentType: 'image' | 'video' | null =
      mediaList.length === 0 ? null : (mediaList[0].mediaType as 'image' | 'video');

    if (currentType === null) {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Photos', 'Video', 'Cancel'], cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) pickAndAppend('images');
          else if (idx === 1) pickAndAppend('videos');
        },
      );
      return;
    }

    if (currentType === 'image') {
      // Already have images. Tapping "+" just continues adding images.
      pickAndAppend('images');
      return;
    }

    // currentType === 'video' — already 1 video selected. New post = video full.
    // (MAX_VIDEOS=1, the "+" tile is gated off in JSX once we hit the limit.)
    pickAndAppend('videos');
  };


  const handleRemoveMedia = (index: number) => {
    setMediaList(prev => prev.filter((_, i) => i !== index));
  };

  const openVisibilityPopover = () => {
    visibilityBtnRef.current?.measureInWindow((x, y) => {
      setVisibilityPopoverPos({ x, y });
      setVisibilityPopoverVisible(true);
    });
  };

  // Post via API (create or update)
  const handlePost = async () => {
    if (mediaList.length === 0 && !(content?.trim())) return;
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
      { content, mediaList, attachedWidget: null, location, selectedGym, visibility },
      mediaList,
    );
    router.dismissAll();
    router.navigate("/(drawer)/(tabs)/community" as any);
  };

  const canPost = mediaList.length > 0 || (content?.trim().length ?? 0) > 0;
  // Show "Next" when 2+ media in non-edit mode (to go to arrange page)
  const showNext = !isEditMode && mediaList.length >= 2;

  const handlePostRef = useRef<() => void>(() => {});
  handlePostRef.current = handlePost;

  const handleNextToArrange = useCallback(() => {
    setPostDraft({
      content,
      mediaList,
      attachedWidget: null,
      location,
      selectedGym,
      visibility,
    });
    router.push('/community/arrange' as any);
  }, [content, mediaList, location, selectedGym, visibility, router]);

  const handleNextToArrangeRef = useRef(handleNextToArrange);
  handleNextToArrangeRef.current = handleNextToArrange;

  useLayoutEffect(() => {
    const headerBtnLabel = posting ? '...' : isEditMode ? 'Save' : showNext ? 'Next' : 'Post';
    const headerBtnDisabled = showNext ? false : (!canPost || posting);

    navigation.setOptions({
      title: isEditMode ? 'Edit Post' : 'New Post',
      headerTransparent: HEADER_TRANSPARENT,
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
          keyboardDismissMode="interactive"
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
            {mediaList.length < mediaLimitFor(mediaList) && (
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
                  isSelected && { backgroundColor: colors.cardDark },
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
                  <Ionicons name="checkmark" size={15} color={colors.accent} />
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
    borderColor: colors.border,
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
    backgroundColor: colors.cardDark,
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
