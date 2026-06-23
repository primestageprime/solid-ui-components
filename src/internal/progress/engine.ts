// ============================================
// Self-estimating progress — the stateful ENGINE (no DOM, injectable clock).
//
// One engine per board instance. It:
//   • holds the single online regression model (estimator.ts),
//   • tracks the lifecycle of every batch it's told about (keyed by a stable
//     id), timestamping a batch when first seen `running` and recording a real
//     `(rows, durationMs)` sample on `running → done`,
//   • on each animation frame, recomputes every active batch's eased fraction
//     (race / creep / snap) and reports whether anything still needs to move.
//
// It owns NO timers and NO rAF itself — the Solid wrapper drives `frame(now)`
// from a real requestAnimationFrame loop, and tests drive it from a fake
// clock. This keeps the smart logic deterministic and fully unit-testable
// while never leaking a time source into the public API.
// ============================================
import {
  createModel,
  easeRunning,
  easeSnap,
  estimateMs,
  foldSample,
  residualStd,
  SNAP_MS,
  type RegressionModel,
} from "./estimator";

/** The declarative state the consumer supplies per batch. NO fractions. */
export type BatchState = "pending" | "running" | "done";

/** One batch the engine tracks, keyed by a caller-stable id. */
export interface BatchInput {
  /** Stable identity for this batch across frames (e.g. `${table}#${i}`). */
  id: string;
  rows: number;
  state: BatchState;
}

interface BatchRecord {
  rows: number;
  /** Wall-clock ms when first observed `running` (null until then). */
  startedAt: number | null;
  /** Wall-clock ms when first observed `done` (null until then). */
  doneAt: number | null;
  /** Whether the `(rows, dur)` sample was already folded into the model. */
  sampled: boolean;
  /** The eased fraction at the instant `done` was observed (snap origin). */
  snapFrom: number;
  /** Last eased fraction emitted (0..1). */
  p: number;
}

export interface ProgressEngine {
  /**
   * Reconcile the engine's tracked batches against the caller's current set,
   * at wall-clock `now`. Removes batches no longer present; for each present
   * batch records lifecycle transitions and folds a real duration sample on
   * `running → done`. Pure bookkeeping — does not compute fractions.
   */
  observe(batches: BatchInput[], now: number): void;
  /**
   * Recompute every tracked batch's eased fraction at wall-clock `now`.
   * Returns `true` while anything is still animating (a running batch, or a
   * snap still in flight) so the driver knows whether to schedule another
   * frame. When everything is idle/settled it returns `false`.
   */
  frame(now: number): boolean;
  /** The current eased fraction (0..1) for a tracked batch id, else 0. */
  fractionOf(id: string): number;
  /** Test/inspection hook — the live model (not part of the public API). */
  readonly model: RegressionModel;
}

export function createProgressEngine(): ProgressEngine {
  const model = createModel();
  const records = new Map<string, BatchRecord>();

  const observe = (batches: BatchInput[], now: number): void => {
    const seen = new Set<string>();
    for (const b of batches) {
      seen.add(b.id);
      let rec = records.get(b.id);
      if (!rec) {
        rec = {
          rows: b.rows,
          startedAt: null,
          doneAt: null,
          sampled: false,
          snapFrom: 0,
          p: 0,
        };
        records.set(b.id, rec);
      }
      rec.rows = b.rows;

      if (b.state === "running" && rec.startedAt === null) {
        rec.startedAt = now;
      }
      if (b.state === "done" && rec.doneAt === null) {
        rec.doneAt = now;
        // The snap starts from wherever the bar currently sits.
        rec.snapFrom = rec.p;
        // Record the real sample exactly once, only if we actually saw it run.
        if (!rec.sampled && rec.startedAt !== null) {
          const durMs = Math.max(1, now - rec.startedAt);
          foldSample(model, rec.rows, durMs);
          rec.sampled = true;
        }
      }
    }
    // Drop batches the caller no longer presents.
    for (const id of [...records.keys()]) {
      if (!seen.has(id)) records.delete(id);
    }
  };

  const frame = (now: number): boolean => {
    let animating = false;
    const sigma = residualStd(model);
    for (const rec of records.values()) {
      if (rec.doneAt !== null) {
        // Snapping toward 1.0.
        const snapElapsed = now - rec.doneAt;
        rec.p = easeSnap(rec.snapFrom, snapElapsed);
        if (snapElapsed < SNAP_MS) animating = true;
      } else if (rec.startedAt !== null) {
        // Running — race/creep against the estimate.
        const est = estimateMs(model, rec.rows);
        rec.p = easeRunning(now - rec.startedAt, est, sigma);
        animating = true;
      } else {
        // Pending — no fill yet.
        rec.p = 0;
      }
    }
    return animating;
  };

  return {
    observe,
    frame,
    fractionOf: (id) => records.get(id)?.p ?? 0,
    get model() {
      return model;
    },
  };
}
