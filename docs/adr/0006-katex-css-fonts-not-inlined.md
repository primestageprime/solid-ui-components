# KaTeX's stylesheet ships as a file, so its fonts stay external

`dist/index.css` was **1,831,489 bytes**, of which **1,436,824 — 78.5% — was
base64-encoded KaTeX font data**. Every user of every SUI-consuming application
downloaded it, render-blocking, on first load. Four of the five consumers
render no formulas at all.

## What it cost

| | Raw | gzip | brotli |
|---|---|---|---|
| Before | 1,831,489 | 1,042,287 | 883,432 |
| **After** | **375,755** | **87,306** | **68,761** |

A 92% reduction in transfer size. The compression ratio is the tell: CSS
normally compresses to ~10–15% of raw, but this only reached 43%, because
base64-encoded binary is already-compressed data that gzip cannot squeeze.

## Cause

`MathFormula.tsx` had a plain `import "katex/dist/katex.min.css"`.

**Vite's library mode inlines every referenced asset as a `data:` URI
regardless of size — `assetsInlineLimit` does not apply there.** This was
verified directly: setting `assetsInlineLimit: 0` produced a byte-identical
`index.css` and emitted zero font files. A library has no reliable asset base
path at build time, so Vite inlines unconditionally.

The result was 20 `@font-face` blocks (`KaTeX_Main`, `KaTeX_Math`, `KaTeX_AMS`,
`KaTeX_Size1–4`, `Caligraphic`, `Fraktur`, `Script`, `SansSerif`,
`Typewriter`), each embedded in **three formats**:

| Format | Bytes | Share of font payload |
|---|---|---|
| ttf | 685,328 | 48% |
| woff | 404,624 | 28% |
| woff2 | 346,872 | 24% |

## Why inlining is worse than it looks

Inlining doesn't just add bytes — it defeats the two things `@font-face`
normally does for free:

1. **Fonts stop being lazy.** A `url()` font downloads only when a glyph in
   that family is actually rendered. Inlined into the stylesheet, the bytes
   arrive unconditionally, before any formula exists on the page — and CSS is
   render-blocking.
2. **Format negotiation dies.** The `src:` fallback chain normally means a
   browser picks exactly one format. Every modern browser takes woff2, so the
   woff and ttf copies — **1,089,952 bytes** — were pure waste to every
   browser, always.

## The decision

Three cooperating pieces in `vite.config.ts`:

- **`stubKatexCss()`** — resolves `katex/dist/katex.min.css` to an empty
  stylesheet **in library builds only**. `MathFormula.tsx` keeps its import, so
  `vite serve` and source-linked consumers (`SUI_SOURCE_LINKED`) still style
  formulas correctly. This was a real regression when first attempted by simply
  deleting the import — the dev gallery rendered formulas unstyled.
- **`copyKatexAssets()`** — copies `katex.min.css` to `dist/katex.css` and its
  fonts to `dist/fonts/`. KaTeX references fonts as `url(fonts/…)`, so the
  relative path resolves with no rewriting.
- **`prependKatexImport()`** — prepends `@import "./katex.css";` to
  `dist/index.css`. `@import` must precede all other rules, hence prepend, and
  it is idempotent so rebuilds don't stack duplicates.

**This is deliberately non-breaking.** Consumers importing
`@primestageprime/solid-ui-components/index.css` need no changes; bundlers
inline the `@import` at build time, so there is no extra round trip in
production, and a raw `<link>` resolves `./katex.css` as a sibling in `dist/`.

Verified end-to-end: a consumer build emits the fonts as 59 external hashed
asset files with `url(/assets/KaTeX_…woff2)` references, and its stylesheet
contains no font `data:` URIs.

## Alternative considered: strip woff/ttf, keep woff2

Would have removed 1,089,952 bytes on its own and been a smaller change. It was
rejected because it treats the symptom: the fonts would still be inlined, still
eager, still render-blocking, and still shipped to consumers that never render
a formula. Externalizing subsumes it — a browser now downloads only woff2 *and*
only when a formula paints.

## Note for future asset work

Any `import` of a third-party CSS or asset file from a component is subject to
the same inlining. Before adding one, check what it drags in:

```sh
grep -o 'url(data:[a-z/+-]*' dist/index.css | sort | uniq -c
```

## Enforcement

`scripts/build-config.test.ts` asserts all three pieces exist, that the stub is
gated on `!isServe` (so dev keeps working), and that `MathFormula.tsx` still
imports the stylesheet. As with ADR 0005, the failure is invisible in this repo
— nothing breaks locally, no test fails, and the damage lands only in consumer
bundles.
