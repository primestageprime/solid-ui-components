# Component Architecture Style Guide

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
