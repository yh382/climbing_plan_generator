import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Host, Form, Section, Toggle } from "@expo/ui/swift-ui";
import { communityApi } from "../../src/features/community/api";
import { useSettings } from "src/contexts/SettingsContext";

const NOTIF_PREFS_CACHE_KEY = "@notification_prefs";

type NotifSettings = {
  likes: boolean;
  followers: boolean;
  comments: boolean;
  mentions: boolean;
  challenges: boolean;
  events: boolean;
};

const DEFAULT_SETTINGS: NotifSettings = {
  likes: true, followers: true, comments: true,
  mentions: true, challenges: true, events: true,
};

export default function NotificationsSettings() {
  const navigation = useNavigation();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  const [settings, setSettings] = useState<NotifSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: tr("通知", "Notifications") });
  }, [navigation, lang]);

  // Load from cache first, then backend
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(NOTIF_PREFS_CACHE_KEY);
        if (cached) {
          setSettings(JSON.parse(cached));
          setLoaded(true);
        }
      } catch (_) {}

      try {
        const prefs = await communityApi.getNotificationPreferences();
        const fresh: NotifSettings = {
          likes: prefs.likes,
          followers: prefs.followers,
          comments: prefs.comments,
          mentions: prefs.mentions,
          challenges: prefs.challenges,
          events: prefs.events,
        };
        setSettings(fresh);
        setLoaded(true);
        await AsyncStorage.setItem(NOTIF_PREFS_CACHE_KEY, JSON.stringify(fresh));
      } catch (_) {
        setLoaded(true);
      }
    })();
  }, []);

  // Toggle + persist to backend & cache (optimistic update with rollback)
  const handleToggle = async (key: keyof NotifSettings) => {
    const newVal = !settings[key];
    const updated = { ...settings, [key]: newVal };
    setSettings(updated);
    AsyncStorage.setItem(NOTIF_PREFS_CACHE_KEY, JSON.stringify(updated));
    try {
      await communityApi.updateNotificationPreferences({ [key]: newVal });
    } catch {
      const reverted = { ...settings, [key]: !newVal };
      setSettings(reverted);
      AsyncStorage.setItem(NOTIF_PREFS_CACHE_KEY, JSON.stringify(reverted));
    }
  };

  if (!loaded) return null;

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <Form>
        <Section title={tr("互动通知", "Engagement")}>
          <Toggle isOn={settings.likes} onIsOnChange={() => handleToggle("likes")} label={tr("点赞与收藏", "Likes & Saves")} />
          <Toggle isOn={settings.followers} onIsOnChange={() => handleToggle("followers")} label={tr("新关注者", "New Followers")} />
          <Toggle isOn={settings.comments} onIsOnChange={() => handleToggle("comments")} label={tr("评论", "Comments")} />
          <Toggle isOn={settings.mentions} onIsOnChange={() => handleToggle("mentions")} label={tr("提及 (@)", "Mentions (@)")} />
        </Section>
        <Section title={tr("活动通知", "Activity")}>
          <Toggle isOn={settings.challenges} onIsOnChange={() => handleToggle("challenges")} label={tr("挑战", "Challenges")} />
          <Toggle isOn={settings.events} onIsOnChange={() => handleToggle("events")} label={tr("活动", "Events")} />
        </Section>
      </Form>
    </Host>
  );
}
