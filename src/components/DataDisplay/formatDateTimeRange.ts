// ============================================
// formatDateTimeRange — Pure function used by both `DateTimeRange`
// (the Composite that renders the formatted string in `NowrapBody`)
// and `TitledTimeRangeHeader` (the sole Atomic Primitive that renders
// the same formatted string in its own timestamp span). Exists so
// Atomic Primitives can share the date-range rule with `DateTimeRange`
// without composing it — Primitives cannot import library components.
// ============================================

export type DateTimeRangeMode = "date" | "datetime";

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
};

export function formatDateTimeRange(
  start: string,
  end?: string | null,
  mode: DateTimeRangeMode = "datetime",
): string {
  const startDate = fmtDate(start);

  if (mode === "date") {
    if (!end) return `${startDate} — ongoing`;
    return `${startDate} — ${fmtDate(end)}`;
  }

  const startTime = fmtTime(start);
  if (!end) return `${startDate} ${startTime} — ongoing`;

  const endDate = fmtDate(end);
  const endTime = fmtTime(end);

  if (startDate === endDate) {
    return `${startDate} ${startTime} — ${endTime}`;
  }
  return `${startDate} ${startTime} — ${endDate} ${endTime}`;
}
