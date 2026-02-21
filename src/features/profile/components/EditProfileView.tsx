// src/features/profile/components/EditProfileView.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "src/lib/apiClient";
import LocationPickerSheet from "./LocationPickerSheet";
import HomeGymPickerSheet from "./HomeGymPickerSheet";
import AvatarPickerSheet from "./AvatarPickerSheet";

type UserMe = {
  id: string;
  email: string;
  username?: string | null;
  avatar_url?: string | null;
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
  bio: string;
  location: string;
  home_gym: string;
  avatar_url: string;

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
}

export default function EditProfileView() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  const [me, setMe] = useState<UserMe | null>(null);

  const [form, setForm] = useState<FormState>({
    username: "",
    bio: "",
    location: "",
    home_gym: "",
    avatar_url: "",

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
          bio: (u.bio ?? "").toString(),
          location: (u.location ?? "").toString(),
          home_gym: (u.home_gym ?? "").toString(),
          avatar_url: (u.avatar_url ?? "").toString(),

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

      // ✅ 只存我们现在需要的字段（username/bio/location/home_gym/avatar_url）
      const payload = {
        username: form.username.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        home_gym: form.home_gym.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
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
        bio: (updated.bio ?? "").toString(),
        location: (updated.location ?? "").toString(),
        home_gym: (updated.home_gym ?? "").toString(),
        avatar_url: (updated.avatar_url ?? "").toString(),

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
  const [homeGymPickerOpen, setHomeGymPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false); // ✅ NEW
  // 你后面要做 bottomsheet 选择器：这里先占位
  const handlePickLocation = () => {
        setLocationPickerOpen(true);
    // TODO: BottomSheet
  };
  const handlePickHomeGym = () => {
    setHomeGymPickerOpen(true);
    // TODO: BottomSheet
  };

  const avatarUri = useMemo(() => {
    return form.avatar_url || "https://placekitten.com/200/200";
  }, [form.avatar_url]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSaveAndBack} style={styles.headerBtn} disabled={saving}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{saving ? "Saving..." : "Edit Profile"}</Text>

        <View style={styles.headerBtnPlaceholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 头像 */}
        <View style={styles.avatarSection}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setAvatarPickerOpen(true)}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.changePhotoBtn} onPress={() => setAvatarPickerOpen(true)}>
            <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        </TouchableOpacity>
        </View>


        {/* 表单 */}
        <View style={styles.formGroup}>
          <InputItem
            label="Username"
            value={form.username}
            placeholder="Add username"
            onChangeText={(t) => setForm((s) => ({ ...s, username: t }))}
          />

          <InputItem
            label="Bio"
            value={form.bio}
            placeholder="Bio"
            onChangeText={(t) => setForm((s) => ({ ...s, bio: t }))}
            multiline
          />

          <InputItem
            label="Location"
            value={form.location}
            placeholder="Add location"
            isLink
            onPress={handlePickLocation}
          />

          <InputItem
            label="Home Gym"
            value={form.home_gym}
            placeholder="Add home gym"
            isLink
            onPress={handlePickHomeGym}
          />
        </View>
        </ScrollView>
                {/* ✅ NEW: Location Picker Sheet */}
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

    </SafeAreaView>
  );
}

// 通用输入组件
const InputItem = ({ label, value, onChangeText, multiline, placeholder, isLink, onPress }: InputItemProps) => {
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
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </>
        ) : (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            multiline={multiline}
            style={[styles.textInput, multiline ? styles.textInputMultiline : null]}
          />
        )}
      </Container>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerBtnPlaceholder: { width: 44, height: 44 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },

  content: { flex: 1 },
  avatarSection: { alignItems: "center", paddingVertical: 20 },
  avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#F1F5F9" },
  changePhotoBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12 },
  changePhotoText: { color: "#0F172A", fontWeight: "600" },

  formGroup: { paddingHorizontal: 16, paddingBottom: 24 },

  inputItem: { marginBottom: 14 },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },

  inputBox: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  inputBoxMultiline: { minHeight: 90, alignItems: "stretch", paddingVertical: 10 },
  textInput: { width: "100%", color: "#0F172A" },
  textInputMultiline: { height: 70, textAlignVertical: "top" },

  inputBoxLink: { flexDirection: "row", justifyContent: "space-between" },
  linkText: { flex: 1, color: "#0F172A" },
  placeholderText: { color: "#94A3B8" },
});
