# react-mirror

SUI drawn in React, for Claude's design canvases. It builds the **SUI design system**: SUI's own CSS and tokens, plus thin React components with SUI's names and props that render the same markup with the same classes. A design made from it looks like SUI because it is SUI's CSS on SUI's markup.

Nothing here changes SUI. The mirror reads SUI's sources and never edits them.

## How it stays the same as SUI

- **One source of CSS.** `components/bundle.css` is SUI's component CSS, `src/themes/_baseline.css`, then `hud.css` and `bronze.css`, each scoped to the `<html data-theme>` that selects it with `:where()`, so no rule's specificity changes (`build/theme.ts`).
- **SUI's variant tables, as they are.** `import … from "sui:Button/variants"` opens SUI's own `variants.ts` with its factory imports (`createButton`, `createStack` …) pointed at the mirror's React bases (`build/suiResolve.ts`). A variant SUI adds or drops is in the mirror on the next build. A variant table that starts importing a Solid component the mirror has no base for fails the build.
- **SUI's pure modules, as they are.** The dial geometry, readouts, groups and labels are imported from SUI unchanged.
- **The drift test.** `test/drift.test.tsx` renders every variant of the six tables, and each state of the hand-ported bases and the two dials, with SUI's Solid components and with the mirror, normalizes both DOM trees and requires them equal.
- **Generated types.** `src/generated/sui/` declares the `sui:*` modules from SUI's sources (`npm run generate`); a test fails while they are stale.

## What is in it

- The variant tables: Button, Layout, Surface, Text, Divider, MarkedSlider.
- The bases SUI exports: `Icon`, `MarkedSlider`, `SliderField`.
- The role card's two dials, `MutationDial` and `GroupDial` (private to SUI's MutationSliders; named here so a canvas can draw one card). A dial's name is shortened to fit its column as SUI does it.
- `WeightedGroupCard`, the role card with counted members (SUI's model, `weighted.ts`, imported unchanged), and its count field `CountInput100` on `ThemedNumberInput`. The card opens and closes; the range dialog its name opens is not drawn.
- Tokens for the HUD (default) and Light (Bronze) themes.

The components draw a state. Callbacks only report a press; nothing drags, takes keys or animates.

## Not yet

- The full MutationSliders row: paging, selection, linked dials, the scale.
- The link button revealed on hover or focus.
- `WeightedGroupCard`'s range dialog, and `ThemedNumberInput`'s visible label, error and description.
- The colourblind and Bronze Dark themes, and the `sui-dense-*` density tokens.
- Every other SUI component.
- Keyframes that both `_baseline.css` and `hud.css` define (modal fades, tab pulse) take HUD's version in both themes.

## Commands

```sh
npm ci --ignore-scripts            # at the repo root first, then here
npm run check                      # types, lint, tests (the drift test included)
npm run build                      # the design system's files into dist/project/
npm run generate                   # refresh src/generated/sui/ after SUI changes
```

`npm run build` writes the files the design system publishes: `README.md`, `tokens.json`, `tokens.css`, `components/bundle.js` (one classic script assigning `window.Sui`, reading `window.React` and `window.ReactDOM`), `components/bundle.css`, `components/index.d.ts`, and each card's `preview.html` and `README.md` from `design-system/`. Publishing them to the design system's artifact is a separate step.
