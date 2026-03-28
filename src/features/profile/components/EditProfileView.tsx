// src/features/profile/components/EditProfileView.tsx

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef as useReactRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Host, Button as SUIButton } from "@expo/ui/swift-ui";
import { frame, buttonStyle, labelStyle } from "@expo/ui/swift-ui/modifiers";
import { api } from "src/lib/apiClient";
import { uploadImageToR2 } from "src/features/profile/api";
import { theme } from "src/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import LocationPickerSheet from "./LocationPickerSheet";
import HomeGymPickerSheet from "./HomeGymPickerSheet";
import AvatarPickerSheet from "./AvatarPickerSheet";
import { consumePendingImage } from "src/features/profile/imagePickerBridge";

type UserMe = {
  id: string;
  email: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  units: string;
  locale?: string | null;

  bio?: string | null;
  location?: string | null;
  home_gym?: string | null;

  location_place_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;

  home_gym_place_id?: string | null;
  home_gym_lat?: number | null;
  home_gym_lng?: number | null;
};

type FormState = {
  username: string;
  display_name: string;
  bio: string;
  location: string;
  home_gym: string;
  avatar_url: string;
  cover_url: string;

  location_place_id: string | null;
  location_lat: number | null;
  location_lng: number | null;

  home_gym_place_id: string | null;
  home_gym_lat: number | null;
  home_gym_lng: number | null;
};

interface InputItemProps {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
  placeholder?: string;
  isLink?: boolean;
  onPress?: () => void;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof createStyles>;
}

export default function EditProfileView() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Use ref so headerRight always sees latest saving/form state
  const saveRef = useReactRef<() => void>(() => {});
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const [me, setMe] = useState<UserMe | null>(null);

  const [form, setForm] = useState<FormState>({
    username: "",
    display_name: "",
    bio: "",
    location: "",
    home_gym: "",
    avatar_url: "",
    cover_url: "",

    location_place_id: null,
    location_lat: null,
    location_lng: null,

    home_gym_place_id: null,
    home_gym_lat: null,
    home_gym_lng: null,
  });

  // 进入页面拉取后端
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const u = await api.get<UserMe>("/users/me");
        if (!mounted) return;

        setMe(u);
        setForm({
          username: (u.username ?? "").toString(),
          display_name: (u.display_name ?? "").toString(),
          bio: (u.bio ?? "").toString(),
          location: (u.location ?? "").toString(),
          home_gym: (u.home_gym ?? "").toString(),
          avatar_url: (u.avatar_url ?? "").toString(),
          cover_url: (u.cover_url ?? "").toString(),

          location_place_id: u.location_place_id ?? null,
          location_lat: u.location_lat ?? null,
          location_lng: u.location_lng ?? null,

          home_gym_place_id: u.home_gym_place_id ?? null,
          home_gym_lat: u.home_gym_lat ?? null,
          home_gym_lng: u.home_gym_lng ?? null,
        });
      } catch (e: any) {
        console.error("LOAD USER ME ERROR =>", e);
        Alert.alert("Load failed", e?.message ?? "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveAndBack = async () => {
    try {
      setSaving(true);

      const isLocalUri = (url: string) => /^(ph|file):\/\//.test(url);
      let avatarToSave = form.avatar_url.trim() || null;
      let coverToSave = form.cover_url.trim() || null;

      // Upload local images to R2 before saving
      if (avatarToSave && isLocalUri(avatarToSave)) {
        try {
          avatarToSave = await uploadImageToR2(avatarToSave, "avatars");
        } catch (e: any) {
          Alert.alert("Avatar upload failed", e?.message ?? "Unknown error");
          setSaving(false);
          return;
        }
      }
      if (coverToSave && isLocalUri(coverToSave)) {
        try {
          coverToSave = await uploadImageToR2(coverToSave, "covers");
        } catch (e: any) {
          Alert.alert("Cover upload failed", e?.message ?? "Unknown error");
          setSaving(false);
          return;
        }
      }

      const isRemoteUrl = (url: string) => /^https?:\/\//.test(url);

      const payload = {
        display_name: form.display_name.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        home_gym: form.home_gym.trim() || null,
        avatar_url: avatarToSave && isRemoteUrl(avatarToSave) ? avatarToSave : null,
        cover_url: coverToSave && isRemoteUrl(coverToSave) ? coverToSave : null,
        location_place_id: form.location_place_id ?? null,
        location_lat: form.location_lat ?? null,
        location_lng: form.location_lng ?? null,

        home_gym_place_id: form.home_gym_place_id ?? null,
        home_gym_lat: form.home_gym_lat ?? null,
        home_gym_lng: form.home_gym_lng ?? null,
      };

      if (!payload.location) {
        payload.location_place_id = null;
        payload.location_lat = null;
        payload.location_lng = null;
      }

      if (!payload.home_gym) {
        payload.home_gym_place_id = null;
        payload.home_gym_lat = null;
        payload.home_gym_lng = null;
      }

      const updated = await api.put<UserMe>("/users/me", payload);

      // 防止你马上返回后再进页面仍是旧值
      setMe(updated);
      setForm({
        username: (updated.username ?? "").toString(),
        display_name: (updated.display_name ?? "").toString(),
        bio: (updated.bio ?? "").toString(),
        location: (updated.location ?? "").toString(),
        home_gym: (updated.home_gym ?? "").toString(),
        avatar_url: (updated.avatar_url ?? "").toString(),
        cover_url: (updated.cover_url ?? "").toString(),

        location_place_id: (updated as any).location_place_id ?? null,
        location_lat: (updated as any).location_lat ?? null,
        location_lng: (updated as any).location_lng ?? null,

        home_gym_place_id: (updated as any).home_gym_place_id ?? null,
        home_gym_lat: (updated as any).home_gym_lat ?? null,
        home_gym_lng: (updated as any).home_gym_lng ?? null,
      });

      router.back();
    } catch (e: any) {
      console.error("SAVE USER ME ERROR =>", e);
      Alert.alert("Save failed", e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };
  // Keep ref in sync so native header button always calls latest save
  saveRef.current = handleSaveAndBack;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      headerLeft: () => (
        <Host matchContents>
          <SUIButton
            label=""
            systemImage={"chevron.backward" as any}
            onPress={() => router.back()}
            modifiers={[buttonStyle("plain"), labelStyle("iconOnly"), frame({ width: 34, height: 34, alignment: "center" })]}
          />
        </Host>
      ),
      headerRight: () => (
        <Host matchContents>
          <SUIButton
            label=""
            systemImage={"checkmark" as any}
            onPress={() => saveRef.current()}
            modifiers={[buttonStyle("plain"), labelStyle("iconOnly"), frame({ width: 34, height: 34, alignment: "center" })]}
          />
        </Host>
      ),
    });
  }, [navigation, router]);

  const [homeGymPickerOpen, setHomeGymPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const handlePickLocation = () => {
    setLocationPickerOpen(true);
  };
  const handlePickHomeGym = () => {
    setHomeGymPickerOpen(true);
  };

  // Pick up image selected from library screen
  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingImage();
      if (pending) {
        setForm((s) => ({
          ...s,
          [pending.target === "cover" ? "cover_url" : "avatar_url"]: pending.uri,
        }));
      }
    }, [])
  );

  const avatarUri = useMemo(() => {
    return form.avatar_url || "https://placekitten.com/200/200";
  }, [form.avatar_url]);

  const coverUri = form.cover_url || null;

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* 头像 */}
        <View style={styles.avatarSection}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setAvatarPickerOpen(true)}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.changePhotoBtn} onPress={() => setAvatarPickerOpen(true)}>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Cover Image */}
        <View style={styles.coverSection}>
          <Text style={styles.coverLabel}>Cover Photo</Text>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setCoverPickerOpen(true)}>
            {coverUri ? (
              <View style={styles.coverPreview}>
                <Image source={{ uri: coverUri }} style={[StyleSheet.absoluteFill, styles.coverImage]} />
                <View style={styles.coverOverlay}>
                  <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={[styles.coverPreview, styles.coverPlaceholder]}>
                <Ionicons name="image-outline" size={28} color={colors.textTertiary} />
                <Text style={styles.coverPlaceholderText}>Add Cover Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 表单 */}
        <View style={styles.formGroup}>
          {/* Username — read-only */}
          <View style={styles.inputItem}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={[styles.inputBox, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>@{form.username}</Text>
            </View>
          </View>

          <InputItem
            label="Display Name"
            value={form.display_name}
            placeholder="Your display name"
            onChangeText={(t) => setForm((s) => ({ ...s, display_name: t }))}
            colors={colors}
            styles={styles}
          />

          <InputItem
            label="Bio"
            value={form.bio}
            placeholder="Bio"
            onChangeText={(t) => setForm((s) => ({ ...s, bio: t }))}
            multiline
            colors={colors}
            styles={styles}
          />

          <InputItem
            label="Location"
            value={form.location}
            placeholder="Add location"
            isLink
            onPress={handlePickLocation}
            colors={colors}
            styles={styles}
          />

          <InputItem
            label="Home Gym"
            value={form.home_gym}
            placeholder="Add home gym"
            isLink
            onPress={handlePickHomeGym}
            colors={colors}
            styles={styles}
          />
        </View>
      </ScrollView>

      <LocationPickerSheet
        visible={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={(item) => {
          const text = item.secondary ? `${item.primary}, ${item.secondary}` : item.primary;
          setForm((s) => ({
            ...s,
            location: text,
            location_place_id: item.id ?? null,
            location_lat: item.lat ?? null,
            location_lng: item.lng ?? null,
          }));
        }}
        title="Location"
      />
      <HomeGymPickerSheet
        visible={homeGymPickerOpen}
        onClose={() => setHomeGymPickerOpen(false)}
        onSelect={(gym) => {
          setForm((s) => ({
            ...s,
            home_gym: gym.name,
            home_gym_place_id: gym.id ?? null,
            home_gym_lat: gym.lat ?? null,
            home_gym_lng: gym.lng ?? null,
          }));
        }}
        title="Home gym"
      />
      <AvatarPickerSheet
        visible={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        onChooseFromLibrary={() => router.push("/profile/library")}
        onTakePhoto={() => {
          Alert.alert("Not supported", "Camera is not available in simulator yet.");
        }}
      />
      <AvatarPickerSheet
        visible={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        onChooseFromLibrary={() => router.push({ pathname: "/profile/library", params: { target: "cover" } })}
        onTakePhoto={() => {
          Alert.alert("Not supported", "Camera is not available in simulator yet.");
        }}
        title="Change Cover Photo"
      />
    </View>
  );
}

// 通用输入组件
const InputItem = ({ label, value, onChangeText, multiline, placeholder, isLink, onPress, colors, styles }: InputItemProps) => {
  const Container: any = isLink ? TouchableOpacity : View;

  return (
    <View style={styles.inputItem}>
      <Text style={styles.inputLabel}>{label}</Text>

      <Container
        onPress={isLink ? onPress : undefined}
        activeOpacity={0.7}
        style={[styles.inputBox, multiline ? styles.inputBoxMultiline : null, isLink ? styles.inputBoxLink : null]}
      >
        {isLink ? (
          <>
            <Text style={[styles.linkText, !value ? styles.placeholderText : null]}>
              {value || placeholder || ""}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </>
        ) : (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textTertiary}
            multiline={multiline}
            style={[styles.textInput, multiline ? styles.textInputMultiline : null]}
          />
        )}
      </Container>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1 },
    avatarSection: { alignItems: "center", paddingVertical: 20 },
    avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.backgroundSecondary },
    changePhotoBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12 },
    changePhotoText: { color: colors.textPrimary, fontWeight: "600", fontFamily: theme.fonts.medium },

    formGroup: { paddingHorizontal: 16, paddingBottom: 24 },

    inputItem: { marginBottom: 14 },
    inputLabel: { fontSize: 13, fontWeight: "600", fontFamily: theme.fonts.medium, color: colors.textSecondary, marginBottom: 8 },

    inputBox: {
      minHeight: 44,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 12,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    inputBoxMultiline: { minHeight: 90, alignItems: "stretch", paddingVertical: 10 },
    textInput: { width: "100%", color: colors.textPrimary, fontFamily: theme.fonts.regular },
    textInputMultiline: { height: 70, textAlignVertical: "top" },

    inputBoxLink: { flexDirection: "row", justifyContent: "space-between" },
    linkText: { flex: 1, color: colors.textPrimary, fontFamily: theme.fonts.regular },
    placeholderText: { color: colors.textTertiary },

    coverSection: { paddingHorizontal: 16, marginBottom: 8 },
    coverLabel: { fontSize: 13, fontWeight: "600", fontFamily: theme.fonts.medium, color: colors.textSecondary, marginBottom: 8 },
    coverPreview: { width: "100%", height: 120, borderRadius: 12, overflow: "hidden" },
    coverImage: { borderRadius: 12 },
    coverOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    coverPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: "dashed",
    },
    coverPlaceholderText: { color: colors.textTertiary, fontSize: 13, fontFamily: theme.fonts.regular, marginTop: 4 },
  });
