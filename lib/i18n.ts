// app/lib/i18n.ts
import { useSettings } from "../app/contexts/SettingsContext";

export type I18N = string | { zh: string; en: string };

export function tPick(t: I18N, lang: "zh" | "en"): string {
  return typeof t === "string" ? t : (t[lang] ?? t.zh ?? "");
}

export function useI18N() {
  const { lang } = useSettings();              // lang: "zh" | "en"
  const isZH = lang === "zh";
  const tt = (t: I18N) => tPick(t, lang);
  const tr = (zh: string, en: string) => (isZH ? zh : en);
  return { lang, isZH, tt, tr };               // ← 新增 isZH
}
