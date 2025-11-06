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
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    },
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "App 需要使用您的位置信息以显示附近岩馆。",
      ITSAppUsesNonExemptEncryption: false,
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
    },
  },

  android: {
    package: "com.yh382.climmate",
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
      },
    },
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
  },

  icon: "./assets/images/icon.png",
  
  extra: {
    MAPBOX_TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? "",
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    eas: { projectId: "d4b98925-c856-48a8-9c93-e2bfa0cc4e24" },
    router: {},
  },

  plugins: [
    "expo-router",
    "expo-location",
    ["expo-build-properties", { ios: { useFrameworks: "static" } }],
  ],

  updates: {
    url: "https://u.expo.dev/d4b98925-c856-48a8-9c93-e2bfa0cc4e24",
    checkAutomatically: "ON_LOAD",
  },

  assetBundlePatterns: ["**/*"],
  experiments: { typedRoutes: true },
  owner: "1185679154",
};

export default config;
