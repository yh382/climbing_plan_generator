// src/features/activity/MonthCalendar.tsx
// Always-month calendar used as a persistent top block in Activity tab's
// Sessions and Training segments. Wraps ExpandableCalendar with its new
// alwaysExpanded mode so the weekly-strip / expand chevron are gone.

import React from "react";
import ExpandableCalendar from "../session/components/ExpandableCalendar";

type Props = {
  onDateSelect?: (date: Date) => void;
  activeDate?: string | null;
};

export default function MonthCalendar({ onDateSelect, activeDate }: Props) {
  return <ExpandableCalendar alwaysExpanded onDateSelect={onDateSelect} activeDate={activeDate} />;
}
