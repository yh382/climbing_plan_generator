// app/contexts/SettingsContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState} from "react";

type Lang = "zh" | "en";
type UnitSystem = "imperial" | "metric";
type BoulderScale = "V" | "Font";
type RopeScale = "YDS" | "French";

const LANG_KEY = "@app_lang";
const UNIT_KEY = "@unit_system";
const BOULDER_KEY = "@boulder_scale";
const ROPE_KEY = "@rope_scale";

type SettingsState = {
  lang: Lang;
  unit: UnitSystem;
  boulderScale: BoulderScale;
  ropeScale: RopeScale;
  // setters（会自动持久化到 AsyncStorage）
  setLang: (v: Lang) => Promise<void>;
  setUnit: (v: UnitSystem) => Promise<void>;
  setBoulderScale: (v: BoulderScale) => Promise<void>;
  setRopeScale: (v: RopeScale) => Promise<void>;
  // 初始化完成标记（避免闪烁）
  ready: boolean;
  // 在 SettingsState 内任意合适位置新增两行
  isZH: boolean;
  tr: (zh: string, en: string) => string;

};
const SettingsCtx = createContext<SettingsState | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [lang, _setLang] = useState<Lang>("zh");
  const [unit, _setUnit] = useState<UnitSystem>("metric");
  const [boulderScale, _setBoulderScale] = useState<BoulderScale>("V");
  const [ropeScale, _setRopeScale] = useState<RopeScale>("YDS");

  // 初始化：从 AsyncStorage 读取
  useEffect(() => {
    (async () => {
      try {
        const [l, u, bs, rs] = await Promise.all([
          AsyncStorage.getItem(LANG_KEY),
          AsyncStorage.getItem(UNIT_KEY),
          AsyncStorage.getItem(BOULDER_KEY),
          AsyncStorage.getItem(ROPE_KEY),
        ]);
        if (l === "zh" || l === "en") _setLang(l);
        if (u === "imperial" || u === "metric") _setUnit(u);
        if (bs === "V" || bs === "Font") _setBoulderScale(bs);
        if (rs === "YDS" || rs === "French") _setRopeScale(rs);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // 包一层 setter：同时写入本地存储
  const setLang = async (v: Lang) => { _setLang(v); await AsyncStorage.setItem(LANG_KEY, v); };
  const setUnit = async (v: UnitSystem) => { _setUnit(v); await AsyncStorage.setItem(UNIT_KEY, v); };
  const setBoulderScale = async (v: BoulderScale) => { _setBoulderScale(v); await AsyncStorage.setItem(BOULDER_KEY, v); };
  const setRopeScale = async (v: RopeScale) => { _setRopeScale(v); await AsyncStorage.setItem(ROPE_KEY, v); };
  // 放在 useMemo 之前

  const value = useMemo<SettingsState>(() => ({
    lang, unit, boulderScale, ropeScale, setLang, setUnit, setBoulderScale, setRopeScale, ready,isZH: lang === "zh",tr: (zh: string, en: string) => (lang === "zh" ? zh : en),
  }), [lang, unit, boulderScale, ropeScale, ready]);

  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
};

export const useSettings = () => {
  const ctx = useContext(SettingsCtx);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider />");
  return ctx;
};
