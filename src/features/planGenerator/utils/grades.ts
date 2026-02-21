// src/feature/planGenerator/utils/grades.ts
import type { VScaleOpt } from "../types";

export const FONT_RANGE_MAP: Record<VScaleOpt, string> = {
  "v1-v2": "5-5+",
  "v2-v3": "5+-6A",
  "v3-v4": "6A-6B",
  "v4-v5": "6B-6C",
  "v5-v6": "6C-7A",
  "v6-v7": "7A-7B",
  "v7-v8": "7A-7B",
  "v8-v9": "v8-v9",
  "v9以上": "7C以上",
};

export const YDS_TO_FRENCH: Record<string, string> = {
  "5.6":"5a","5.7":"5b","5.8":"5c","5.9":"6a",
  "5.10a":"6a+","5.10b":"6a+","5.10c":"6b","5.10d":"6b+",
  "5.11a":"6c","5.11b":"6c+","5.11c":"7a","5.11d":"7a+",
  "5.12a":"7b","5.12b":"7b+","5.12c":"7c","5.12d":"7c+",
  "5.13a":"7c+","5.13b":"8a","5.13c":"8a+","5.13d":"8b",
  "5.14a":"8b+","5.14b":"8c","5.14c":"8c+","5.14d":"9a",
};

export const vScaleToNumeric = (v: VScaleOpt): string => {
  if (v === "v9以上") return "9-10";
  return v.replace(/^v/i, "");
};
