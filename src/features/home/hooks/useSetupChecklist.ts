import { useState, useCallback } from "react";
import { Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useProfileStore } from "@/features/profile/store/useProfileStore";
import useLogsStore from "@/store/useLogsStore";
import { useCommunityStore } from "@/store/useCommunityStore";
import { api } from "@/lib/apiClient";
import { registerForPushNotifications } from "@/lib/pushNotifications";
import { useI18N } from "../../../../lib/i18n";

const STORAGE_KEY = "setup_climmate_progress";
const OPEN_PRESESSION_KEY = "setup_auto_open_presession";

export type SetupTask = {
  id: string;
  title: string;
  subtitle: string;
  completed: boolean;
  locked: boolean;
  lockReason?: string;
  onPress: () => void;
};

type UseSetupChecklistReturn = {
  visible: boolean;
  tasks: SetupTask[];
  completedCount: number;
  totalCount: number;
  showGuideModal: boolean;
  setShowGuideModal: (v: boolean) => void;
};

const ALL_TASK_IDS = [
  "notifications",
  "body_info",
  "find_gym",
  "first_climb",
  "first_post",
  "follow_friend",
] as const;

export function useSetupChecklist(): UseSetupChecklistReturn {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(true); // default hidden until loaded
  const [followingCount, setFollowingCount] = useState(0);
  const [notifGranted, setNotifGranted] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasGymFavorite, setHasGymFavorite] = useState(false);

  const profile = useProfileStore((s) => s.profile);
  const { sessions } = useLogsStore();
  const myPosts = useCommunityStore((s) => s.myPosts);
  const { tr } = useI18N();
  const router = useRouter();

  // Derived conditions
  const hasBodyInfo = !!(
    profile?.anthropometrics?.height || profile?.anthropometrics?.weight
  );
  const hasRouteLog = sessions.length > 0;
  const hasPost = myPosts.length > 0;
  const hasFollowing = followingCount > 0;

  // On mount: load progress from AsyncStorage + check notification + check follow count
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.dismissed) {
            if (!cancelled) {
              setDismissed(true);
              setLoaded(true);
            }
            return;
          }
          if (!cancelled) {
            setProgress(parsed);
            setDismissed(false);
          }
        } else {
          // First time: check if active user (sessions > 5 → dismiss immediately)
          if (sessions.length > 5) {
            await AsyncStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ dismissed: true })
            );
            if (!cancelled) {
              setDismissed(true);
              setLoaded(true);
            }
            return;
          }
          if (!cancelled) setDismissed(false);
        }

        // Check gym favorite flag
        const gymFlag = await AsyncStorage.getItem("setup_gym_favorited");
        if (!cancelled) setHasGymFavorite(gymFlag === "true");

        // Check notification permission
        const { status } = await Notifications.getPermissionsAsync();
        if (!cancelled) setNotifGranted(status === "granted");

        // Check follow count
        try {
          const counts = await api.get<{
            followers: number;
            following: number;
          }>("/profiles/me/follow_counts");
          if (!cancelled) setFollowingCount(counts.following);
        } catch {}

        if (!cancelled) setLoaded(true);
      })();

      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Auto-sync on focus
  useFocusEffect(
    useCallback(() => {
      if (dismissed || !loaded) return;

      const newProgress = { ...progress };
      let changed = false;

      if (notifGranted && !newProgress.notifications) {
        newProgress.notifications = true;
        changed = true;
      }
      if (hasBodyInfo && !newProgress.body_info) {
        newProgress.body_info = true;
        changed = true;
      }
      if (hasGymFavorite && !newProgress.find_gym) {
        newProgress.find_gym = true;
        changed = true;
      }
      if (hasRouteLog && !newProgress.first_climb) {
        newProgress.first_climb = true;
        changed = true;
      }
      if (hasPost && !newProgress.first_post) {
        newProgress.first_post = true;
        changed = true;
      }
      if (hasFollowing && !newProgress.follow_friend) {
        newProgress.follow_friend = true;
        changed = true;
      }

      if (changed) {
        setProgress(newProgress);
        const allDone = ALL_TASK_IDS.every((k) => newProgress[k]);
        if (allDone) {
          setDismissed(true);
          AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...newProgress, dismissed: true })
          );
        } else {
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
        }
      }

      // Re-check follow count on focus
      api
        .get<{ followers: number; following: number }>(
          "/profiles/me/follow_counts"
        )
        .then((c) => setFollowingCount(c.following))
        .catch(() => {});

      // Re-check gym favorite flag on focus
      AsyncStorage.getItem("setup_gym_favorited").then((val) => {
        setHasGymFavorite(val === "true");
      });

      // Re-check notification permission on focus
      Notifications.getPermissionsAsync().then(({ status }) => {
        setNotifGranted(status === "granted");
      });
    }, [
      dismissed,
      loaded,
      progress,
      notifGranted,
      hasBodyInfo,
      hasGymFavorite,
      hasRouteLog,
      hasPost,
      hasFollowing,
    ])
  );

  // Mark a task complete
  const markComplete = useCallback((taskId: string) => {
    setProgress((prev) => {
      const next = { ...prev, [taskId]: true };
      const allDone = ALL_TASK_IDS.every((k) => next[k]);
      if (allDone) {
        setDismissed(true);
        AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...next, dismissed: true })
        );
      } else {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  // Task handlers
  const handleNotifications = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "denied") {
      Alert.alert(
        tr("开启通知", "Enable Notifications"),
        tr(
          "前往系统设置开启 Climmate 通知。",
          "Go to Settings to enable notifications for Climmate."
        ),
        [
          { text: tr("暂时不", "Not Now"), style: "cancel" },
          {
            text: tr("打开设置", "Open Settings"),
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }
    const result = await registerForPushNotifications();
    if (result) {
      setNotifGranted(true);
      markComplete("notifications");
      Alert.alert(tr("已开启", "Enabled"), tr("推送通知已开启！", "Push notifications enabled!"));
    } else {
      Alert.alert(
        tr("无法开启", "Could not enable"),
        tr("推送通知注册失败，请稍后重试。", "Push notification registration failed. Please try again later.")
      );
    }
  }, [markComplete, tr]);

  const handleFirstClimb = useCallback(async () => {
    await AsyncStorage.setItem(OPEN_PRESESSION_KEY, "true");
    router.push("/(tabs)/calendar");
  }, [router]);

  const handleFirstPost = useCallback(() => {
    setShowGuideModal(true);
  }, []);

  // 6 tasks
  const tasks: SetupTask[] = [
    {
      id: "notifications",
      title: tr("保持更新", "Stay up to date"),
      subtitle: tr("开启推送通知", "Enable push notifications"),
      completed: !!progress.notifications,
      locked: false,
      onPress: handleNotifications,
    },
    {
      id: "body_info",
      title: tr("添加身体信息", "Add body info"),
      subtitle: tr("身高、体重、臂展", "Height, weight & arm span"),
      completed: !!progress.body_info,
      locked: false,
      onPress: () => router.push({ pathname: "/(tabs)/profile", params: { initialTab: "stats", expandBody: "true" } }),
    },
    {
      id: "find_gym",
      title: tr("找到你的岩馆", "Find your gym"),
      subtitle: tr("加入常去岩馆社区", "Join your home gym community"),
      completed: !!progress.find_gym,
      locked: false,
      onPress: () => router.push("/gyms"),
    },
    {
      id: "first_climb",
      title: tr("记录第一次攀岩", "Log your first climb"),
      subtitle: tr("开始记录你的进步", "Start tracking your progress"),
      completed: !!progress.first_climb,
      locked: false,
      onPress: handleFirstClimb,
    },
    {
      id: "first_post",
      title: tr("发布第一条动态", "Post your first climb"),
      subtitle: tr("分享给攀岩社区", "Share your progress with the community"),
      completed: !!progress.first_post,
      locked: !hasRouteLog,
      lockReason: tr(
        "完成第一次攀岩记录后解锁",
        "Complete your first log to unlock"
      ),
      onPress: handleFirstPost,
    },
    {
      id: "follow_friend",
      title: tr("关注一个朋友", "Follow a friend"),
      subtitle: tr("发现攀岩伙伴", "Find climbers you know"),
      completed: !!progress.follow_friend,
      locked: false,
      onPress: () => router.push("/search" as any),
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;
  const visible = loaded && !dismissed;

  return {
    visible,
    tasks,
    completedCount,
    totalCount: 6,
    showGuideModal,
    setShowGuideModal,
  };
}
