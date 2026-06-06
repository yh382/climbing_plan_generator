// src/features/activity/MonthCalendar.tsx
//
// Shared calendar widget for Activity tab's Sessions and Training
// segments + Journal.
//
// TR4: switched from forced month view (`alwaysExpanded`, ~380pt) to
// weekly-by-default (~80pt) with the chevron the user taps to expand
// to a full month. Saves ~300pt of vertical space so the SegmentBar +
// Today card surface above the fold.

import React from "react";
import ExpandableCalendar from "../session/components/ExpandableCalendar";

type Props = {
  onDateSelect?: (date: Date) => void;
  activeDate?: string | null;
};

export default function MonthCalendar({ onDateSelect, activeDate }: Props) {
  // alwaysExpanded={false} → weekly default + chevron toggle wired in
  // ExpandableCalendar L302-L305.
  return (
    <ExpandableCalendar
      alwaysExpanded={false}
      onDateSelect={onDateSelect}
      activeDate={activeDate}
    />
  );
}
