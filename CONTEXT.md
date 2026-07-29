# solid-ui-components

PrimeStage's SolidJS component library. Defines the architectural vocabulary used to author, compose, and reason about components — distinct from the mockup-drafting vocabulary in [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md).

## Language

### Component layers

**Primitive**:
A Depth-1 component that owns its own CSS file and never imports another Primitive *component*. (Data and type imports from another Primitive's directory — e.g. `ICON_PATHS`, type re-exports, render helpers — don't count: the rule is about composition, not module boundaries.) Splits into three subkinds: **Atomic**, **Layout**, and **Structural**.
The CSS-file requirement applies only when the Primitive has visual styling of its own to express. A Primitive whose entire job is wrapping a pure formatting function in a bare `<span>` — no class, no inline style, typography inherited from the parent — may omit the CSS file: there is no styling to own. `Duration` (renders `ms → "12.3s"`-style text via a 4-branch format) is the canonical example. The rule exists to enforce single-place ownership of visual styling; if there is no styling, the rule has nothing to enforce.
_Avoid_: Atom, base component, leaf.

**Atomic**:
A Primitive whose job is to render visual content (text, surface, button, icon). Examples: `Text`, `Surface`, `Button`, `Icon`.
_Avoid_: Element, widget.

**Layout**:
A Primitive whose job is to arrange children via flex (no rendered content of its own). Examples: `Stack`, `Row`, `Box`.
_Avoid_: Container, wrapper.

**Structural**:
A Primitive that renders chart/SVG geometry — axes, grids, series, bands, edges — rather than visual content or child arrangement. Owns CSS only for stroke/fill/typography hooks; geometry values flow through props, because SVG geometry attributes can't resolve `var()`. Examples: `Chart/Axes`, `Chart/Grid`, `AlarmBands`, `Sparkline`, `DagChart`.
_Avoid_: Renderer, fragment.

**Composite**:
A Depth-2-or-higher component. Owns zero CSS files AND zero inline `style={}` except `style={props.style}` passthrough; composes only curried variants of Primitives (or lower-depth Composites). All visual styling lives in Primitives — Composites express structure and pass Data Props.
_Avoid_: Compound, complex component.

**Depth**:
The composition level of a component. A Primitive is Depth 1. Any component is `1 + max(depth of its children)`. Modules that export multiple components inherit the highest exported depth.
_Avoid_: Level, tier.

**Kobalte-wrapping Primitive**:
A Primitive whose implementation wraps a headless third-party primitive (today: `@kobalte/core/*` — `Combobox`, `Select`, `Tooltip`, `Toast`, `NumberField`, `Popover`) plus theme CSS. Such a wrapper is an **Atomic Primitive** even though it composes a "component" from another library: the third-party primitive is treated as the same kind of external dependency that the DOM is, not as a library Primitive subject to the no-sibling-imports rule. The wrapper must still own its own CSS file and must not import any sibling library Primitive. Private helpers inside the wrapper's directory (e.g. `DateRangePicker/CalendarGrid.tsx`) are allowed and do not count as Composite-style composition — they are implementation details of the single Primitive that the directory exports.
_Avoid_: Composite (incorrect — the third-party primitive is a dependency, not a library Primitive).

### Variants

**Factory**:
A function (`createSurface`, `createText`, `createStack`, …) that takes a fixed set of override props and returns a component pre-configured with them. One Factory per Primitive.
_Avoid_: Builder, constructor.

**Curried Variant**:
A named component produced by calling a Factory with overrides locked in at definition time (e.g. `InteractiveCard = createSurface({ padding: "sm", interactive: true, … })`). Library-side Curried Variants live in the Primitive's sibling `variants.ts` and are exported from `src/index.ts`; **Local Curried Variants** live in a Consumer App. Distinct from a runtime `variant="primary"` prop value.
_Avoid_: Variant (ambiguous — can mean a runtime prop value), preset, recipe.

**Local Curried Variant**:
A Curried Variant defined in a Consumer App's own `src/components/variants.ts` rather than in the library, using library Factory functions. Acceptable when the variant is genuinely app-specific. Promoting one into the library (so other Consumer Apps can use it) is a **Migration**.
_Avoid_: App variant, custom variant.

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
The ephemeral page-mockup harness at `dev/sandbox.tsx`. Used to draft full-page mockups via **MockBaseline** + the vocabulary in [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md). Not a Showcase — it composes mockups, not single-component demos.
_Avoid_: Playground, scratch.

**MockBaseline**:
The canonical two-pane scaffold every **Sandbox** step starts from (`dev/sandbox-steps/MockBaseline.tsx`). Wraps `PageCanvas` around a `DelineatedSidebar` + `SimplePanel` detail region, with `sidebar` and `detail` props for populated content and `sidebarEmpty` / `detailEmpty` props for hint strings. Its two regions — *sidebar region* and *detail region* — are the spatial vocabulary used in `DESIGN_LANGUAGE.md` phrases like "drop a `QuickFilter` into the sidebar region."
_Avoid_: scaffold, frame, "the slots."

**Manifest**:
The single-file index `COMPONENTS.md` that lists every exported component with its key props, depth, and "use for" guidance. The flat consumer-facing reference, distinct from the interactive **Showcase** surface and the page-mockup **Sandbox**. Updated whenever a new component or **Curried Variant** is exported.
_Avoid_: Catalog, API doc, README.

**Workshop**:
The scratch surface where in-progress components are built and exercised before they have a stable API. Two flavors: the **master workshop** (`dev/showcases/workshop.tsx`, id `"workshop"`, surfaced via the dedicated sidebar link) and an arbitrary number of **Benches**. All are tagged `"workshop"` in `dev/main.tsx` so they're filtered out of the depth-grouped list. Contents are deliberately throwaway — a workshop surface gets rewritten or deleted as components are **Promoted** out of it.
_Avoid_: Playground, scratch, draft.

**Bench**:
A standalone workshop file under `dev/showcases/workshop/<slug>.tsx`, auto-discovered by `dev/main.tsx` (via `import.meta.glob`) and surfaced as its own row beneath the master **Workshop** link. Each Bench default-exports a `Component` and may `export const meta = { label?, order? }`. Because every Bench is its own file with no shared registration block, multiple agents can prototype different components simultaneously without clobbering each other. Spun up and torn down via the `/workshop` skill (`scripts/workshop-{new,list,remove}.mjs`). A Bench is the per-agent counterpart to the single shared master **Workshop**.
_Avoid_: Slot, tab, scratch file.

**Promotion**:
The workflow of moving a component from **Workshop** into a stable **Showcase** once its API has settled, including its **Manifest** entry and `src/index.ts` export. Mirrors the **Migration** / **Adoption** pair in shape: each names a directional movement between two surfaces.
_Avoid_: Graduation, finalization.

**Theme**:
A CSS file under `src/themes/` (`default.css`, `hud.css`) that defines all `--sui-*` **Tokens**. Consumer Apps import exactly one. Components reference Tokens — never hardcode colors.
_Avoid_: Skin, palette.

**Token**:
A `--sui-*` CSS custom property defined in a **Theme**. Tokens cover colors, spacing (the `--sui-space-*` 4px-base scale), radii, typography, and other visual primitives. Components reference Tokens only — never hardcoded colors or off-scale pixel values. Consumer Apps may add custom themes by defining their own `--sui-*` values.
_Avoid_: theme variable, CSS custom property (verbose).

**Migration**:
The workflow of extracting a reusable pattern OUT of a Consumer App and INTO `solid-ui-components` as a new Primitive or Composite. Tracked in GitHub Issues (see `docs/agents/issue-tracker.md`); the 2026-05 migration sweep is recorded in `CHANGELOG.md` and git history.
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
- **Promotion** moves a component from the **Workshop** to a stable **Showcase** + **Manifest** entry + `src/index.ts` export once its API has settled.
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
- **"migration" vs "adoption"** — the retired `TODO.md` was headed "Visual Component Migration" but mixed **Migration** (extracting a pattern into the library) with **Adoption** (replacing inline markup in a Consumer App). Resolved: they are distinct workflows and must be labelled as such. Worth knowing because the conflation also misattributed work — an item filed as a consumer change turned out to be blocked in SUI itself (issue #69).
- **"slot"** — unqualified "slot" in this codebase means the chart **Slot** (a context-aware Solid child of `<Chart>`). The `sidebar` / `detail` JSX props on `MockBaseline` are *regions*, not slots — that wording is reserved for the chart concept to avoid confusion.
- **"inline style on Composites"** — Composites own zero CSS *files* AND zero inline `style={}`. The only exception is `style={props.style}` passthrough (forwarding the consumer's `style` prop). Three failure modes the rule addresses:
  - **Static styling inlined as a shortcut** (e.g. `<Foo style={{ "font-weight": 600, padding: "8px" }}>`) — must be a **Curried Variant**.
  - **Stateful visual units** (e.g. `<div style={cardStyle()}>` where the style is derived from `selected`/`met` flags) — must be a new **Primitive** with `data-*` attributes and CSS selectors keyed on those attributes.
  - **Truly dynamic per-instance values** (e.g. a `color` derived from data) — flow as a **Data Prop** to a Primitive that owns the styling rule. Inline `style={}` for a data-driven attribute is fine *inside* a Primitive (the Primitive owns the rule); it is not fine *on* a Composite.
