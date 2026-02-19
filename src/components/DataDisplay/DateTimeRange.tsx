// ============================================
// DateTimeRange — Depth 2 (zero CSS)
// Composes Text (curried: NowrapBody).
// ISO-formatted date/time range display.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import { NowrapBody } from "../Text";

export interface DateTimeRangeProps extends JSX.HTMLAttributes<HTMLElement> {
  start: string;
  end?: string | null;
  mode?: "date" | "datetime";
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export const DateTimeRange: Component<DateTimeRangeProps> = (props) => {
  const [local, others] = splitProps(props, ["start", "end", "mode"]);

  const display = () => {
    const mode = local.mode || "datetime";
    const startDate = fmtDate(local.start);

    if (mode === "date") {
      if (!local.end) return `${startDate} — ongoing`;
      return `${startDate} — ${fmtDate(local.end)}`;
    }

    const startTime = fmtTime(local.start);

    if (!local.end) return `${startDate} ${startTime} — ongoing`;

    const endDate = fmtDate(local.end);
    const endTime = fmtTime(local.end);

    if (startDate === endDate) {
      return `${startDate} ${startTime} — ${endTime}`;
    }

    return `${startDate} ${startTime} — ${endDate} ${endTime}`;
  };

  return <NowrapBody {...others}>{display()}</NowrapBody>;
};
