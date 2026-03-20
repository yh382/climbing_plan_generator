// app.config.ts
import "dotenv/config";
import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "climMate",
  slug: "climMate",
  scheme: "climMate",
  newArchEnabled: true,

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yh382.climmate",
  infoPlist: {
    NSLocationWhenInUseUsageDescription: "App 需要使用您的位置信息以显示附近岩馆。",

    // ✅ 选相册（Choose from library）
    NSPhotoLibraryUsageDescription: "ClimMate 需要访问你的相册，以便选择头像。",

    // ✅ 拍照（Take photo）
    NSCameraUsageDescription: "ClimMate 需要访问你的相机，以便拍摄头像。",

    // （可选）只有你要“保存图片到相册”才需要
    NSPhotoLibraryAddUsageDescription: "ClimMate 需要权限将图片保存到你的相册。",

    ITSAppUsesNonExemptEncryption: false,
    NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
    },

  },

  android: {
    package: "com.yh382.climmate",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
  },

  icon: "./assets/images/icon.png",
  
  extra: {
    MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "",
    REGION: process.env.EXPO_PUBLIC_REGION ?? "global",
    AMAP_KEY: process.env.EXPO_PUBLIC_AMAP_KEY ?? "",
    eas: { projectId: "d4b98925-c856-48a8-9c93-e2bfa0cc4e24" },
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
  ],

  updates: {
    url: "https://u.expo.dev/d4b98925-c856-48a8-9c93-e2bfa0cc4e24",
    checkAutomatically: "ON_LOAD",
  },

  assetBundlePatterns: ["**/*"],
  experiments: { typedRoutes: true },
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
