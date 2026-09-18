---
name: sui-build
description: Use when a workshop bench has settled and should be broken down into reusable SUI components — for "/sui-build <bench>", "break the hourly board into components", "decompose this bench", "extract the components from the workshop". Inventories the bench, classifies every bench-local piece (already SUI / extract to SUI / stays in the consumer), gets Peter's confirmation for each new component, then extracts each one with a barrel export, a showcase, a test that mounts it, a depth header and a COMPONENTS.md entry, rewires the bench onto the barrel, and writes a consumer handoff.
---

# Build a bench into SUI components

A **Bench** (`dev/showcases/workshop/<slug>.tsx`) is where a whole screen gets
composed and argued over. Once it settles, the reusable pieces inside it have to
become real SUI components, and the screen itself has to become something a
**Consumer App** can rebuild from those components. `/sui-build` does both.

It sits between the other two build-loop skills:

> `/workshop <name>` → iterate on the bench → **`/sui-build <bench>`** → `/promote` or `/ship` to release.

`/promote` graduates ONE component that already lives in `src/components/`.
`/sui-build` starts from a whole bench, decides which pieces are components at
all, extracts them, and leaves the bench as the reference composition.

## Read before starting

- `AGENT_GUIDE.md` § *The #2 Rule* and § *The push-back protocol*. Every new
  component or variant needs a named consumer and Peter's confirmation. **A
  bench, a showcase or a test is not a consumer.**
- `AGENT_GUIDE.md` § *The health ratchet will fail you*. A new component
  without a showcase, a depth header, a mounting test or a `COMPONENTS.md`
  mention fails `health`.
- `CONTEXT.md` for the vocabulary (Primitive / Composite / Depth / Curried
  Variant / Override vs Data Prop) and `STYLE_GUIDE.md` → *Depth Rules*.
- `docs/adr/0008-deliberately-unfixed.md` before touching any metric.

## Step 1 — Inventory the bench

Read the whole bench and any model or formatter modules beside it
(`<slug>-model.ts`, `<slug>-money.ts`, …). Write one row per REGION of the
screen and one row per bench-local thing: a local `Component`, a module-level
curry, a helper that renders or measures, or a stateful pattern such as a
memo-plus-signal pair.

| Region / piece | What it is | SUI it already uses | Bench-local code |
|---|---|---|---|

## Step 2 — Classify every bench-local piece

Each piece gets exactly one of three verdicts:

1. **Already SUI.** It composes existing components with data and callbacks
   only. Nothing to extract; name the components in the handoff.
2. **Extract to SUI.** It is a SHAPE that a second screen would draw the same
   way, and at least one Consumer App screen will render it. Name it by shape,
   not by domain (`AGENT_GUIDE.md` § *Naming: shapes, not domains*):
   `MutationToolbar`, not `HourlyChangesBar`.
3. **Stays in the consumer.** Domain vocabulary, fixture data, formatters that
   carry the domain's words, and the model that turns the consumer's records
   into the component's data. Formatters that name a domain unit (`$/wk`,
   `Hrs/wk`) and curries that fix a domain's axes both land here. They go into
   the handoff as adapter work.

Search for an existing component before you rule "extract". Search by STATE
MODEL, not by the name you imagined. `COMPONENTS.md`, `src/index.ts` and
`dev/main.tsx` together are the catalog. A piece that an existing component
covers with one new prop is a **prop expansion**, and it goes through the same
gate as a new component.

## Step 3 — The push-back gate (hard stop)

Present ONE table to Peter covering every "extract" verdict, then wait:

| Proposed | Depth | Consumer (app + screen) | What no existing component does | Why a variant can't |
|---|---|---|---|---|

Use `AskUserQuestion` with `multiSelect: true`, one option per proposed
component, so Peter can approve a subset in one answer. Extract only what he
approves. Rejected pieces stay on the bench, and the handoff names the SUI
components the consumer composes instead.

## Step 4 — Extract each approved component

One component at a time, fully finished before the next:

1. **Folder.** `src/components/<Name>/` containing `<Name>.tsx`, `index.ts`,
   `types.ts` if the props are large, and a pure helper module for any logic.
   Pure logic gets its own `.ts` and its own test: no Solid, no DOM.
2. **Depth header.** The first comment states `<Name> — Composite (Depth N)`
   or `Primitive (Depth 1)`. Depth is `1 + max(depth of what it renders)`.
   `missingDepthHeaders` matches `/Depth [0-9]/` literally.
3. **No CSS on a Composite.** Zero CSS files and zero inline `style={}` beyond a
   `style={props.style}` passthrough. If a piece needs its own styling, split
   out a Primitive for it and get that confirmed too.
4. **Data props only at the call site.** Presentational decisions go in an
   `Overrides` type and a `create<Name>` factory, following `createButton` and
   `createRateGauge`. Ship a curried variant only when a real consumer needs
   that exact configuration. Otherwise export the factory and let the consumer
   curry once, the way the benches curry `createPairedMutationSliders`.
5. **Barrel.** `export * from "./<Name>"` in the folder's `index.ts`, and
   `export * from "./components/<Name>";` in `src/index.ts` near its relatives.
   Import the component back through the package barrel in the bench, as a
   client would, and confirm `npm run bundle-budget -- --skip-build` shows no
   contamination if the component imports anything heavy.
6. **Test that mounts it.** `<Name>.test.tsx` renders it as JSX, which
   `componentsNeverRendered` counts, and asserts its behaviour: data in, DOM
   and callbacks out. Use `src/test-utils/` rather than a hand-rolled DOM
   double.
7. **Showcase.** `dev/showcases/<kebab-name>.tsx` exporting `<Name>Showcase`,
   in the `.component-section` / `.example-group` idiom (copy
   `dev/showcases/rate-gauge.tsx`). Wire every callback to working state so the
   demo proves the drop-in. Geometry goes in `dev/main.css` under a
   `.<kebab-name>-demo` class, never an inline `style={{}}`
   (`showcaseStyleRubricViolations` is ratcheted at 0).
8. **Catalog.** Import the showcase in `dev/main.tsx` and add an `items` entry
   with `tags: ["depth:N", "<shape>", …]`.
9. **Manifest.** Add the component to `COMPONENTS.md` under its depth: name,
   depth, key props, factory and variants, one usage example, and "use for".
10. **CHANGELOG.** One `### Added` line under `[Unreleased]`.

## Step 5 — Rewire the bench

Replace each extracted piece on the bench with the component, imported from
`../../../src` (the package barrel). The bench must render what it rendered
before. It stays as the **reference composition**: the one place the whole
screen is wired together, and the thing the handoff points the consumer at.
Do not delete it. `/promote` deletes benches, `/sui-build` does not.

## Step 6 — Gates

All must pass, and the pre-existing failures must be separated from yours:

```bash
npm run typecheck:dev        # what CI runs; plain `typecheck` skips dev/
npm test                     # compare any failure against a clean checkout
npm run health               # lower a ceiling your work improved:
                             #   npm run health -- --update-baseline
npm run build
```

When `npm test` fails, check the failing files against a clean worktree
(`git worktree add --detach <tmp> HEAD`) before blaming or fixing anything.
Report pre-existing failures as pre-existing.

## Step 7 — The consumer handoff

Write `docs/handoffs/<consumer>-<bench-slug>.md` (the format of
`docs/handoffs/chart-line-labels.md`). It must let an agent in the consumer
repo build the screen without reading the bench first:

1. **What to build**, in one paragraph, with the bench's nav id so they can
   look at it (`npm run dev` → `workshop:<slug>`).
2. **The SUI components per region.** A table of region → component → the
   props it needs, and the SUI version that first exports each one.
3. **The model.** The rules the bench's model encodes, stated as rules, and
   the pure functions worth porting. Point at the model file and its tests.
4. **The mapping onto the consumer's own data.** Read the consumer repo first
   (its `CLAUDE.md`, `CONTEXT.md`, the nearest existing screen of the same
   kind). Say which of the consumer's records each model concept becomes, and
   copy the consumer's own precedent where one exists.
5. **Assumptions**, each marked either *ruled by Peter* (with date and quote)
   or *assumed here*, so the consumer knows which ones to confirm.
6. **What stays in the consumer**: formatters, curries, stores, adapters.
7. **Known gaps**: things SUI still lacks, as TODOs the consumer should leave
   in place rather than hand-roll.

## Git discipline

This checkout is shared. Branch before the first commit, stage only the paths
you touched, never `git add -A`, never `stash`, never `--amend`. Integrate
through `gh pr create`. Releasing is `/ship`'s job, so do not bump the version
or tag from here unless Peter asks.

## Done when

- Every approved component has a folder, depth header, mounting test,
  showcase, catalog entry, barrel export, `COMPONENTS.md` entry and
  CHANGELOG line.
- The bench renders the same screen through the barrel.
- typecheck:dev, test (bar pre-existing failures), health and build all pass.
- The handoff is written, and the summary to Peter lists what was extracted,
  what was rejected or kept local, and the assumptions the consumer must
  confirm.
