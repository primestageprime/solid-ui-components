# Component Architecture Style Guide

## Folder naming

A component folder name should match either:

1. The single component it exports (`Button/Button.tsx`, `ConversationTree/ConversationTree.tsx`), or
2. A category that holds 2+ related components (`Layout/Stack.tsx,Row.tsx,Box.tsx`, `Table/BaseTable.tsx,GroupedTable.tsx,FilterableTable.tsx`).

**Anti-pattern:** a category folder with one component (e.g. `Badge/StatusBadge.tsx`, `Card/RemovableItemCard.tsx`, `DragDrop/QuadrantGrid.tsx`, `Selector/SidebarSelector.tsx`). These predate the convention and will be renamed in the next major. Don't introduce new ones — either use the singleton convention (folder = component name) or move siblings into the category.

The folder name doesn't show up in consumer imports (everything routes through the package root), so the cleanup is internal cosmetics.

## Layer Definitions

### Atomic Components
- Own their CSS file (BEM naming: `.component-name`, `.component-name--variant`)
- Contain base TSX + style only
- **Must NOT** import or render other Atomic or Layout components
- May define curried variants via a sibling `variants.ts` file using factory functions (`createText`, `createSurface`, etc.)
- Examples: Text, Surface, Button, Icon

### Layout Components
- Own their CSS file
- Contain base TSX + style only
- **Must NOT** import or render other Atomic or Layout components
- May define curried variants via a sibling `variants.ts`
- Examples: Stack, Row, Box

### Depth 2+ Components (Composites)
- **Zero CSS files** — all visual styling comes from Atomic/Layout variants
- Compose from curried variants of Atomic and Layout components
- Use `Dynamic` + lookup maps for variant selection where applicable

## Depth Rules

**Depth = N+1, where N is the highest depth of any component it contains.**

Atomic and Layout components are **Depth 1** (they own CSS and compose no other components).

| Contains highest-depth of… | Resulting depth |
|---|---|
| Only Atomic/Layout (Depth 1) | **Depth 2** |
| A Depth 2 component | **Depth 3** |
| A Depth 3 component | **Depth 4** |

This applies at every level — individual components AND modules:
- A **component** that renders a Depth N child is Depth N+1.
- A **module** (file exporting multiple components) inherits the depth of its highest-depth export. If a module defines Depth 2 sub-components (e.g., DataList defines DTable, DD, Badge — each wrapping Atomics), the module itself is **Depth 3**.

**Example:** DataList defines `Badge` (wraps StatusBadge → Depth 2) and `DTable` (wraps KVTable → Depth 2). DataList module = Depth 3.

## Layout Purity

**No component may own box-model geometry.** Rows, columns, gaps, alignment,
spreads, fills, scrolls, and pinned edges are expressed by **composing Layout
components** (`src/components/Layout`: the `Stack`/`Row`/`Box` factories and
their curried variants — `TightStack`, `SpreadRow`, `ClusterRow`, `GrowBox`,
`FillColumn`, `ScrollColumn`, `TagRow`, and the rest of `variants.ts`) — **never**
via `display: flex | grid`, `gap`, `justify-content`, `align-items`,
`align-self`, `flex-*`, `place-*`, `row-gap`/`column-gap`, or `overflow` in a
component's own CSS or inline `style={}`.

The Layout family owns the arrangement vocabulary in one place. When a component
hand-rolls its own flex/grid wrapper it forks that vocabulary: gaps drift off
the 4px scale, alignment logic is duplicated, and a change to how the app spaces
things means grepping every CSS file instead of editing one variant. This is the
same single-place-ownership principle as [The #1 Rule](AGENT_GUIDE.md) (visual
config lives in curried variants), applied to geometry.

### Exemptions

Three categories are exempt — everything else migrates:

1. **`layout`-tagged components** — the Layout family itself (`Stack`, `Row`,
   `Box`, `AppShell`) **plus** `ThreePanelLayout`, `Page`, `ScrollRegion`,
   `SplitQueueList`, `Section`, `CollapsiblePanel`, `Modal`, `BottomSheet`, and
   `ButtonGroup` (the last DEPRECATED-as-such — see ruling 5 below). These
   components **are** the arrangement vocabulary — they are allowed (and
   required) to declare flex/grid/overflow/positioning directly.
2. **svg / canvas rendering** — charts and their render primitives may position
   freely (the SVG coordinate system is their layout engine, not the box model).
3. **overlay controls** — components that anchor a floating surface (`Toast`,
   `PopoverMenu`, `Dropdown`, `Tooltip`, and the popover portions of `Select`,
   `Combobox`, `DatePicker`, `DateRangePicker`, `MultiSelectFilter`) keep their
   `position: absolute | fixed` anchoring **only**. Their internal rows and
   columns still migrate to Layout compositions.

### When a geometry has no Layout variant

**Add the named variant to `Layout/variants.ts` first, then compose it.** A
missing variant is the finding, not an excuse for an inline style. Each new
variant gets a role-named export and a comment on when to use it (see the
existing `FillColumn` / `ScrollColumn` / `PaneRow` entries for the idiom). Note
the usual guardrail: expanding the underlying `Stack`/`Row` *scales* (new `gap`
token, new `align` value) still requires Peter's sign-off per
[The #2 Rule](AGENT_GUIDE.md) — a new *composed variant* over the existing scale
does not.

### Child arrangement vs intrinsic element styling

Migrate **child arrangement** — a wrapper that lays out multiple children in a
row/column/grid. Leave (but note) **intrinsic element styling** — a
self-contained atom centering its *own* single label, e.g. a pill or icon
button with `display: inline-flex; align-items: center` on the element that
renders the glyph/text. Don't force an absurd one-child `<Row>` wrapper around a
pill just to satisfy the letter of the rule; the target is duplicated
*arrangement* vocabulary, not every `inline-flex`.

### Rulings on the hard cases (Peter, 2026-07-14)

Four situations that have no obvious Layout home were adjudicated:

1. **Pseudo-element layout chrome (`::before`/`::after` with `flex`, etc.):**
   replace the pseudo-elements with **real elements** (e.g. a `GrowBox` rule
   line) one at a time, verify the render is visually identical, and keep the
   change only if it holds up. Fall back to BLOCKED-with-reason only if a
   faithful real-element replacement genuinely can't match. Rationale: deeper
   components shouldn't have to think about styling or accidentally override it.
2. **Off-scale gaps: snap to the scale — always (final, 2026-07-14).** The
   `Stack`/`Row` gap scale is `xs`(4px)/`sm`(8px), full stop — no `md`/`lg`.
   **Every** off-scale gap snaps to the nearest existing step, even when the
   change is visible: `6px`→`sm`, `12px`→`sm`, `16px`→`sm`. There is no ±2–4px
   tolerance gate and nothing blocks on gap size. Note each snap in the commit
   message so visual diffs are attributable. (`Grid` and `AutoStackRow` are
   separate primitives that carry their own `md`(12px) step for genuine 2-D /
   responsive gaps; this rule governs `Stack`/`Row`.)
3. **Missing 2-D / responsive layouts: add the primitive.** Two shipped:
   `AutoStackRow` + `AutoStackItem` (responsive side-by-side → stacked via a
   `breakWidth` prop — the "holy-albatross" behavior) and `Grid` + the
   `LabelValueGrid` variant (`minmax(label, max-content) 1fr`). Compose these
   instead of hand-rolling `flex-basis` calcs or `display: grid`.
4. **Clipping/masking `overflow: hidden` is NOT an intrinsic carve-out.** Route
   it through Layout: compose the `ClipBox` curried `Box` variant
   (`overflow: hidden`) wherever a component clips for a collapse animation or a
   progress/bar mask. There is no "overflow is fine here" exception.
5. **ButtonGroup is `layout`-exempt but DEPRECATED-as-such (2026-07-14).** Its
   job is arranging child buttons, so it joins the exempt list and its internals
   may use base `Row`/`Stack`. But its runtime `gap`/`orientation` props are
   legacy: add curried variants (`HButtonGroup`/`VButtonGroup`) so new call sites
   have the pure path, keep the existing runtime API working unchanged (zero
   breaking changes), and let consumers migrate opportunistically.

### Migration posture

Forward + opportunistic: new components must comply from the start; existing
ones migrate via the `layout-purity-refactor` skill
(`.claude/skills/layout-purity-refactor/SKILL.md`), one component per commit,
each verified visually identical before moving on.

**Status: the initial migration is COMPLETE (2026-07-14).** Every component in
the inventory reached a terminal disposition — DONE (geometry composed from
Layout variants), AUDITED-INTRINSIC (self-contained widget arranging its own
prop/data-derived parts), or EXEMPT-AS-LAYOUT (the Layout family + genuine
full-height scroll plumbing + genuine 2-D grid matrices). The full inventory,
the vocabulary the migration added, and the standing keep-vs-migrate
discriminators live in
`docs/superpowers/plans/2026-07-14-layout-purity-migration.md` › *Migration
complete*. New components still comply from the start.

## Prop Architecture: Overrides vs Data

Every component has two categories of props:

### Override Props (library-internal)
Visual/layout configuration: `variant`, `size`, `padding`, `radius`, `bg`, `borderColor`, `gap`, `direction`, `align`, `class`, `style`, etc.

These are **static decisions** — they define what a component looks like. They should be set once at definition time via curried variants, not passed dynamically at render time.

### Data Props (public contract)
Reactive data and callbacks: `children`, `onClick`, `active`, `disabled`, `value`, `onChange`, `label`, etc.

These are **dynamic** — they change based on application state.

### The Split

```tsx
// Inside the library — full prop type with overrides
interface SurfaceInternalProps extends JSX.HTMLAttributes<HTMLDivElement> {
  // Overrides
  padding?: "none" | "sm" | "md";
  radius?: "none" | "sm" | "md";
  bg?: string;
  borderColor?: string;
  interactive?: boolean;
  direction?: "row" | "column";
  align?: "start" | "center" | "stretch";
  gap?: "none" | "sm" | "md" | "lg";
  minWidth?: string;
  maxWidth?: string;
  // Data
  children?: JSX.Element;
  active?: boolean;
  class?: string;
}

// Override type — what the factory accepts
type SurfaceOverrides = Pick<SurfaceInternalProps,
  "padding" | "radius" | "bg" | "borderColor" | "interactive" |
  "direction" | "align" | "gap" | "minWidth" | "maxWidth"
>;

// Data type — what the curried component exposes
type SurfaceDataProps = Omit<SurfaceInternalProps, keyof SurfaceOverrides>;

// Factory returns a component typed with ONLY data props
function createSurface(overrides: SurfaceOverrides): Component<SurfaceDataProps> {
  return (props) => <Surface {...overrides} {...props} />;
}
```

### Why This Matters

When client apps use curried variants, TypeScript prevents them from passing override props:

```tsx
// ✅ Correct — only data props
<InteractiveCard active={isSelected()}>
  <TextLabel>{item.name}</TextLabel>
</InteractiveCard>

// ❌ TypeScript error — 'padding' is not in SurfaceDataProps
<InteractiveCard padding="lg" active={isSelected()}>
  <TextLabel>{item.name}</TextLabel>
</InteractiveCard>
```

If a client app needs a different visual configuration, the correct action is to create a new curried variant in the library — not to pass override props inline.

## Curried Variants

If an Atomic or Layout component is configured with **static arguments** (non-reactive props known at definition time), it should be a **curried variant**.

```tsx
// Good — static config curried at definition time
export const InteractiveCard = createSurface({
  padding: "sm", radius: "sm", interactive: true,
  bg: "rgba(0,168,204,0.05)", borderColor: "rgba(0,168,204,0.3)"
});

// Good — only reactive data passed at render time
<InteractiveCard active={local.active}>
  <TextLabel>{local.title}</TextLabel>
</InteractiveCard>
```

**Higher-level composites should only provide:**
- Data bindings (reactive signals/props)
- Event callbacks
- Conditional rendering (`<Show>`, `<For>`)

They should NOT pass static styling props to curried variants at render time.

### Creating New Variants

When you need a visual configuration that doesn't exist:

```tsx
// In solid-ui-components/src/components/Surface/variants.ts

// Add your new variant
export const HabitCard = createSurface({
  padding: "md",
  radius: "md",
  bg: "rgba(245,158,11,0.05)",
  borderColor: "rgba(245,158,11,0.2)",
  interactive: true,
});
```

Then export it from `index.ts` and use it in your app. Never inline the same visual config repeatedly.

## Variant Surface: keep it minimal

Build a new component with the **minimal set of variants the current use case
actually needs** — not the full matrix of sizes, colors, and modes it *could*
support. A round 56px button used in one place is `Fab({ icon, label })`, not
`Fab({ icon, label, size, variant, anchor, offset })`.

**Why:** Every prop is a public contract you must keep working, test, document,
and reason about — and most speculative variants are never used. Unused variants
are the "joseki" of component work: low-risk, well-understood, and deferrable.
Adding them up-front spends effort on the certain to avoid the uncertain, and a
wide surface makes the component harder to change later (every option multiplies
the states you must preserve).

**How to apply:**
- Start from the real caller. Ship only the props it needs.
- When a second use case appears that genuinely differs, *then* add the variant
  (and prefer a curried variant over a new prop where the config is static — see
  above).
- A single fixed size/color is fine; it inherits sensible behavior from the
  composed primitive (e.g. a `Fab` with no `variant` gets Button's default hover
  for free).

**Expansion is gated.** This is the same principle as *The #2 Rule* in
`AGENT_GUIDE.md`: start with one variant and expand only on real demand. Growing
the set of variants/sizes/tokens/props requires confirming with Peter first
(why + why important), and **test-only / showcase-only usage does not count as
demand** — only a shipped consumer does. This is why `Stack`/`Row` gaps were
trimmed to `xs`/`sm` and `Surface` `padding`/`radius` to `none`/`sm`/`md`.

## Quality Checks

After every commit, verify:
1. **TypeScript** — `npx tsc --noEmit` passes with zero errors
2. **Build** — `npx vite build` succeeds
3. If either check fails, fix the issue and create a new commit

## Showcase Conventions

Each component gets a showcase file in `dev/showcases/` following the depth layout:
- **Composed** section — multiple usage examples grouped by feature
- **Atoms/Variants** section — lists all curried variants and sub-components used, with navigation links to their showcases
- Depth 3+ showcases separate "Atomic" and "Depth 2" sub-component groups
