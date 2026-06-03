# SegmentedControl — Design Spec

**Date:** 2026-06-03
**Status:** Approved (design), pending implementation
**Author:** Adlai Arnold (with Claude)

## Problem

We need a control that toggles between **more than two** mutually-exclusive
states, where the states can be visually grouped. The motivating case is an
override control whose value is `AUTO | (PROD | OFF)` — `Auto` is one choice,
and `Prod`/`Off` form a related group. Selection is single-value (a sum type),
so exactly one state is active at a time; the grouping is a visual affordance,
not a second level of selection.

Chosen rendering (mockup B, "grouped segmented"): a single segmented control
with a visual divider between groups and per-state coloring (e.g. `Off` in red).

## Component

`SegmentedControl` — a generic, single-select segmented control. The
`AUTO | (PROD | OFF)` case ships as a curried variant (`OverrideToggle`), the
same way `TruthToggle` is a curried `Toggle`.

Lives in `src/components/SegmentedControl/`. Atomic (Depth 1): owns its CSS, no
component imports.

## API

```ts
export interface SegmentOption {
  /** Stable id emitted on selection. */
  value: string;
  /** Display content; string or JSX (icons ok). Defaults to `value`. */
  label?: string | JSX.Element;
  /** Group key. A divider renders wherever this differs from the previous
   *  option's group. Order is taken from the array; only adjacency matters. */
  group?: string;
  /** Accent color when THIS segment is selected. */
  color?: ColorVariant;
  /** Disable just this segment (kept visible, not focusable/selectable). */
  disabled?: boolean;
}

export type SegmentedControlSize = "sm" | "md" | "lg";

export interface SegmentedControlProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Ordered list of selectable states. */
  options: SegmentOption[];
  /** Controlled, single-select value. Should match one option's `value`. */
  value: string;
  /** Fires with the new value, only when the selection actually changes. */
  onValueChange?: (value: string) => void;
  /** Sizing, consistent with Toggle/Button. Default "md". */
  size?: SegmentedControlSize;
  /** Fallback accent for selected segments that don't specify their own. */
  color?: ColorVariant;
  /** Disable the entire control. */
  disabled?: boolean;
}
```

### Curried factory + variant

Mirrors `createToggle`. Visual + config props (`options`, `size`, `color`) are
locked at variant-definition time; data props (`value`, `onValueChange`,
`disabled`) stay open.

```ts
export type SegmentedControlOverrides =
  Pick<SegmentedControlProps, "options" | "size" | "color">;
export type SegmentedControlDataProps =
  Omit<SegmentedControlProps, keyof SegmentedControlOverrides>;

export function createSegmentedControl(
  defaults: Pick<SegmentedControlProps, "options"> & Partial<SegmentedControlProps>,
): Component<SegmentedControlDataProps>;

// variants.ts
export const OverrideToggle = createSegmentedControl({
  options: [
    { value: "auto", label: "Auto", group: "mode",     color: "primary" },
    { value: "prod", label: "Prod", group: "override", color: "success" },
    { value: "off",  label: "Off",  group: "override", color: "danger"  },
  ],
});
// usage: <OverrideToggle value={mode()} onValueChange={setMode} />
```

## Behavior

- **Single-select, controlled.** No internal selection state; the parent owns
  `value`. No uncontrolled `defaultValue` (YAGNI). Pure render from props.
- **Change semantics.** Clicking or keyboard-selecting a segment calls
  `onValueChange(value)` only when `value` differs from the current selection.
- **Grouping/dividers.** Options render in array order. A divider element is
  emitted between two adjacent options whenever their `group` values differ.
  Options with no `group` are treated as their own boundary-less run (a divider
  appears only when the key actually changes). The `AUTO | (PROD | OFF)` case
  yields exactly one divider, between `auto` and `prod`.
- **Color.** A selected segment uses its own `color`, falling back to the
  control-level `color`, falling back to the default accent.

## Accessibility

WAI-ARIA radio-group pattern:

- Container: `role="radiogroup"`. Consumers pass `aria-label`/`aria-labelledby`
  via spread `HTMLAttributes`.
- Each segment: `role="radio"`, `aria-checked`, `aria-disabled` when disabled.
- **Roving tabindex.** The selected segment is `tabindex=0`; others `-1`.
- **Keyboard.** Arrow keys (Left/Up, Right/Down) move selection to the previous/
  next enabled segment; Home/End jump to the first/last enabled segment. Disabled
  segments are skipped. Moving selection fires `onValueChange`.

## Styling

Own CSS (`SegmentedControl.css`), theme-variable driven like `Toggle.css`.

- `.sui-segmented` — inline-flex pill container, hairline border, rounded.
- `.sui-segmented__seg` — segment buttons sharing internal borders; selected
  segment fills with accent, unselected are muted/transparent.
- `.sui-segmented__seg--{primary,danger,warning,success}` — accent modifiers,
  reusing `ColorVariant`.
- `.sui-segmented__divider` — thin rule between groups, heavier than the
  inter-segment border.
- `.sui-segmented--{sm,md,lg}` — padding + font-size.
- Disabled (whole control or per-segment): reduced opacity,
  `cursor: not-allowed`, not focusable.

## Files

New `src/components/SegmentedControl/`:

- `SegmentedControl.tsx` — component, `createSegmentedControl`, exported types.
- `SegmentedControl.css`
- `variants.ts` — `OverrideToggle`
- `index.ts` — barrel
- `SegmentedControl.test.tsx`

Integration:

- Add `export * from "./components/SegmentedControl"` to `src/index.ts`.
- Add a showcase so it appears in the dev gallery.
- Formal catalog registration (showcase wiring, `COMPONENTS.md` entry, version
  bump + publish) is done later via the `/promote` skill.

## Testing (TDD)

Behavior tests written first (red → green):

1. Renders one segment per option, label defaulting to `value`.
2. Selected segment reflects `value` (`aria-checked`, selected class).
3. Clicking an unselected segment fires `onValueChange` with its value.
4. Clicking the already-selected segment does **not** fire `onValueChange`.
5. A divider renders at each group boundary, and `AUTO|(PROD|OFF)` yields
   exactly one.
6. Per-state `color` applies the matching accent class to the selected segment;
   control-level `color` is the fallback.
7. Keyboard: Arrow/Home/End move selection across enabled segments and skip
   disabled ones.
8. Disabled segment is not selectable via click or keyboard; disabled control
   ignores all interaction.
9. `OverrideToggle` variant renders Auto/Prod/Off with the expected
   colors/divider and forwards `value`/`onValueChange`.

## Out of scope

- Multi-select (this is a sum type — exactly one active).
- Uncontrolled mode / `defaultValue`.
- Nested option arrays (grouping is a flat `group` key).
- Two-tier reveal layout (mockup C) — rejected in favor of grouped segmented (B).
