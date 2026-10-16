# ThreePanelLayout

Top-bar + three-column (left / center / right) page scaffold.

## Use a named variant

Import a curried variant from the package root. A variant bakes its aside
widths (from `tokens.ts`) and full height. You pass only the panels.

| Variant | Left / Right | Use for |
|---|---|---|
| `StandardThreePanel` | 260 / 240 | list, work area, context pane |
| `ListDetailThreePanel` | 320 / 240 | list-and-detail with a wide left column |
| `InspectorThreePanel` | 220 / 320 | work area with a wide right inspector |
| `SplitThreePanel` | 560 / 240 | split view with a half-screen-class left pane |

```tsx
import { StandardThreePanel } from "solid-ui-components";

<StandardThreePanel leftPanel={<List />} centerPanel={<Work />} rightPanel={<Context />} />
```

An omitted aside collapses its column to 0 and the center expands.

## Changing a size: the variant-change rule

A size change to a variant is **either a new named variant, or a global change
to that variant for every consumer. It is never a call-site prop.**

When asked to make a column wider or narrower (Peter, 2026-10-16), ask one
question with two choices before editing:

1. A new named variant (propose its name), added next to the others in
   `variants.tsx`, with any new width added to `tokens.ts`.
2. A global change to the existing variant, which moves every consumer.

Widths never appear as literals in a variant or at a call site.

## Internal primitive

`ThreePanelLayout` (props `leftPanelWidth`, `rightPanelWidth`, `height`,
`fullHeight`, `asideMaxHeight`) is an internal primitive. Its root export is
`@deprecated` (phase 2 of the add/deprecate/delete migration) and goes away in
phase 3. An app that needs its own geometry uses `createThreePanelLayout` to
define a named variant, not the primitive.
