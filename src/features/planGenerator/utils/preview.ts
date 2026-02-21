import type { FormState } from "../types";

export function buildPreviewLines(form: FormState, lang: "zh" | "en") {
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  const weak = (form.weaknesses ?? []).join(", ") || tr("无", "none");

  return [
    tr("正在为你生成训练计划…", "Generating your training plan…"),
    tr(
      `目标短板：${weak}`,
      `Focus: ${weak}`
    ),
    tr(
      `频率：攀爬 ${form.climb_freq} / 训练 ${form.train_freq}，最少休息 ${form.rest_days} 天`,
      `Frequency: climb ${form.climb_freq} / train ${form.train_freq}, min rest ${form.rest_days} day(s)`
    ),
    tr(
      `周期：${form.cycle_weeks} 周`,
      `Cycle: ${form.cycle_weeks} weeks`
    ),
  ];
}
