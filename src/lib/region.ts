import Constants from "expo-constants";

export type Region = "global" | "cn";

export const REGION: Region =
  ((Constants.expoConfig?.extra as any)?.REGION as Region) || "global";

export const isCN = REGION === "cn";
export const isGlobal = REGION === "global";
