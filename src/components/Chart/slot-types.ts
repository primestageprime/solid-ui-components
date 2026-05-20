// ============================================
// Chart slot — shared pointer-event handler types.
// Home for cross-slot type aliases. Slot-specific types live in their
// own slot file. New slots import from here, not from peer slots.
// ============================================

/**
 * Stable identifier for a slot datum (segment, bar, pin, etc.).
 *
 * Branded so a plain `string` cannot be silently mixed with an `Id` at a
 * boundary (e.g. passing `bar.lane` where an `Id` is required). The brand is
 * a phantom type — erased at runtime; mint with `slotId(...)` at the
 * boundary where consumer data enters the slot.
 */
export type Id = string & { readonly __brand: "SlotId" };

/** Mint a runtime `Id` from a plain string. Same input → same id. */
export const slotId = (s: string): Id => s as Id;

/** Pointer-click handler. Item + native PointerEvent. */
export type ClickHandler<T> = (item: T, event: PointerEvent) => void;

/** Pointer double-click handler. Native dblclick is a MouseEvent, not PointerEvent. */
export type DblClickHandler<T> = (item: T, event: MouseEvent) => void;

/** Pointer-hover handler. Item or null (on pointer-leave) + native PointerEvent. */
export type HoverHandler<T> = (item: T | null, event: PointerEvent) => void;

/**
 * Cross-slot vertical placement vocabulary for annotation-capable slots
 * (PinMarkers, GhostPin, etc.).
 *
 * - `"plot-data"` — glyph y resolves through the y-scale (slot-specific
 *   fallback when the datum has no `y`). Clipped to the plot path.
 * - `"annotation"` — glyph renders in the dedicated annotation lane carved
 *   out of the top margin (requires `<Chart annotationLaneHeight={N}>`
 *   to be > 0). Each datum's `y` is ignored; cy is the vertical center
 *   of the lane. Clipped to the annotation-lane path.
 */
export type AnnotationLane = "plot-data" | "annotation";

// ============================================
// Slot factory pattern — NOT extracted (deliberate).
//
// Every slot file ends with a `create<SlotName>` factory of the shape:
//   export function createX<T = D>(defaults): Component<XDataProps<T>> {
//     return (props) => <X<T> {...mergeProps(defaults, props as XProps<T>)} />;
//   }
// And its variants module curries that into named `Component<XDataProps>`
// consts (ADR 0001).
//
// Conclusion: NOT WORTH EXTRACTING.
//   1. The factory is 3 lines per slot — at the YAGNI threshold.
//   2. Extraction does NOT eliminate the per-slot factory: TS can't infer
//      a generic-constrained helper through a higher-order generic relay
//      (`T extends HighlightSegment`, `TPin extends Pin`, ...) without
//      each slot keeping its own typed wrapper. Saves zero lines.
//   3. The variants files (2 lines per variant, mandatory dts annotation
//      per ADR 0001) are already at minimum surface area.
//   4. Inlining preserves a one-screen mental model — readers see how a
//      slot is composed without jumping to a shared factory module.
// Reconsider only if a future slot introduces a new shared concern
// beyond "merge defaults + relay generic".
// ============================================
