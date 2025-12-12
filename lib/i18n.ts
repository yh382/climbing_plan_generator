// app/lib/i18n.ts
import { useSettings } from "../src/contexts/SettingsContext";

/**
 * 支持：
 * - 纯字符串
 * - { zh, en } 对象
 * - null / undefined（统一按空字符串处理）
 * - 其他类型（number / boolean 等）→ String(...) 再返回
 */
export type I18N =
  | string
  | { zh?: string; en?: string }
  | null
  | undefined;

/**
 * 安全的文案选择函数：
 * - 不会对 undefined / null 做属性访问
 * - 不会因为类型不对而抛异常
 */
export function tPick(raw: I18N, lang: "zh" | "en"): string {
  // 1. 先处理 null / undefined
  if (raw == null) {
    return "";
  }

  // 2. 纯字符串，直接返回
  if (typeof raw === "string") {
    return raw;
  }

  // 3. 对象（{ zh, en }）
  if (typeof raw === "object") {
    const obj = raw as { zh?: string; en?: string };
    return obj[lang] ?? obj.zh ?? obj.en ?? "";
  }

  // 4. 其他奇怪类型（number / boolean 等）→ 转成字符串
  return String(raw);
}

/**
 * i18n Hook：
 * - 对 useSettings 结果做了兜底
 * - lang 只会是 "zh" 或 "en"，默认 "en"
 */
export function useI18N() {
  // 这里假设 useSettings 是一个 hook，用 useContext 包的
  // 一般情况下就算没有 Provider，它也只是返回 undefined，不会崩
  const settings = useSettings?.();
  const langValue = settings?.lang === "zh" ? "zh" : "en";
  const lang: "zh" | "en" = langValue;
  const isZH = lang === "zh";

  const tt = (t: I18N) => tPick(t, lang);
  const tr = (zh: string, en: string) => (isZH ? zh : en);

  return { lang, isZH, tt, tr };
}
