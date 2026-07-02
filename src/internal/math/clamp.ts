// ============================================
// Confine a number to an inclusive [min, max] range.
//
// The identity `Math.max(min, Math.min(max, value))` appeared verbatim — and
// re-declared as a local `clamp` / `clampWidth` / `clampPct` / `clampFrac` — in
// a dozen components (sliders, progress bars, index cursors, viewport math).
// This is the single source of truth.
//
// Assumes `min <= max`; callers that can violate that should sort first.
// ============================================

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
