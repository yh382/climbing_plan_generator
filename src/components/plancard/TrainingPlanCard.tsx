// src/components/plancard/TrainingPlanCard.tsx

import React from "react";
import type { TrainingPlanCardProps } from "./PlanCard.types";
import ActivePlanCard from "./variants/ActivePlanCard";
import MarketPlanCard from "./variants/MarketPlanCard";
import CompactPlanCard from "./variants/CompactPlanCard";
import HistoryPlanCard from "./variants/HistoryPlanCard";
/**
 * Unified Plan Card entry.
 * Pages should only import TrainingPlanCard, never variant files directly.
 */
export default function TrainingPlanCard(props: TrainingPlanCardProps) {
  const { variant } = props;

  switch (variant) {
    case "active":
      return <ActivePlanCard {...props} />;

    // Step 3+ will implement these
    case "market":
      return <MarketPlanCard {...props} />;
    case "compact":
      return <CompactPlanCard {...props} />;
    case "history":
      return <HistoryPlanCard {...props} />;
    default:
      // For now: render nothing to avoid breaking builds.
      // (You can swap to a simple placeholder UI if you prefer.)
      return null;
  }
}
