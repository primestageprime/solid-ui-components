// ============================================
// Chart slot — shared pointer-event handler types.
// Home for cross-slot type aliases. Slot-specific types live in their
// own slot file. New slots import from here, not from peer slots.
// ============================================

/** Stable identifier for a slot datum (segment, bar, pin, etc.). */
export type Id = string;

/** Pointer-click handler. Item + native PointerEvent. */
export type ClickHandler<T> = (item: T, event: PointerEvent) => void;

/** Pointer-hover handler. Item or null (on pointer-leave) + native PointerEvent. */
export type HoverHandler<T> = (item: T | null, event: PointerEvent) => void;
