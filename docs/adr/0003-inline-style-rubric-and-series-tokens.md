# Inline-style rubric linter, minimal props, and the 8-slot series palette

SUI's Layout-Purity regime (STYLE_GUIDE.md) bans hand-rolled geometry, and the
`inlineStyleSrc` health metric counts every `style={{ … }}` in `src/components`.
But the count alone can't tell a *legitimate* dynamic inline style (a measured
width, a plotted grid column, a data-driven paint) from a *smell* (a static
literal that belongs in CSS, or a property nobody should set inline). This ADR
records the mechanical rule that draws that line, plus the two policies it
enforces — pre-curried minimal props, and a fixed categorical series palette.

## The dynamic-value rule

An inline `style={{ … }}` in a component is legal **only when its values are
genuinely dynamic** — measured geometry, data-driven placement / proportion /
paint, anchored overlays, columnar table config, or a custom-property bridge.
**A pure static literal inline is always a violation** (it belongs in the
component's CSS class or a curried variant). Depth-2+ composites get *zero*
inline style except a `style={props.style}` passthrough. `svg`/`canvas` interiors
position freely (the SVG coordinate system is their layout engine).

## The rubric categories

Each legitimate inline style falls into one **category**, and each category
admits a fixed set of CSS properties. A component file is mapped in
`scripts/style-rubric.json` to the categories it is allowed to use; the union of
those categories' properties is its allow-list.

| Category | Allowed properties |
|---|---|
| `measured` | width, height, min-width, min-height, max-width, max-height, top, left, transform |
| `plotted` | grid-row, grid-column, top, left, transform, transition |
| `proportion` (aka "Dynamic size") | width, height, flex, flex-basis, transform, clip-path, transition |
| `paint` | background, background-color, color, border-color, opacity, transition |
| `anchored` | top, left, right, bottom, transform |
| `columnar` | width, max-width, min-width, text-align |
| `cssvar` | any `--*` custom property |

When a genuinely-dynamic value's CSS *property* isn't in any category (e.g. a
`font-size` that scales with a ring chart, or a deprecated data-driven `gap`),
the sanctioned move is a **cssvar bridge**: set a `--*` custom property inline
(the `cssvar` category) and consume it from the component's CSS, so the property
itself lives in the stylesheet and only the computed value rides in. We do **not**
widen a category to launder a value. Two conversions of this kind shipped with
this ADR (`RingChart` label sizing → `--ring-*-size`; `SortableList` gap →
`--sui-sortable-gap`, won over the composed Stack's gap via a doubled-class rule).

## The linter (`scripts/style-rubric.mjs`)

A TypeScript-compiler-API walker over `src/components/*.tsx` finds every
`style={{ … }}` object literal and flags: (a) a file that uses one but is absent
from the manifest; (b) a property outside the file's categories (a `--*`
property needs the `cssvar` category); (c) a value that is a pure static literal
(a bare string/number with no identifier / call / interpolation) — except a
literal used as a `??` / `||` fallback, which is allowed but reported as
advisory. A non-object-literal initializer (`style={props.style}`, a ternary
passthrough) is never inspected. The count of (a)+(b)+(c) is the
`styleRubricViolations` health metric, **expected 0** and ratcheted in
`scripts/health-baseline.json`. Bringing the tree to an honest zero required
moving real static-literal stragglers into CSS (AreaFocusGrid static grid rows,
ScenarioDot border-width, SplitQueueList/StaticSplitLayout border-radius,
StatusFlowChart transition) rather than loosening any category.

## Pre-curried, minimal props

Public-facing components are **pre-curried**: client repos never pass raw visual
props (see ADR 0001). A prop that **no shipping consumer configures is dead
surface** and is frozen into CSS / a curried variant rather than exposed — a
prop is a public contract with a testing, documentation, and
don't-break-it cost, and "used" is defined by the production consumer
repos the usage manifest scans (`scripts/usage-manifest.config.json`), not by
tests or showcases. A caller audit against those repos found that the
config-geometry props on ChartCanvas/VirtualTable/RingChart/the pickers/
RangeAmountGroup/SidebarSelector/SortableList and the width configs on StatusChip/CurrencyInput
have **no production configurer**; the ones that were pure frozen defaults
(picker `cellSize`, RangeAmountGroup `breakWidth`, SidebarSelector
`sidebarWidth`/`maxHeight`, VirtualTable `rowHeight`/`overscan`) were removed and
their values baked into CSS. The ones whose inline value is genuinely dynamic
(measured/SVG chart dimensions, data-derived widths) were kept and categorized.

Colours that are **caller/entity-owned identity** (Legend swatch, Dropdown dot,
ScenarioDot/ScenarioGlyph, CandlestickRenderer, SidebarSelector episode colour)
stay as data-driven `paint` — converting them to an internal series index would
break their contract. The series tokens below are the palette callers pass *in*.

## The series-token system (8 slots, fixed order)

Every theme declares `--sui-series-1 … --sui-series-8`: the standard categorical
data-viz palette. Callers colour chart series / legend swatches / category dots
by **series index** (`var(--sui-series-N)`) instead of hardcoding hues. **Eight
slots is the hard cap** — a ninth category is a redesign, not a ninth colour.
The status tokens (`--sui-success` / `--sui-warning` / `--sui-danger`) are
**reserved for meaning and are never a series slot**. Each theme's eight are
tuned to its mood (default vivid, HUD cyan-forward, bronze warm-earth,
colorblind CVD-first) but every set is validated (dataviz `validate_palette.js`)
against that theme's chart surface for an OKLCH lightness band, a chroma floor,
an adjacent-pair CVD floor (min protan/deutan ΔE ≥ 8), and ≥ 3:1 surface
contrast; all shipped sets clear the CVD *target* (≥ 11), so none needs a
secondary-encoding caveat. The colorblind modifier overrides the series with the
CVD-first set when toggled over any base theme.

## Consequences

The accepted cost is a manifest (`style-rubric.json`) that must be kept in sync
when inline styles are added or removed, and a small standing library of cssvar
bridges. In exchange, "is this inline style OK?" stops being a code-review
judgement call and becomes a green/red check, the props surface only grows for
real consumers, and categorical charts are recolour-by-theme with a validated,
accessible palette. Reversing the rubric would return inline-style review to
per-diff argument; reversing the 8-slot cap would reopen the palette to
unvalidated hues. Both are load-bearing.
