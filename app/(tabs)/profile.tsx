// 文件名：src/features/profile/profile.tsx
import React from "react";
import {
  FlatList,
  View,
  RefreshControl,
  Text,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";

import { useUserStore } from "@/store/useUserStore";
import { useProfileStore } from "@/features/profile/store/useProfileStore";
import { useCareerStore } from "@/features/profile/store/useCareerStore";
import { useClimbsStore } from "@/features/profile/store/useClimbsStore";

import { ProfileHeader, QuickStats } from "@/features/profile";
import SlidePage from "@components/slide/SlidePage";
import ProfileTabs from "@/features/profile/components/ProfileTabs";
// 之前是 ProfileSectionSlide，这里不再需要
// import ProfileSectionSlide from "@/features/profile/components/ProfileSectionSlide";
import NearbyGymsSheet from "@/features/profile/components/NearbyGymsSheet";
import { useRoute, useNavigation } from "@react-navigation/native";
import Settings from "./settings";

// 新增：用户画像 + 偏好卡片
import { UserPersonaSection } from "@/features/profile/components/Persona/UserPersonaSection";
import { PreferencesCard } from "@/features/profile/components/Persona/PreferencesCard";

function ClimbListItem({
  item,
}: {
  item: import("@/features/profile/store/useClimbsStore").ClimbItem;
}) {
  return (
    <View
      style={{
        backgroundColor: "#fafafaff",
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 16,
      }}
    >
      <Text style={{ fontWeight: "700" }}>
        {item.route_name ?? "(未命名路线)"} · {item.grade_value}
      </Text>
      <Text style={{ color: "#6b7280", marginTop: 4 }}>
        {item.date} · {item.location_type}/{item.discipline} · 尝试 {item.attempts} · 完成{" "}
        {item.sends}
      </Text>
      {!!item.notes && <Text style={{ marginTop: 4 }}>{item.notes}</Text>}
    </View>
  );
}

// 右滑入的“附近岩馆”面板（先占位，等你提供数据源后再接入）
function NearbyGymsPanel({ onClose }: { onClose: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>附近岩馆</Text>
      <Text style={{ color: "#6b7280" }}>
        按距离从近到远排序显示（待接入数据源与定位）。点击条目后设置为 Home Gym 并关闭面板。
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, loading: userLoading, fetchMe: fetchUser } = useUserStore();
  const { profile, loading: profileLoading, fetchMe: fetchProfile } = useProfileStore();
  const { summary, loading: summaryLoading, fetchSummary } = useCareerStore();
  const { items, nextCursor, loading: climbsLoading, fetchList, loadMore } = useClimbsStore();

  const [showSettings, setShowSettings] = React.useState(false);
  const [showNearbyGyms, setShowNearbyGyms] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState(0);

  // 吸顶所需
  const [tabsOffsetY, setTabsOffsetY] = React.useState(0);
  const [tabsHeight, setTabsHeight] = React.useState(0);
  const [sticky, setSticky] = React.useState(false);
  const TOPBAR_OFFSET = 0;

  const navigation = useNavigation();
  const route = useRoute();

  React.useEffect(() => {
    fetchUser();
    fetchProfile();
    // 这里用 "all" 以符合“累计/最佳”的需求
    fetchSummary({ range: "all", type: "all", scope: "all" });
    fetchList({ type: "all", scope: "all" });
  }, []);

  const headerSummary = React.useMemo(
    () => ({
      level: profile?.anthropometrics?.level,
      home_gym_name: undefined,
      primary_outdoor_area: profile?.preferences?.primary_outdoor_area,
      bio_from_profile: (profile as any)?.bio ?? null,
      count_total: summary?.count_total ?? 0,
      best_grade_label: summary?.best_grade_label ?? null,
    }),
    [profile, summary]
  );

  const onRefresh = React.useCallback(async () => {
    await Promise.all([
      fetchUser(),
      fetchProfile(),
      fetchSummary({ range: "all" }),
      fetchList({ type: "all", scope: "all" }),
    ]);
  }, []);

  React.useEffect(() => {
    // 设置 & 附近岩馆 只要有一个打开，就让 TopBar 认为 profileSettingsOpen = true
    // @ts-ignore
    navigation.setParams?.({ profileSettingsOpen: showSettings || showNearbyGyms });
  }, [showSettings, showNearbyGyms, navigation]);

  React.useEffect(() => {
    const p: any = (route as any).params;
    if (!p) return;

    if (p.openSettings) {
      setShowSettings(true);
      // @ts-ignore
      navigation.setParams?.({ openSettings: undefined, profileSettingsOpen: true });
    }

    if (p.resetProfile) {
      setShowSettings(false);
      setShowNearbyGyms(false);
      // @ts-ignore
      navigation.setParams?.({ resetProfile: undefined, profileSettingsOpen: false });
    }
  }, [route?.params, navigation]);

  // ✅ 底部四大板块合并为：用户画像 + 偏好
  const tabs = ["用户画像", "偏好"];

  const handleListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const shouldStick = y + TOPBAR_OFFSET >= tabsOffsetY;
    if (shouldStick !== sticky) setSticky(shouldStick);
  };

  // QuickStats 的 Home Gym 文案：优先 name，再退回 id
  const homeGymText =
    (profile as any)?.preferences?.home_gym_name ??
    (profile as any)?.preferences?.home_gym_id ??
    null;

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafaff" }}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View>
            <ProfileHeader
              user={user}
              summary={headerSummary}
              loading={userLoading || profileLoading}
              onEditAvatar={() => {}}
              onEditUsername={() => {}}
            />

            {/* 新版 QuickStats：仅累计/最佳 + Home Gym 行 */}
            <QuickStats
              data={
                summary
                  ? {
                      count_total: summary.count_total,
                      best_grade_label: summary.best_grade_label,
                    }
                  : undefined
              }
              loading={summaryLoading}
              homeGymName={homeGymText}
              onPressHomeGym={() => setShowNearbyGyms(true)}
            />

            {/* Tabs（吸顶占位逻辑不变） */}
            <View
              onLayout={(e) => {
                const { y, height } = e.nativeEvent.layout;
                setTabsOffsetY(y);
                setTabsHeight(height);
              }}
            >
              {!sticky ? (
                <ProfileTabs tabs={tabs} activeIndex={activeTab} onTabPress={setActiveTab} />
              ) : (
                <View style={{ height: tabsHeight }} />
              )}
            </View>

            {/* ✅ 用 activeTab 手动切换：0 = 用户画像，1 = 偏好 */}
            {activeTab === 0 && (
              <View style={{ paddingHorizontal: 16 }}>
                <UserPersonaSection />
              </View>
            )}

            {activeTab === 1 && (
              <PreferencesCard />
            )}

            <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: "700" }}>最近记录</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <ClimbListItem item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListFooterComponent={
          climbsLoading ? (
            <Text style={{ textAlign: "center", padding: 12, color: "#6b7280" }}>
              加载中...
            </Text>
          ) : null
        }
        onEndReached={() => nextCursor && loadMore()}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingBottom: 24, gap: 12 }}
        onScroll={handleListScroll}
        scrollEventThrottle={16}
      />

      {/* Tabs 吸顶覆盖层 */}
      {sticky && (
        <View
          style={{
            position: "absolute",
            top: TOPBAR_OFFSET,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            zIndex: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
          pointerEvents="auto"
        >
          <ProfileTabs tabs={tabs} activeIndex={activeTab} onTabPress={setActiveTab} />
        </View>
      )}

      {/* 附近岩馆：从右向左滑入 */}
      <SlidePage
        visible={showNearbyGyms}
        onClose={() => setShowNearbyGyms(false)}
        direction="left"
      >
        <NearbyGymsPanel onClose={() => setShowNearbyGyms(false)} />
      </SlidePage>

      {/* 设置页保持不变 */}
      <SlidePage
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        direction="left"
      >
        <Settings />
      </SlidePage>
    </View>
  );
}

