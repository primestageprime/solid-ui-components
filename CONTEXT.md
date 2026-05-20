# solid-ui-components

PrimeStage's SolidJS component library. Defines the architectural vocabulary used to author, compose, and reason about components — distinct from the mockup-drafting vocabulary in [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md).

## Language

### Component layers

**Primitive**:
A Depth-1 component that owns its own CSS file and never imports another Primitive. Splits into two subkinds: **Atomic** and **Layout**.
_Avoid_: Atom, base component, leaf.

**Atomic**:
A Primitive whose job is to render visual content (text, surface, button, icon). Examples: `Text`, `Surface`, `Button`, `Icon`.
_Avoid_: Element, widget.

**Layout**:
A Primitive whose job is to arrange children via flex (no rendered content of its own). Examples: `Stack`, `Row`, `Box`.
_Avoid_: Container, wrapper.

**Composite**:
A Depth-2-or-higher component. Owns zero CSS; composes only curried variants of Primitives (or lower-depth Composites).
_Avoid_: Compound, complex component.

**Depth**:
The composition level of a component. A Primitive is Depth 1. Any component is `1 + max(depth of its children)`. Modules that export multiple components inherit the highest exported depth.
_Avoid_: Level, tier.

### Variants

**Factory**:
A function (`createSurface`, `createText`, `createStack`, …) that takes a fixed set of override props and returns a component pre-configured with them. One Factory per Primitive.
_Avoid_: Builder, constructor.

**Curried Variant**:
A named component produced by calling a Factory with overrides locked in at definition time (e.g. `InteractiveCard = createSurface({ padding: "sm", interactive: true, … })`). Lives in the Primitive's sibling `variants.ts`. Distinct from a runtime `variant="primary"` prop value.
_Avoid_: Variant (ambiguous — can mean a runtime prop value), preset, recipe.

### Props

**Override Prop**:
A prop that configures a Primitive's appearance or layout (`padding`, `radius`, `bg`, `gap`, `direction`, `variant`, `size`, …). Set exactly once, at Factory-call time, never inline at render. Curried Variants strip these from their public type so TypeScript blocks inline overrides.
_Avoid_: Style prop, config prop.

**Data Prop**:
A prop that carries reactive content or callbacks (`children`, `onClick`, `active`, `disabled`, `value`, `onChange`, …). Set per render by the consuming app. The only props a Curried Variant publicly exposes.
_Avoid_: Runtime prop, dynamic prop.

### Authoring & process

**Consumer App**:
A downstream PrimeStage SolidJS app that depends on `solid-ui-components` (currently `jtf-ui`, `taskmaster`, `amygdala-ui`, `amygdala-ui-explore`, `dside-ui`). The library exists to serve them.
_Avoid_: Client app, downstream app.

**Showcase**:
A `dev/showcases/<name>.tsx` file demonstrating a single component's API, its Curried Variants, and usage examples. Registered in `dev/main.tsx`. The library's living documentation surface.
_Avoid_: Demo, story, example.

**Sandbox**:
The ephemeral page-mockup harness at `dev/sandbox.tsx`. Used to draft full-page mockups via `MockBaseline` + the vocabulary in [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md). Not a Showcase — it composes mockups, not single-component demos.
_Avoid_: Playground, scratch.

**Theme**:
A CSS file under `src/themes/` (`default.css`, `hud.css`) that defines all `--sui-*` custom properties. Consumer Apps import exactly one. Components reference Theme variables — never hardcode colors.
_Avoid_: Skin, palette.

**Migration**:
The workflow of extracting a reusable pattern OUT of a Consumer App and INTO `solid-ui-components` as a new Primitive or Composite. Tracked in `TODO.md`'s DONE checklist.
_Avoid_: Extraction, port.

**Adoption**:
The workflow IN a Consumer App of replacing bespoke inline markup WITH library imports. The mirror of Migration. Tracked per-Consumer-App (e.g. the 2026-05-15 `jtf-ui` sweep).
_Avoid_: Integration, rollout.

### Charts

**Slot (chart)**:
A declarative Solid child of `<Chart>` that reads chart context (via `useChart()`) and renders JSX into the chart's SVG. Slots do not own DOM refs that cross their own boundary; cross-slot coordination uses context + signals. The single pointer listener lives on `<Chart>`'s SVG root; interactive slots are config-only consumers of `hoverX` / `dragRange`.
_Avoid_: Layer, child, plugin.

**Descriptor (visual)**:
A closed data object (`{ color: string, shape: Shape, size?: number }`) the consumer produces per datum. The chart slot's render contract is `Descriptor → JSX`. `Shape` is a closed enum (`'circle' | 'chevron' | 'chevron-down' | 'pin' | { path; viewBox? }`); custom paths anchor at geometric center and scale uniformly to `size`.
_Avoid_: Style, render spec.

## Relationships

- A **Composite** is composed of **Primitives** and/or lower-depth **Composites** — never the reverse.
- An **Atomic** and a **Layout** are both **Primitives** and may not import each other or themselves.
- A **Curried Variant** is produced by a **Factory** of exactly one **Primitive**.
- **Migration** moves code from a **Consumer App** into the library; **Adoption** moves library imports into a **Consumer App**. Both reduce inline overrides.
- Every component lives in at most one **Showcase**; every full-page mockup lives in the **Sandbox**.

## Example dialogue

> **Lib author:** "I want a hover-able card with our accent border. Add it as `<HoverCard>` with `padding="md"` and `interactive` baked in."
> **Agent:** "That's a new **Curried Variant** off the `Surface` **Factory** — `createSurface({ padding: 'md', interactive: true, … })` in `Surface/variants.ts`. Since `Surface` is an **Atomic**, `HoverCard` will be **Depth 2** if any **Composite** consumes it."
> **App dev (in jtf-ui):** "Can I just pass `bg="…"` to it for this one screen?"
> **Agent:** "No — `bg` is an **Override Prop**, stripped from the **Curried Variant**'s public type. If the screen needs a different look, that's an **Adoption** signal: add a sibling Curried Variant in the library, then import it. Inline overrides defeat the curry."
> **Lib author:** "And the existing `<Surface variant='accent'>` calls in `jtf-ui` — leave them?"
> **Agent:** "Those are runtime `variant` prop values, distinct from a **Curried Variant**. If they're stable, fold them into a Curried Variant during the next **Migration** pass."

## Flagged ambiguities

- **"variant"** — overloaded between a runtime prop value (e.g. `<Button variant="primary">`) and a **Curried Variant** (a definition-time named component). Resolved: the noun "Variant" in this codebase always means the latter; runtime-prop usage is referred to as a "variant prop value" in prose.
- **"migration" in `TODO.md`** — the file's top header reads "Visual Component Migration" but its checklist mixes **Migration** (extracting into the library) with **Adoption** (replacing inline markup in a Consumer App). Resolved: the two are distinct workflows; future TODO sections should label each accordingly.
