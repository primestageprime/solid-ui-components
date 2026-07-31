# Agent Guide — solid-ui-components

This document is for Claude Code agents and AI assistants working on PrimeStage apps that use this component library.

## The #1 Rule

**Never pass visual/layout props inline. Always use or create curried variants.**

```tsx
// ❌ WRONG — inline styling via component props
<Surface padding="lg" radius="md" bg="#1a1a1a" borderColor="#333">
  <Text size="lg" weight="bold" color="#f59e0b">{score}</Text>
</Surface>

// ✅ RIGHT — use existing curried variants
<ScoreCard>
  <ScoreValue>{score}</ScoreValue>
</ScoreCard>

// If ScoreCard doesn't exist, CREATE it in the library, don't inline the styles
```

## Why?

1. **Consistency:** Every app looks the same because visual decisions live in one place
2. **Maintainability:** Changing a design means updating one variant, not grep-replacing across apps
3. **Type safety:** Curried variants only expose data + callback props — TypeScript prevents inline styling
4. **Readability:** `<InteractiveCard>` communicates intent; `<Surface padding="sm" radius="sm" interactive bg="rgba(0,168,204,0.05)">` is noise

## How It Works

### Component Types: Overrides vs Data

Every component has two kinds of props:

| Category | Examples | When Set | Who Sets |
|----------|----------|----------|----------|
| **Overrides** | `variant`, `size`, `padding`, `bg`, `gap` | Definition time | Library author (in `variants.ts`) |
| **Data** | `children`, `onClick`, `active`, `disabled`, `value` | Render time | App developer |

The factory functions (`createSurface`, `createButton`, `createText`, etc.) accept overrides and return a component that only accepts data props.

### Using Existing Variants

Check `COMPONENTS.md` or the source for available variants. Common ones:

```tsx
// Layout
<Stack>        // vertical, md gap
<Row>          // horizontal, md gap
<SpreadRow>    // horizontal, space-between
<NarrowStack>  // vertical, sm gap

// Surfaces
<InteractiveCard>  // hoverable card
<CompactCard>      // small padding card
<InfoSurface>      // info-colored background

// Text
<TextTitle>    // large, bold
<TextLabel>    // small, uppercase, muted
<TextBody>     // standard body text
<TextValue>    // bold, for data values
<MonoValue>    // monospace, for numbers/code

// Buttons
<PrimaryButton>
<DangerButton>
<GhostButton>
<SmallPrimaryButton>

// Panels
<InfoPanel>
<AccentPanel>
<DangerPanel>
```

### Tables: default to `FilterableTable`

**When rendering a data table, reach for `FilterableTable` by default** — not the
lower-level `BaseTable` — unless the consumer explicitly asks otherwise or the
table genuinely can't use it. `FilterableTable` composes `BaseTable` with the
standard toolbar already laid out correctly: **quick-filter input on the left,
result count on the right** (`X of Y`). Hand-rolling a count/filter toolbar
beside `BaseTable` reinvents this and tends to get the conventional left/right
order backwards.

```tsx
<FilterableTable data={rows} columns={columns} filterPlaceholder="Filter…" compact stickyHeader fill />
```

Legitimate "told otherwise" exceptions (use `BaseTable` directly, or extend
`FilterableTable` first): a table needing a custom multi-key default sort, a
filter scoped to specific columns rather than all of them, or its own
selection/select-all logic that must track the post-filter row set. If you hit
one of these often, that's a signal to enhance `FilterableTable` so it stays the
default — surface it rather than quietly forking to `BaseTable`.

### When a Variant Doesn't Exist

**Do NOT** work around it with inline styles or override props. Instead:

1. **Create the variant** in the library:
   ```tsx
   // In solid-ui-components/src/components/Surface/variants.ts
   export const HabitCard = createSurface({
     padding: "md", radius: "md", interactive: true,
     bg: "rgba(245,158,11,0.05)",
     borderColor: "rgba(245,158,11,0.2)",
   });
   ```

2. **Export it** from `src/index.ts`

3. **Use it** in the app:
   ```tsx
   <HabitCard active={isSelected()}>
     <TextLabel>{habit.name}</TextLabel>
   </HabitCard>
   ```

There is no app-local path (ruled 2026-07-18): apps use curried variants ONLY —
never the `create*` factories. Even a "project-specific" variant is defined in
the library (variants live in one place; a second project wanting it is the
norm, not the exception). If the variant you need is missing, add it to
solid-ui-components and export it — that IS the workflow, not a detour.

## The #2 Rule

**Start with ONE variant and only expand as demanded.**

SUI is a deliberately minimal-set UI library. **Consistency wins over variety.**
When you build or touch a component, ship the single variant/size/token/prop the
real use case needs — not the matrix it *could* support.

```tsx
// ❌ WRONG — speculative spread of sizes/tones nobody asked for
const gaps = { xs, sm, md, lg, xl };          // five gaps, two are used
<Fab size="lg" variant="ghost" tone="warn" /> // props no caller sets

// ✅ RIGHT — one variant, expanded later only when a real consumer demands it
const gaps = { xs, sm };                       // the two that ship
<Fab icon={icon} label={label} />              // the shape one place needs
```

### Why?

1. **Consistency:** a small, fixed set means every app composes from the same
   handful of choices — variety is the enemy of a coherent look.
2. **Dead surface area:** every variant/size/token/prop is a public contract you
   must keep working, test, document, and preserve through every later change.
   Unused ones are pure cost with no consumer.
3. **Changeability:** a narrow surface is easy to evolve; a wide one multiplies
   the states you must not break.

### Enforcement — expansion requires confirmation

**If you expand the set of variants / sizes / tokens / props, you MUST confirm
with Peter first** — explaining *why* you're expanding and *why it's important*.
This is a hard gate, not a suggestion.

**Test-only and showcase-only usage does NOT count as demand.** A showcase that
exercises every size, or a test that asserts on a tone, is not a shipped
consumer. Only a real consumer app that actually renders the new variant in
product justifies the expansion. No real consumer → no expansion.

This applies to creating a **new curried variant** too: the "create the variant
in the library" guidance under [The #1 Rule](#the-1-rule) and
[When a Variant Doesn't Exist](#when-a-variant-doesnt-exist) still presumes a
real caller needs it. Create the variant to serve a shipping consumer — never to
pre-stock the shelf. (See also *Variant Surface: keep it minimal* in
`STYLE_GUIDE.md`.)

### This is why the scales are short

This rule is already load-bearing in the library:

- **`Surface` `padding` / `radius`** were trimmed to **`none` / `sm` / `md`** —
  `md` survived only because it is genuinely load-bearing; the rest were dead
  surface area.
- **`OverflowNav.gap`** stays `xs` / `sm` even though the `Row` it forwards to
  now accepts `md` / `lg`: no shipped caller has asked, and its `gapPx()`
  overflow budget only accounts for the two.

Don't reintroduce a removed value (or add a new one) without a real consumer and
Peter's sign-off.

**But "no shipped caller" is a claim about consumers, not about this repo.**
`Stack` / `Row` gaps were trimmed to `xs` / `sm` on exactly that finding and
restored on 2026-07-31 (0.129.0) when it proved false — `thorcasting-ui` had
forked the primitives into a local inline-style shim rather than lose the
steps, and `jtf-ui` had a `createSurface({ … gap: "md" })` quietly rendering at
8px. Grep the consumer checkouts under `~/gits/primestage/` before removing a
value; note that `jtf-ui` and `thorcasting-ui` live inside `*-workspace/`
directories, so a top-level `*/src` sweep misses them entirely.

## What NOT To Do

### Don't use raw HTML/CSS for things the library handles

```tsx
// ❌ WRONG
<div style={{ display: "flex", gap: "8px", padding: "16px", "border-radius": "8px", background: "#1a1a1a" }}>
  <span style={{ "font-size": "24px", "font-weight": "bold" }}>{value}</span>
</div>

// ✅ RIGHT
<CompactCard>
  <TextValue>{value}</TextValue>
</CompactCard>
```

### Don't override curried variants at render time

```tsx
// ❌ WRONG — defeats the purpose of currying
<PrimaryButton size="lg" variant="danger">Delete</PrimaryButton>

// ✅ RIGHT — use the correct variant
<LargeDangerButton>Delete</LargeDangerButton>
// Or if it doesn't exist, add it to the LIBRARY's variants.ts (never locally):
// export const LargeDangerButton = createButton({ variant: "danger", size: "lg" });
```

### Don't use `style` prop for layout

```tsx
// ❌ WRONG
<Stack style={{ gap: "4px", "max-width": "400px" }}>

// ✅ RIGHT — use (or add to the library) a curried variant
<NarrowTightStack>
```

## Theming

Apps import ONE theme CSS file:

```tsx
import "solid-ui-components/themes/default.css";  // clean neutral
import "solid-ui-components/themes/hud.css";       // sci-fi HUD style
```

All `--sui-*` CSS custom properties come from the theme. Components reference these variables internally. Never hardcode colors — use theme variables or create a new variant with the appropriate semantic color.

## Naming: shapes, not domains

SUI is shared across **all** PrimeStage SolidJS apps. A component name that encodes a domain concept (maritime, engine, ops jargon, PM jargon) misrepresents the shape and discourages adoption from apps in other domains. **The library names *shapes*; consumer apps name *domain concepts*.**

When adding or reviewing a component, surface a rename proposal for any domain-encoded name and prefer a shape-encoded alternative. Don't rename unilaterally — naming wants user input — but flag the smell prominently.

Known offenders already renamed (as of v0.34.0):

| Old | New |
|---|---|
| `VesselCard` | `RemovableItemCard` |
| `VesselCallHeader` | `TitledTimeRangeHeader` |
| `EngineDataSection` | *(removed; inline existing Primitives — see CHANGELOG)* |

Pre-flagged candidates intentionally not yet renamed (raise during the next sweep, decide per-candidate):

- **`Alarm*` family** (`AlarmBands`, `AlarmHotZones`, `AlarmStripeDefs`, `AlarmOverlay`) — stable Chart-monitoring surface; possibly `Threshold*` but weigh churn cost first.
- **`WorkerCard`, `BurndownChart`, `SprintSelector`** — have domain-bound *props* too (`pkStart`/`pkEnd` etc.), so a name-only rename won't de-domain them. That's structural, not just naming.

**Range-typed prop convention:** range-bearing props use `start` / `end` (per `DateTimeRange`, `Chart`, `CompletionTimeline`, `DateRangePicker`). Any new range-typed Primitive should follow suit. (Exception: `WeekCalendar`'s `startAt` is a `"H:MM"` time-of-day string, not an ISO timestamp — intentionally different.)

## Workshop is iteration, not content

`dev/showcases/workshop.tsx` (sidebar-linked, tagged `"workshop"` in `dev/main.tsx`) is an **ephemeral iteration environment** — a scratch surface where components are built before being promoted to a proper Showcase entry. It is *not* a content-type variant; whatever it currently demonstrates is incidental to the iteration stage.

When you finish iterating on something in Workshop:

1. Create a real Showcase entry under `dev/showcases/<component-name>.tsx`.
2. Register it in `dev/main.tsx` with appropriate `tags` (depth, shape, domain).
3. Rewrite or empty `workshop.tsx` for the next iteration.

Don't treat the current `workshop.tsx` content as canonical — it gets replaced as work is promoted out.

## `main` is contended — branch, PR, and tag last

Several sessions and agents work this repo **at the same time**. `main` moves
under you while you work, so anything you decided from a session-start `git log`
is probably stale by the time you're ready to push.

This is not hypothetical. On 2026-07-28 a single session's work finished to find
`origin/main` **39 commits ahead**, with **two** releases (`v0.116.0`,
`v0.117.0`) cut in the meantime. The prepared release commit and tag both
collided with an already-published version; git rejected the tag with *"would
clobber existing tag."*

**Branch before your first commit.** Integrate through `gh pr create`. Never
push local `main` — if you commit to it directly you are guaranteed a diverged
push and a rebase you could have avoided.

**Re-check the remote immediately before choosing a version.** Not at session
start:

```bash
git fetch origin --tags
git show origin/main:package.json | grep '"version"'
```

**Never tag a release on an unmerged branch.** Bump the version inside the PR,
land it, *then* cut the tag. A pushed tag triggers the GitHub Packages publish,
so a colliding tag can clobber another session's published release. Tagging is
the one step with no cheap undo.

If you do end up diverged: don't force-push. Preserve the work on a branch,
`git rebase origin/main`, and expect `CHANGELOG.md` to be the conflict — your
`[Unreleased]` entries against release sections added at the same anchor. Keep
yours under `[Unreleased]`, theirs below.

## Never verify with `npx <tool>` — it can resolve a different package

**`npx biome` is not the linter.** The bare name resolves an unrelated package
called `biome` (v0.3.3) from the registry, which exits 0 having linted nothing.
On 2026-07-29 `@biomejs/biome` was declared in devDependencies and present in
the lockfile but **not installed**, an agent verified its work with `npx biome`
all day, and every "lint clean" it reported was a different tool succeeding at
nothing. Three lint failures reached `main`, and one let a release publish from
a red commit. The first was misdiagnosed as "I ran a narrower command than CI",
and the same mistake was then repeated twice *on that diagnosis* — a wrong root
cause does not merely fail to fix, it explains away the next instances.

**Run the repo's own scripts** — `npm run lint`, `npm run lint:ci`, `npm run
check`. They go through `scripts/lint-ci.mjs`, which resolves the SCOPED package,
verifies the resolved name, and **exits non-zero with instructions if it cannot
find the real thing**. It can never report success without having run.

The general rule, which is the part worth carrying to other repos: **"tool
absent" and "tool ran, all clean" must never be indistinguishable at the call
site.** A missing gate that reports green is strictly worse than no gate — a
repo with no linter is honest about it; a repo whose linter silently isn't there
manufactures confidence. When a check never fails, suspect the checker.

And when you add a gate, demonstrate **three** cases, not two: it passes clean,
it fails on a real error, and **it fails when the tool is made unresolvable**.
The third is the one nobody tests and the one that rots.

## Verifying in a browser: check the viewport before trusting geometry

A tab that has never laid out reports `innerWidth`/`innerHeight` of **0×0**, and
every `getBoundingClientRect()` reading from it is garbage that *looks like
data* — element tops in the hundreds of thousands, siblings that share a row
reported on four different rows. It does not look like an empty result; it looks
like a catastrophic layout regression.

This nearly cost a good release: KPI cards measured on such a tab read as
wildly mis-sized, which would have been escalated as a blocker and reverted a
correct change. The readings were discarded and re-taken on a tab with a real
viewport, where everything was fine.

Before trusting ANY measurement taken through browser automation:

```js
// Assert the tab has actually laid out. 0×0 means it never rendered —
// discard the reading, don't interpret it.
if (innerWidth === 0 || innerHeight === 0) throw new Error("tab never laid out");
```

**The sharpest form of this trap, learned the hard way on 2026-07-29:** a DOM
probe against rAF-scheduled geometry shows *identical* output for a healthy
build and a broken one. Two agents independently measured a component as
"never collapses, content clipped" — one on a genuinely broken version, one on
the fixed version — and the readings were the same, because in a hidden tab the
measurement simply never ran in either. **Forcing a paint is what makes the
numbers change; the fix is what makes them correct once a paint happens.** So a
measurement taken without a forced paint cannot distinguish the two, and is not
evidence about the code at all.

The corollary for automated checks: anything asserting on rAF-scheduled geometry
from a headless or background context **passes vacuously**. If you add a visual
assertion to CI or a harness, force a paint or assert `visibilityState` first,
or it will report success having tested nothing.

Two related traps in the same family:

- **`requestAnimationFrame` is frozen while a tab is hidden.** Anything that
  lands via rAF — which is every measurement written through
  `internal/dom/observeSize` — will not arrive until the tab is next rendered.
  A screenshot or `zoom` capture forces a frame and unblocks it. Code that
  looks broken under automation is often just waiting for a frame that never
  comes.
- **Group measurements by their row before comparing them.** Cards in a
  responsive grid that has collapsed to one column are each on their own row,
  and comparing their heights as if they shared one reports a phantom raggedness.
  Compare like with like, keyed on `getBoundingClientRect().top`.

## Summary

| Situation | Action |
|-----------|--------|
| Need a specific visual config | Check if a curried variant exists → use it |
| No variant exists, need is common | Create variant in solid-ui-components library |
| No variant exists, need is app-specific | Create local variant using factory function |
| Need to pass data/callbacks | Pass them as props to the curried variant |
| Need to pass visual overrides | **STOP** — create a variant instead |
| Adding a new component | Name it after the *shape*, not the domain |
| Iterating on a new component | Build in Workshop, then promote to its own Showcase entry |
| Starting any work | Branch first — never commit to `main` |
| Picking a release version | `git fetch origin --tags` first; the number you remember is stale |
| Cutting a tag | Only after the PR merges — never on an unmerged branch |
