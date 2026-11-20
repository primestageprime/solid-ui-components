# SUI

SUI is Prime Stage's component library for data-dense planning tools: Thorcasting's role cards, dials and reports are built from it. This design system is SUI as it is in code. Its CSS and tokens are SUI's own sheets, and its components are thin React mirrors of SUI's SolidJS components that render the same markup with the same classes.

## Principles

- **A named variant, never a style.** Every button, surface, text and layout in SUI is a named variant (`PrimaryButton`, `CardSurface`, `TextLabel`, `ClusterRow`). The bases behind them are not exported. If a design needs something no variant gives, that is a new variant in SUI, not a one-off style in the design.
- **Minimal colour.** The theme owns every colour. A component picks a tone (accent, success, warning, danger, highlight, muted) and nothing else. Most of a screen is ink on the background; colour is for state and for the one action that matters.
- **One height per row.** Controls that sit in one row share one height: small buttons beside small fields, never mixed sizes.
- **The data is the display.** Explanations go in tooltips, not in text expanded onto the default view. A disabled control carries its reason on hover.
- **No client themes.** SUI ships its own themes only. A client's brand never becomes a SUI theme.

## Themes

- **HUD** (default): dark, sharp-edged, cyan accent, system sans and JetBrains Mono. Radii are 0; edges are cut with clip-path chamfers (the `sui-clip-*` sizes).
- **Light (Bronze)**: warm bone backgrounds, deep warm ink, rust accent, Lora for prose and Inter for utility text, subtly rounded corners.

The page's `<html data-theme="light">` selects Light; any other value, or none, is HUD.

## The role card

A Thorcasting role card is a `CardSurface` holding a row of dials, one per role: `GroupDial` for several identical units (an expander shows each), `MutationDial` for one. Each dial is a `ContinuousMarkedSlider` (the allowed range shaded, the old value's arrow, the change toned as a raise or a cut) with its readouts and a `SliderField` under it. Every dial on one card shares one `domain`, so heights compare across roles.

## Using SUI in a canvas

Everything is on `window.Sui`. In a design, place a component by its name (`Sui.CardSurface`, `Sui.GroupDial`) and pass the same props a SUI call site would. Callbacks only report presses; nothing drags or animates, so draw each state you want to show as its own instance.

Props for every component are in `components/index.d.ts`: a variant takes its base's props without the ones the variant fixes (a `PrimaryButton` takes `ButtonDataProps`).

## How it stays true to SUI

This system is generated from SUI's repository by `react-mirror/` (`npm run build`), never edited here:

- `components/bundle.css` is SUI's component CSS, `_baseline.css`, `hud.css` and `bronze.css`, scoped to their theme without changing any rule's specificity.
- `components/bundle.js` runs SUI's own variant tables (`<Comp>/variants.ts`) against React versions of the bases they call, and SUI's own pure modules (dial geometry, readouts, groups, labels) as they are.
- A drift test renders every variant, and every state of the hand-ported bases and dials, with SUI's Solid components and with the mirror, and fails if the trees differ.
- `tokens.json` lists what the theme sheets set on `:root`, per theme.

## Not carried yet

Only what a role card needs is here. Not yet: the full `MutationSliders` row (paging, selection, linked dials, scale), dragging and key handling, the name shortened to fit, the link button revealed on hover, the colourblind and Bronze Dark themes, the `sui-dense-*` density tokens, and SUI's other components (tables, charts, forms, modals and the rest).
