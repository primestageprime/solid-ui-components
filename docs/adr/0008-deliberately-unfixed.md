# Deliberately unfixed — do not "fix" these

Several things in this repo look like oversights, unfinished cleanups, or
metrics someone forgot to drive to zero. **They were each evaluated and left
alone on purpose.** Every entry below has already cost someone an
investigation; this ADR exists so it costs nobody a second one.

This is a register, not a rationale — each entry points at the ADR, commit, or
measurement that carries the full argument.

## `inlineStyleSrc` (71) and `inlineStyleShowcases` (20) — leave them

Both metrics are dominated by sanctioned dynamic geometry: values computed at
render time that cannot be expressed as a static class. Retired issue #48
established this. Its *title* said "to zero" and its own *body* disowned that
target — a mismatch that has since drawn at least one agent into trying to
clear them anyway.

These are ratcheted so they cannot **rise**. That is the whole intent. Do not
read a non-zero ceiling as an open task.

## The four remaining `collectionMethodCalls` / `dotChains` hits — floor is 4, not 0

The function-first burn-down (dside `sui` #12291) drives these toward zero, but
four sites are a justified, confirmed exception and must stay native:

| Site | What it is |
|---|---|
| `Chart/Axes.tsx` | `estimateMaxLabelWidth`, `measureMaxLabelWidth` |
| `ScrubChart.tsx` | `yAxisWidth`'s `ticks.reduce` |
| `internal/animation/choreography.ts` | `totalWeight`'s `steps.reduce` |

All are 0-seeded `Math.max`/`Math.min` reduces. `fn`'s combinators have no
seedless-max equivalent, and rewriting them changes behavior on the empty
input.

**A 0-seeded reduce is not automatically in this category.** A 3-field
object-accumulator reduce usually is not: `PivotTreemap.tsx`'s `outerSlots` and
`ProductGrid.tsx`'s `aboveTotals` both summed 0-seeded fields and converted
cleanly to `sum(pluck(...))` / `sum(map(...))`, because `sum([]) === 0` matches
a 0 seed exactly. Check what is actually being reduced.

## Moving `prepare` to `prepack`

Evaluated and rejected — see
[ADR 0007](0007-prepare-keeps-the-build-ci-ignores-scripts.md). Guarded by
`scripts/build-config.test.ts`.

## The `--ignore-scripts` flags in the workflows

Load-bearing, not a leftover. Same ADR 0007, same guard test.

## `sideEffects` in `package.json` / `preserveModules` in `vite.config.ts`

Removing either re-adds ~318 KB to every consumer bundle. See
[ADR 0005](0005-per-module-dist-and-sideeffects.md).

**Both builds set `preserveModules` — the server one is not a copy-paste
mistake.** It was added 2026-08-03; before that `dist/server.js` was a single
bundle and an SSR consumer importing one button shipped 129,330 B instead of
953 B. `scripts/build-config.test.ts` asserts the count is exactly 2, because a
single loose match would be satisfied by either build alone.

## `dist/server/node_modules/@kobalte/…` in the published tarball

Looks like a packaging bug. It is not. The server build inlines Kobalte on
purpose (`ssr.noExternal`, so its JSX is recompiled SSR-safe), and
`preserveModules` necessarily writes those inlined modules to a path mirroring
their source location. npm strips a *root* `node_modules` when packing but not a
nested one covered by `files: ["dist"]` — verified by packing the tarball,
installing it clean, and rendering a component in Node. Delete these and SSR
breaks at import time.

## The KaTeX stub / copy / prepend trio in `vite.config.ts`

Removing any one of the three silently restores ~1.4 MB to `dist/index.css`.
See [ADR 0006](0006-katex-css-fonts-not-inlined.md).

## `OverflowNav.gap` stays `xs|sm`

Its documented scale was narrowed to match the code, not the reverse.
`STYLE_GUIDE.md`'s expansion gate requires a shipped consumer asking for a
value, and none asks for a wider `OverflowNav` gap; its `gapPx()` overflow
budget also only accounts for `xs`/`sm`. That same gate is what justified
widening `Stack`/`Row` in 0.129.0, where two shipped consumers did demand it.

`Sidebar` and `ProportionalStack` are likewise still `xs|sm` — deliberately
left, not overlooked.

## The documented-prop-scale audit is not a ratcheted metric

The 2026-07-31 sweep compared all 51 string-union prop scales in
`COMPONENTS.md` against each component's declared `Props` and fixed five doc
bugs. The audit is scriptable, but wiring it into `health.mjs` gates every
future PR — a policy call, deliberately left open rather than decided by an
agent. Tracked as dside `sui` #12295; do not implement it as a routine cleanup.
