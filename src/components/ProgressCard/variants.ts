import { ICON_PATHS } from "../Icon/Icon";
import { createWorkflowProgressCard } from "./ProgressCard";

const CACHE_STEPS = [
  { id: "minute_level", label: "Minutes", icon: ICON_PATHS["cache-minutes"] },
  { id: "hour_level", label: "Hours", icon: ICON_PATHS["cache-hours"] },
  { id: "statistics", label: "Stats", icon: ICON_PATHS["cache-stats"] },
  { id: "statuses", label: "Coverage", icon: ICON_PATHS["cache-coverage"] },
  { id: "calculations", label: "Calcs", icon: ICON_PATHS["cache-calc"] },
];

export const CacheProgressCard = createWorkflowProgressCard({ steps: CACHE_STEPS });
