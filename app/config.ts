// app/config.ts
import Constants from "expo-constants";

// 只放“主机+端口”，不要带路径
export const API_HOST =
  process.env.EXPO_PUBLIC_API_BASE ??
  (Constants?.expoConfig?.extra?.API_BASE as string | undefined) ??
  "http://localhost:8000";

// 具体接口路径用常量拼出来，便于统一管理
export const API_PLAN = `${API_HOST}/plan`;
export const API_PLAN_JSON = `${API_HOST}/plan_json`;
