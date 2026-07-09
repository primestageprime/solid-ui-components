# SUI Best Practices

The general expectations for how components in `solid-ui-components` (SUI)
work. This is the distilled version — the rules you should be able to recite.
Each section links to the doc that owns the full detail:
[`CONTEXT.md`](../CONTEXT.md) for vocabulary, [`STYLE_GUIDE.md`](../STYLE_GUIDE.md)
for architecture, [`AGENT_GUIDE.md`](../AGENT_GUIDE.md) for agent workflow,
[`docs/adr/`](./adr/) for the decisions behind the rules.

## 1. Two layers: Primitives and Composites

Every component is either a **Primitive** (Depth 1) or a **Composite**
(Depth 2+).

- A **Primitive** owns its own CSS file and never imports another library
  Primitive. It comes in two subkinds: **Atomic** (renders content — `Text`,
  `Surface`, `Button`, `Icon`) and **Layout** (arranges children via flex —
  `Stack`, `Row`, `Box`). Wrapping a headless third-party primitive
  (Kobalte) still counts as a Primitive: the dependency is external, like
  the DOM.
- A **Composite** owns **zero CSS files and zero inline `style={}`** (the
  one exception is `style={props.style}` passthrough). It composes curried
  variants of Primitives or lower-depth Composites, and expresses only
  structure and data flow.

Depth is `1 + max(depth of children)`. A module exporting several components
inherits its highest export's depth. Composition only flows downward — a
Primitive never renders a Composite.

**Expectation:** all visual styling lives in Primitives. If you're about to
put a style rule anywhere else, you're about to break the architecture.

## 2. Curried Variants, not inline overrides

Visual configuration is decided **once, at definition time**, by calling a
Primitive's **Factory** (`createSurface`, `createText`, `createStack`, …)
with **Override Props** locked in:

```tsx
// In Surface/variants.ts
export const CrewCard = createSurface({
  padding: "sm", radius: "sm", interactive: true,
});

// At render time — Data Props only
<CrewCard active={isSelected()}>
  <TextLabel>{crewMember.name}</TextLabel>
</CrewCard>
```

The curried component's public type strips Override Props, so TypeScript —
not code review — blocks `<CrewCard padding="md">`. This is the library's
load-bearing decision; see
[ADR 0001](./adr/0001-curried-variants-over-runtime-variant-props.md).

**Expectation:** never pass a visual/layout prop at render time. If the look
you need has no Curried Variant, create one — in the library's `variants.ts`
if a shipping consumer app needs it, or as a Local Curried Variant in the
app's own `variants.ts` if it's genuinely app-specific. Either way the
config lives in one named place, not scattered across JSX.

## 3. Override Props vs Data Props

Every prop belongs to exactly one category:

| Category | Examples | Set when | Set by |
|---|---|---|---|
| **Override** | `padding`, `radius`, `bg`, `gap`, `size`, `variant` | Definition time | The Factory call in `variants.ts` |
| **Data** | `children`, `onClick`, `value`, `active`, `disabled` | Render time | The consuming app |

A truly dynamic per-instance visual value (say, a status color derived from
data) flows as a **Data Prop** into a Primitive that owns the styling rule.
Inline `style={}` for a data-driven attribute is fine *inside* a Primitive;
it is never fine *on* a Composite.

## 4. Minimal variant surface — expansion is gated

Ship the single variant/size/prop the real caller needs, not the matrix the
component *could* support. Every exported option is a public contract you
must keep working forever; unused ones are pure cost.

- Start from a real consumer. `Fab({ icon, label })`, not
  `Fab({ icon, label, size, variant, anchor, offset })`.
- Showcase-only or test-only usage is **not** demand. Only a consumer app
  that renders the variant in product justifies it.
- Expanding the set of variants, sizes, tokens, or props **requires
  confirming with Peter first** — why, and why it matters. This is a hard
  gate. It's the reason `Stack`/`Row` gaps are just `xs`/`sm` and `Surface`
  padding/radius is `none`/`sm`/`md`.

## 5. Tokens and theming

All visual primitives — colors, spacing (the `--sui-space-*` 4px-base
scale), radii, typography — are `--sui-*` **Tokens** defined in a **Theme**
(`src/themes/default.css`, `hud.css`, `bronze.css`, …). Components reference
Tokens only; never hardcode a color or an off-scale pixel value. Consumer
apps import exactly one theme (which pulls in `_baseline.css`) plus
`index.css` — the full import contract is in the
[README](../README.md#consuming-the-css-import-contract).

## 6. Name shapes, not domains

SUI serves every PrimeStage app, so component names describe the *shape*
(`RemovableItemCard`, `TitledTimeRangeHeader`), never a domain concept
(`VesselCard`, `EngineDataSection`). Consumer apps supply the domain names.
Range-typed props are `start` / `end`. If you spot a domain-encoded name,
flag it for rename — don't rename unilaterally.

## 7. Component lifecycle: Workshop → Showcase → Manifest

- New components are drafted in the **Workshop**
  (`dev/showcases/workshop.tsx`, or a per-agent **Bench** under
  `dev/showcases/workshop/`). Workshop content is throwaway.
- Once the API settles, **Promotion**: a dedicated **Showcase**
  (`dev/showcases/<name>.tsx`, registered in `dev/main.tsx`), an export from
  `src/index.ts`, and an entry in the **Manifest** (`COMPONENTS.md`).
- Full-page mockups live in the **Sandbox** (`dev/sandbox.tsx`), composed
  from curried components only, using the phrase vocabulary in
  [`DESIGN_LANGUAGE.md`](../DESIGN_LANGUAGE.md).

Patterns move between the library and its consumers in two named
directions: **Migration** extracts a reusable pattern out of a consumer app
into SUI; **Adoption** replaces bespoke markup in a consumer app with
library imports.

## 8. Charts: d3 is math only, Solid owns the DOM

Chart children are **Slots** — declarative Solid components that read scales
and state from `useChart()` and return JSX. `d3-scale` is the only d3 peer
dependency; `d3-selection` (and, for now, `d3-shape`) are excluded because
Solid is the single owner of every rendered element. Per-datum visuals flow
as closed **Descriptor** objects (`{ color, shape, size? }`). See
[ADR 0002](./adr/0002-charts-d3-scale-no-selection.md).

## 9. Solid idioms

Components follow SolidJS reactivity rules — the compiler won't save you:

- **Never destructure props** — it severs reactivity. Use `splitProps` to
  separate locally-handled props from passthrough, and `mergeProps` for
  defaults (see `Surface.tsx` for the canonical shape).
- Conditional rendering via `<Show>`, lists via `<For>`, variant selection
  via `Dynamic` + a lookup map.
- State-driven styling in a Primitive keys CSS selectors on `data-*`
  attributes (`active` flag → `data-active` → `[data-active] { … }`), so the
  Composite passes a boolean, never a style.

## 10. Quality bar

After every change:

1. `npx tsc --noEmit` — zero errors.
2. `npx vite build` — succeeds.
3. Promoted components have a Showcase and a Manifest entry.
4. `npm run audit:styles` stays clean — repeated inline styles are variant
   candidates, not a style to live with.

## Quick reference

| Situation | Do |
|---|---|
| Need a visual config | Use the existing Curried Variant |
| No variant exists, shared need | Add one to the library's `variants.ts` + `src/index.ts` |
| No variant exists, app-specific | Local Curried Variant in the app's `variants.ts` |
| Tempted to pass `padding`/`bg`/`gap` inline | Stop — that's a new variant |
| Data-driven visual value | Data Prop into a Primitive that owns the rule |
| Adding sizes/tokens/props | Confirm with Peter first; real consumer required |
| Rendering a data table | `FilterableTable` by default, not `BaseTable` |
| Naming a component | The shape, never the domain |
| New component | Workshop → Promotion → Showcase + Manifest |
