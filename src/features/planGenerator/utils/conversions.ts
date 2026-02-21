// src/feature/planGenerator/utils/conversions.ts
import type { RangeOpt } from "../types";

export const cmToFtIn = (cm: number) => {
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn - ft * 12;
  return { ft, inch };
};

export const formatFtIn = (cm: number) => {
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}'${inch}"`;
};

export const kgToLb = (kg: number) => Math.round(kg * 2.20462);
export const lbToKg = (lb: number) => Math.round(lb / 2.20462);

export const numToRangeOpt = (n: number): RangeOpt => {
  if (n <= 2) return "1-2次";
  if (n === 3 || n === 4) return "3-4次";
  if (n === 5) return "5-6次";
  return "6-7次";
};
