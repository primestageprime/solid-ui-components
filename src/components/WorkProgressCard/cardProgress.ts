// Pure derivation of node-card progress styling from work metadata.
//
// Consumers hand in domain data only — a status plus the budgeted `estimate`
// and the `actual` spent so far — and get back the bar segments (with resolved
// colors) and an optional sign to render. Every styling decision lives HERE:
// which color, what proportion, complete→green, over-budget→crimson, under
// budget→grey, blocked/question signs. Callers never reason about any of it.

export type WorkStatus =
  | "NEW"
  | "TODO"
  | "DOING"
  | "DONE"
  | "BLOCKED"
  | "QUESTION"
  | "CLOSED";

export interface CardProgressInput {
  status: WorkStatus;
  /** Budgeted amount (any unit, same as `actual`). */
  estimate?: number;
  /** Actual/elapsed amount spent so far (same unit as `estimate`). */
  actual?: number;
}

export interface CardBarSegment {
  /** Fraction of the bar width in [0, 1]. Segments sum to 1. */
  width: number;
  /** Resolved CSS color for the segment. */
  color: string;
}

export type CardSign = "yield" | "question" | null;

export interface CardBar {
  segments: CardBarSegment[];
  sign: CardSign;
}

/** Palette — the single source of truth for the bar's styling choices. */
export const CARD_BAR_COLOR = {
  fillActive: "#1c7ed6", //                  in-progress fill (blue)
  fillDone: "#228b22", //                    complete fill (forest green)
  remainder: "rgba(28, 126, 214, 0.30)", //  in-progress remainder (faded blue)
  overrun: "#8b0a2e", //                     over-budget overrun (dark crimson)
  unused: "#4b5563", //                      unused budget (dark grey)
  empty: "rgba(140, 170, 210, 0.18)", //     no progress / stalled remainder (dim)
} as const;

/** ⚠ / ? sign badge color. */
export const CARD_SIGN_COLOR = "#00d4ff";

const STATUS_ACCENT: Record<WorkStatus, string> = {
  NEW: "rgba(255, 255, 255, 0.5)",
  TODO: "rgba(255, 255, 255, 0.5)",
  DOING: "#00d4ff",
  DONE: CARD_BAR_COLOR.fillDone,
  BLOCKED: "#00d4ff",
  QUESTION: "#00d4ff",
  CLOSED: "rgba(255, 255, 255, 0.4)",
};

/** Border/label accent color for a status. */
export function statusAccent(status: WorkStatus): string {
  return STATUS_ACCENT[status] ?? "#00d4ff";
}

const emptyBar = (): CardBar => ({
  segments: [{ width: 1, color: CARD_BAR_COLOR.empty }],
  sign: null,
});

/** actual / estimate, or null when there's no usable estimate. */
function ratioOf(estimate?: number, actual?: number): number | null {
  if (!estimate || estimate <= 0) return null;
  return Math.max(0, actual ?? 0) / estimate;
}

/**
 * Segments for a task that isn't empty. The done portion uses `fillColor`;
 * within budget the remainder uses `remainderColor`. Over budget the bar is
 * reproportioned so `actual` fills the whole width — the estimate's share is
 * `fillColor` and the overrun past it is crimson.
 */
function fillSegments(
  estimate: number | undefined,
  actual: number | undefined,
  fillColor: string,
  remainderColor: string,
): CardBarSegment[] {
  const r = ratioOf(estimate, actual);
  if (r === null) return [{ width: 1, color: remainderColor }];
  if (r <= 1) {
    return [
      { width: r, color: fillColor },
      { width: 1 - r, color: remainderColor },
    ];
  }
  const estShare = 1 / r; // estimate as a fraction of the (now-100%) actual
  return [
    { width: estShare, color: fillColor },
    { width: 1 - estShare, color: CARD_BAR_COLOR.overrun },
  ];
}

/** Derive the progress bar (segments + sign) for a card from its metadata. */
export function deriveCardBar(input: CardProgressInput): CardBar {
  const { status, estimate, actual } = input;
  switch (status) {
    case "NEW":
    case "TODO":
    case "CLOSED":
      // Not started / closed-incomplete — show no progress.
      return emptyBar();
    case "DOING":
      return {
        segments: fillSegments(
          estimate,
          actual,
          CARD_BAR_COLOR.fillActive,
          CARD_BAR_COLOR.remainder,
        ),
        sign: null,
      };
    case "DONE":
      // Complete: fill turns green; leftover budget is grey, overrun crimson.
      return {
        segments: fillSegments(
          estimate,
          actual,
          CARD_BAR_COLOR.fillDone,
          CARD_BAR_COLOR.unused,
        ),
        sign: null,
      };
    case "BLOCKED":
    case "QUESTION":
      // Stalled: show work done so far, dim remainder, with a sign over the bar.
      return {
        segments: fillSegments(
          estimate,
          actual,
          CARD_BAR_COLOR.fillActive,
          CARD_BAR_COLOR.empty,
        ),
        sign: status === "BLOCKED" ? "yield" : "question",
      };
    default:
      return emptyBar();
  }
}

// ─── time-segment accounting ─────────────────────────────────────────────────

/** A span of work on a task. `end` is absent while the segment is open (the
 *  task is actively running right now). */
export interface WorkSegment {
  start: number;
  end?: number;
}

/**
 * Actual time spent = the sum of every segment's duration. Closed segments
 * contribute `end - start`; the open segment (no `end`) runs to `now`. Mirrors
 * STDB-backed tracking where a task is started/stopped repeatedly:
 *
 *   actual = Σ (endᵢ − startᵢ)  for closed segments
 *          + (now − start)      for the open segment
 *
 * A span that hasn't started yet (start > its end/now) contributes 0.
 */
export function actualFromSegments(
  segments: WorkSegment[],
  now: number,
): number {
  let total = 0;
  for (const s of segments) {
    total += Math.max(0, (s.end ?? now) - s.start);
  }
  return total;
}

/** True while any segment is still open — the task is actively running. */
export function isRunning(segments: WorkSegment[]): boolean {
  return segments.some((s) => s.end == null);
}
