import { useState, useEffect, useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { Host, Form, Section, Toggle, Text } from "@expo/ui/swift-ui";
import { profileApi } from "../../src/features/profile/api";
import { useSettings } from "src/contexts/SettingsContext";

const FIELD_MAP: Record<string, string> = {
  posts: "posts_public",
  body: "body_info_public",
  analysis: "analysis_public",
  plans: "plans_public",
  badges: "badges_public",
};

type VisibilitySettings = {
  posts: boolean;
  body: boolean;
  analysis: boolean;
  plans: boolean;
  badges: boolean;
};

export default function PrivacySettings() {
  const navigation = useNavigation();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  const [loading, setLoading] = useState(true);
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    posts: true, body: false, analysis: true, plans: true, badges: true,
  });

  useLayoutEffect(() => {
    navigation.setOptions({ title: tr("隐私", "Privacy") });
  }, [navigation, lang]);

  useEffect(() => {
    profileApi.getPrivacy().then((data) => {
      setVisibility({
        posts: data.posts_public,
        body: data.body_info_public,
        analysis: data.analysis_public,
        plans: data.plans_public,
        badges: data.badges_public,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleToggle = (key: keyof VisibilitySettings) => {
    const newVal = !visibility[key];
    setVisibility(prev => ({ ...prev, [key]: newVal }));
    const apiField = FIELD_MAP[key];
    if (apiField) {
      profileApi.updatePrivacy({ [apiField]: newVal }).catch(() => {
        setVisibility(prev => ({ ...prev, [key]: !newVal }));
      });
    }
  };

  if (loading) return null;

  return (
    <Host style={{ flex: 1 }} useViewportSizeMeasurement>
      <Form>
        <Section
          title={tr("个人资料可见性", "Profile Visibility")}
          footer={<Text>{tr("设为公开后，其他用户可以看到相应内容。", "When set to public, other users can see the content.")}</Text>}
        >
          <Toggle isOn={visibility.posts} onIsOnChange={() => handleToggle("posts")} label={tr("我的帖子", "My Posts")} />
          <Toggle isOn={visibility.body} onIsOnChange={() => handleToggle("body")} label={tr("身体信息", "Body Info")} />
          <Toggle isOn={visibility.analysis} onIsOnChange={() => handleToggle("analysis")} label={tr("分析数据", "My Analysis")} />
          <Toggle isOn={visibility.plans} onIsOnChange={() => handleToggle("plans")} label={tr("训练计划", "My Plans")} />
          <Toggle isOn={visibility.badges} onIsOnChange={() => handleToggle("badges")} label={tr("徽章", "My Badges")} />
        </Section>
      </Form>
    </Host>
  );
}
