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
  padding?: "none" | "sm" | "md" | "lg";
  radius?: "none" | "sm" | "md" | "lg";
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
