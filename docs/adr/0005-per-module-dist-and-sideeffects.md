# Per-module dist + `sideEffects`: how SUI stays tree-shakeable

SUI ships 144 components behind one barrel entry. Two of them pull heavyweight
third-party libraries — `MathFormula` needs KaTeX (~227 KB minified), `DagChart`
needs `d3-dag` (~63 KB, including an inlined web-worker blob). Until this ADR,
**every consumer paid for both, whether or not they rendered either component.**

A consumer importing a single `DefaultButton` shipped **332,999 bytes**, of
which **318 KB was libraries the button never calls**.

## The decision

The client build emits **one file per source module**
(`output.preserveModules`), and the package **declares its side effects**
(`"sideEffects": ["**/*.css"]`).

That combination takes the same one-button import to **14,938 bytes** — a 96%
reduction — with no source changes and no behavioral change.

## Why it has to be both (the important part)

**Each setting is completely inert on its own.** This is the whole reason this
ADR exists, because it makes both settings look like dead config to anyone
auditing them individually:

| Configuration | One-button consumer bundle |
|---|---|
| Neither (as originally shipped) | 332,999 B |
| `sideEffects` only | 332,999 B — *no change* |
| `preserveModules` only | 333,005 B — *no change* |
| **Both** | **14,938 B** |

- **`sideEffects` alone does nothing** because the dist was a single bundled
  `index.js`. `sideEffects` operates at *module* granularity — it tells a
  bundler "this file is inert, delete it if unused." With one module, and that
  module obviously used, there is nothing for the flag to act on.
- **`preserveModules` alone does nothing** because splitting the dist into 465
  module files doesn't help if the bundler must still *evaluate* each one to
  find out whether it matters. Absent a `sideEffects` declaration, it must.

Together: modules are separable **and** declared inert, so a consumer's bundler
deletes the unused ones outright — and a deleted `MathFormula.js` takes its
`import katex from "katex"` with it.

## Why tree-shaking couldn't do this unaided

Rollup's shaking was always working *at the component level* — verified by
grepping a one-button bundle and finding only `sui-btn` classes, none of the
other 143 components. The leak was never SUI's own code.

It was the third-party imports. `katex` and `d3-dag` **declare no `sideEffects`
in their own `package.json`** (verified: `undefined`). A bundler must therefore
assume that merely evaluating them does something observable, so it keeps the
`import` statement even after correctly discarding the only component that used
the binding. From inside a single-file dist there is no way to reach that
decision — the import is structurally unremovable.

## Alternative considered and rejected: dynamic `import()`

The first fix attempted was making the heavy imports lazy — `await
import("katex")` inside `MathFormula`, so it became an async chunk. It worked,
but it is **strictly worse** and was reverted before merge:

| | Dynamic import | Per-module + sideEffects |
|---|---|---|
| One-button consumer | 105,980 B | **14,938 B** |
| Solves `d3-dag` too | No — needs its own refactor | **Yes, free** |
| Render timing | **Async** — component paints a frame late | Unchanged |
| Source changes | Component rewrite + test rewrites | **None** |

The async render was the disqualifier. `MathFormula`'s own cost was invisible
(an empty div for one microtask), but the same treatment for `DagChart` would
have meant converting a synchronous `createMemo(() => computeLayout(...))` into
a `createResource`, with the chart mounting at 0×0 and popping into place — a
visible regression for the consumers who actually use it. Under this ADR,
`DagChart` needs no changes at all and non-users still stop paying for
`d3-dag`.

## Who this affects

Checked against `docs/usage-manifest.json`:

- **`jtf-ui` uses KaTeX**, transitively. It imports `createFormulaPanel`
  (`src/lib/formulaPanels.ts:71,72`), a factory in
  `DataDisplay/FormulaDecomposition.tsx`, which imports `MathFormula`. **Nothing
  in jtf-ui ever spells `MathFormula`** — searching the manifest for the
  component's own name returns zero hits and is the wrong instrument. When
  assessing whether a component is "unused," trace the factories that wrap it.
- Every other consumer (`amygdala-ui`, `dside-ui`, `goose-ui`,
  `thorcasting-ui`, `dside-work`) touches neither heavy component and gets the
  full reduction.

## The server build had the same hole for two ADRs (fixed 2026-08-03)

Everything above was applied to the **client** build only. `dist/server.js` —
what the `"node"` export condition resolves to, i.e. what every SolidStart/SSR
consumer actually imports — stayed a single 1,305,549-byte bundle with no
`preserveModules`.

It therefore reproduced this ADR's defect exactly. An SSR consumer importing one
`DefaultButton`:

| | SSR one-button bundle |
|---|---|
| single `dist/server.js` | 129,330 B |
| per-module `dist/server/` | **953 B** |

Rollup *did* shake the single bundle from 1.3 MB down to 129 KB — enough to look
like tree-shaking was working, which is probably why it went unnoticed. What it
could not remove was the same category of thing described above:

- **inlined Kobalte** — popper and tooltip machinery (plus `@floating-ui/dom`)
  in a bundle whose only component was a plain button. The server build inlines
  Kobalte deliberately (`ssr.noExternal`, so its JSX recompiles SSR-safe), which
  means Kobalte lands *inside* the bundle and needs module granularity to leave.
- **bare `import "d3-dag"; import "katex";`** — surviving verbatim with no
  bound identifier, the exact structurally-unremovable import this ADR is about.
  Externals, so not bundled bytes, but still loaded at Node startup.

The fix is the same setting, plus repointing the export:

```
output: { preserveModules: true, preserveModulesRoot: "src",
          entryFileNames: "server/[name].js" }
exports["."].node: "./dist/server/index.js"   // was ./dist/server.js
```

Verified end-to-end, not just by bundle size: `npm pack` → install the tarball
into a clean project → `renderToString` a real component in Node returns correct
markup. That check matters because per-module output writes Kobalte to
`dist/server/node_modules/@kobalte/…`, and npm strips `node_modules` when
packing a package *root* — it does **not** strip a nested one covered by
`files: ["dist"]`. All 49 files survive; SSR renders.

The export surface is unchanged at 726 names. (`Stack` and `Row` are absent from
both the old and new server bundles — that is the deliberate "curried variants
only" rule, not a packaging regression. Don't chase it.)

## Costs accepted

- **`dist` goes from ~10 files to ~1,300** (465 JS + declarations). Slower
  publish and install, more inodes. Judged worth 318 KB per consumer. The
  per-module server build adds a further 456 files under `dist/server/`.
- **The `exports` map still gates deep imports** — the per-module files are
  physically present but not addressable, so this does not widen the public API.
- **CSS is unaffected and still all-or-nothing.** A consumer importing one
  component still gets every component's styles. Declaring `**/*.css`
  side-effectful is what keeps those imports alive (a bare `false` would ship
  unstyled components). Splitting CSS per component is a separate, unsolved
  problem.

  `dist/index.css` is **388,337 B raw / 91,308 B gzip / 71,304 B brotli**
  (measured 2026-08-03). The "~1.8 MB" this ADR originally quoted predates
  [ADR 0006](0006-katex-css-fonts-not-inlined.md), which took the inlined KaTeX
  fonts out — do not cite the old figure.

  This is now **the dominant per-consumer cost by a wide margin**: the one-button
  consumer pays 15 KB of JS and 388 KB of CSS. Any further bundle-size work on
  this package should start here, not in the JS.

## The package also ships `src/`, and consumers must not read that as "linked"

`files` is `["dist", "src"]` — `src/` became part of the published package in
`ef99119`, first released in **v0.126.0**. That is deliberate: the `exports` map
carries `"source": "./src/index.ts"` entries, and shipping `src` is what lets a
consumer opt into source mode via the `source` resolve condition.

**The consequence caught a consumer.** thorcasting-ui detected "SUI is
npm-linked for local development" with
`existsSync("node_modules/@primestageprime/solid-ui-components/src")`, on the
premise that only a linked checkout has a `src/`. Measured against a real
v0.126.0 install:

| | `existsSync(pkg/src)` | `lstatSync(pkg).isSymbolicLink()` |
|---|---|---|
| Normal install | **`true`** ❌ | `false` ✅ |
| Symlinked (`npm link`) | `true` ✅ | `true` ✅ |

The path check returns `true` unconditionally from v0.126.0 onward — it carries
no signal and can never select dist mode again, so a *production* build silently
compiles SUI from source. The fix is to test for the symlink, which is what
`npm link` actually creates, and it belongs in the consumer: removing `src` from
`files` here would fix the misdetection by deleting the feature being
misdetected.

If another consumer grows source-mode detection, this is the trap to check for.

## Enforcement

`scripts/build-config.test.ts` asserts both settings and fails with the
reasoning inline. This is deliberate belt-and-braces: removing either setting
produces no test failure, no type error, and no visible symptom in this repo —
the damage lands only in downstream bundles, where nobody will connect it back
to a config line deleted months earlier.

That test guards the *config*. It cannot guard the *outcome*: SUI's own source
can grow a new eager import that drags `katex` back into every consumer with
both settings still perfectly in place. `npm run bundle-budget`
(`scripts/bundle-budget.mjs`) closes that gap by building six real consumer apps
against the real `dist/` and checking what came out — see AGENT_GUIDE.md.

Its contamination check is deliberately **not** ratcheted, unlike its size
check. Validated by planting a `katex` import in `Button.tsx`: the client
one-button bundle went 15,403 B → 241,892 B, but the *SSR* one grew by only
**14 bytes**, because katex is external in that build — an unremovable bare
`import "katex"` costs nothing on disk while still loading the library at Node
startup. Any size-based ceiling misses that; the contamination check does not.
