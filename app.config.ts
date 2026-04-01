// app.config.ts
import "dotenv/config";
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "climMate",
  slug: "climMate",
  scheme: "climMate",
  userInterfaceStyle: "automatic",
  orientation: "portrait",

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yh382.climmate",
    usesAppleSignIn: true,
    entitlements: {
      "com.apple.security.application-groups": ["group.com.yh382.climmate"],
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "App 需要使用您的位置信息以显示附近岩馆。",

      // ✅ 选相册（Choose from library）
      NSPhotoLibraryUsageDescription: "ClimMate 需要访问你的相册，以便选择头像。",

      // ✅ 拍照（Take photo）
      NSCameraUsageDescription: "ClimMate 需要访问你的相机，以便拍摄头像。",

      // （可选）只有你要"保存图片到相册"才需要
      NSPhotoLibraryAddUsageDescription: "ClimMate 需要权限将图片保存到你的相册。",

      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },

      // Widget & Live Activity support
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: true,
    },

  },

  android: {
    package: "com.yh382.climmate",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },

  icon: "./assets/images/icon.png",
  
  extra: {
    API_BASE: process.env.EXPO_PUBLIC_API_BASE ?? "",
    MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "",
    REGION: process.env.EXPO_PUBLIC_REGION ?? "global",
    AMAP_KEY: process.env.EXPO_PUBLIC_AMAP_KEY ?? "",
    eas: { projectId: "03d16d73-266d-4044-94d5-2568911c31f4" },
    router: {},
  },

  plugins: [
    "expo-font",
    "expo-router",
    "expo-location",
    "expo-secure-store",
    "expo-video",
    ["expo-build-properties", { ios: { useFrameworks: "static" } }],
    ["expo-media-library", {
      photosPermission: "ClimMate 需要访问你的相册，以便选择头像和封面照片。",
    }],
    ["expo-notifications", {
      icon: "./assets/images/icon.png",
      color: "#22C55E",
    }],
    "expo-apple-authentication",
    "@react-native-community/datetimepicker",
    "expo-image",
    "expo-sharing",
    "expo-web-browser",
    "expo-screen-orientation",
    "react-native-compressor",
    "./plugins/withCustomWidgetFiles",
    ["expo-widgets", {
      widgets: [
        {
          name: "ClimMateWidget",
          displayName: "ClimMate Stats",
          description: "Your climbing stats at a glance",
          supportedFamilies: ["systemSmall", "systemMedium"],
        },
      ],
      groupIdentifier: "group.com.yh382.climmate",
    }],
  ],

  updates: {
    url: "https://u.expo.dev/03d16d73-266d-4044-94d5-2568911c31f4",
    checkAutomatically: "ON_LOAD",
  },

  assetBundlePatterns: ["**/*"],
  experiments: { typedRoutes: true, reactCompiler: true },
  owner: "1185679154",
};

const region = process.env.EXPO_PUBLIC_REGION ?? "global";
const isCN = region === "cn";

if (isCN) {
  // 国内版的应用名称（你可以根据喜好改成完全中文）
  config.name = "岩友";
  config.slug = "climMate-cn";
  config.scheme = "climMatecn";

  // iOS：给国内版预留一个单独的 bundleIdentifier（记得以后上架前在 Apple 开发者后台也要用这个）
  config.ios = {
    ...config.ios,
    bundleIdentifier: "com.yh382.climmate.cn",
  };

  // Android：同理，给国内版预留一个独立 package 名称
  config.android = {
    ...(config.android ?? {}),
    package: "com.yh382.climmate.cn",
  };
}
export default config;
