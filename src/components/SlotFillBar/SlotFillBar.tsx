// ============================================
// SlotFillBar — Atomic (Depth 1)
// Owns CSS (SlotFillBar.css), no component imports.
// A fill-from-left progress bar for a queue / pipeline of equal-sized work
// slots that move through todo → doing → done. Two distinct transitions:
//
//   - todo → doing of a slot : the active overlay SLIDES (or grows) to the
//                              new slot's position. Colour snaps to the
//                              "doing" tone — no cyan halfway through.
//   - doing → done of a slot : the active overlay's clip-path stays put;
//                              its colour FADES IN PLACE to the "done"
//                              tone. Underneath, the static fill grows by
//                              one slot's width to absorb it.
//
// Design notes
// ------------
// * `transform: scaleX` on the static layer and `clip-path: inset` on the
//   overlay are both compositor-friendly and don't trigger layout per
//   frame. `width` / `left` interpolation looked snappy on this kind of
//   small change but can stutter under load.
// * Colour transition direction is selected from `active.phase`: when the
//   bar is signalling "done", the fade is enabled; everything else snaps.
//   This works because the "done" phase is the only state we want users
//   to perceive as a recolouring rather than a movement.
// * Honours `prefers-reduced-motion: reduce` — all transitions go to 0s.
// ============================================
import { Component, JSX, mergeProps, splitProps } from "solid-js";
import "./SlotFillBar.css";

export type SlotPhase = "doing" | "done";

export interface SlotFillBarActive {
  /** Zero-based index of the in-flight slot. Must be in [0, slots). */
  index: number;
  /** What state that slot is currently signalling. */
  phase: SlotPhase;
}

export interface SlotFillBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Total number of equal-sized slots in the bar. */
  slots: number;
  /** Number of fully-done slots driving the static fill. */
  done: number;
  /** The slot currently in flight, or `null` when nothing is active. */
  active?: SlotFillBarActive | null;
  /** Bar pixel height. Default 24. */
  height?: number;
  /** Pixel cap on bar width. Below this the bar fills its parent.
   *  Default 400. Pass `null` to remove the cap. */
  maxWidth?: number | null;
  /** CSS color used for the unfinished/todo region (the bar's background).
   *  Default: `var(--sui-text-muted, #555)`. */
  todoColor?: string;
  /** CSS color of the active slot while in `doing` phase. Default the info
   *  accent. */
  doingColor?: string;
  /** CSS color of completed slots (static fill) and the active slot in
   *  `done` phase. Default the success accent. */
  doneColor?: string;
  /** Optional accessibility / hover label. Defaults to a "<done>/<slots>
   *  done" summary. */
  label?: string;
}

export const SlotFillBar: Component<SlotFillBarProps> = (rawProps) => {
  const props = mergeProps(
    {
      height: 24,
      maxWidth: 400 as number | null,
      todoColor: "var(--sui-text-muted, #555)",
      doingColor: "var(--sui-info, #4ea1ff)",
      doneColor: "var(--sui-success, #2a6)",
    },
    rawProps,
  );
  const [local, others] = splitProps(props, [
    "slots",
    "done",
    "active",
    "height",
    "maxWidth",
    "todoColor",
    "doingColor",
    "doneColor",
    "label",
    "class",
    "style",
  ]);

  const slotCount = () => Math.max(1, local.slots);
  const slotPct = () => 100 / slotCount();
  const committedFrac = () => Math.max(0, Math.min(1, local.done / slotCount()));

  const active = () => local.active ?? null;
  const overlayLeftPct = () => {
    const a = active();
    return a == null ? 0 : Math.max(0, Math.min(slotCount() - 1, a.index)) * slotPct();
  };
  const overlayRightInsetPct = () => {
    const a = active();
    if (a == null) return 100;
    const idx = Math.max(0, Math.min(slotCount() - 1, a.index));
    return 100 - (idx + 1) * slotPct();
  };
  const overlayColor = () =>
    active()?.phase === "done" ? local.doneColor : local.doingColor;

  // doing→done is the only transition we want users to perceive as a
  // recolouring; everything else (sliding into a new slot, or appearing
  // for the first time) should snap so the slide stays one solid colour.
  const overlayBgTransition = () =>
    active()?.phase === "done"
      ? "background-color 0.6s ease-in-out"
      : "background-color 0s";

  const tipText = () =>
    local.label ?? `${local.done}/${slotCount()} done`;

  const wrapperClass = () => {
    const c = ["sui-slot-fill-bar"];
    if (local.class) c.push(local.class);
    return c.join(" ");
  };

  const wrapperStyle = (): JSX.CSSProperties | string => {
    const base: JSX.CSSProperties = {
      height: `${local.height}px`,
      background: local.todoColor,
    };
    if (local.maxWidth !== null) base["max-width"] = `${local.maxWidth}px`;
    return typeof local.style === "string"
      ? local.style
      : { ...base, ...local.style };
  };

  return (
    <div class={wrapperClass()} style={wrapperStyle()} title={tipText()} {...others}>
      {/* Committed done — GPU fill from the left. */}
      <div
        class="sui-slot-fill-bar__static"
        style={{
          transform: `scaleX(${committedFrac()})`,
          background: local.doneColor,
        }}
      />
      {/* In-flight overlay — clip-path + background-color. */}
      <div
        class="sui-slot-fill-bar__overlay"
        style={{
          background: overlayColor(),
          "clip-path": `inset(0 ${overlayRightInsetPct()}% 0 ${overlayLeftPct()}%)`,
          transition: [
            "clip-path 0.85s cubic-bezier(0.4, 0, 0.2, 1)",
            overlayBgTransition(),
          ].join(", "),
        }}
      />
    </div>
  );
};
