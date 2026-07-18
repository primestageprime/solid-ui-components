# `fn` — data-last functional utilities

A small, self-contained module of **data-last** helpers plus a typed,
value-first **`pipe`**. It exists to replace inline dot-chained
`.map().filter().reduce()` lambdas with small named pure functions composed
through `pipe` (ruled 2026-07-18).

> **Designed to be lifted out as its own package.** Nothing here imports from
> anywhere else in SUI — no components, no `types.ts`, no `solid-js`, no DOM.
> Pure TypeScript with zero runtime dependencies. Other SUI code imports _from_
> `fn`; `fn` imports from nothing but itself.

## Convention

- **Dual form: curried for `pipe`, direct everywhere else** (ruled 2026-07-18:
  Peter prefers `map(f, arr)` over `arr.map(f)` — even for a single call). Every
  non-unary helper has two shapes:
  - **curried / data-last** — `map(fn)` returns `(array) => U[]`. Use this
    _inside a `pipe`_, where each stage is a one-argument function.
  - **direct / full application** — `map(fn, array)` runs immediately and
    returns the result. Use this _outside a pipe_, and **prefer it over
    `array.map(fn)`** as the house style, single calls included.

  It is 2-ary dispatch (branch on `arguments.length`), NOT ramda-style
  auto-curry — exactly two overloads per function, config-first in both. There
  is no data-first form (`map(arr, fn)` is a type error). Helpers that take
  _only_ data (`sum`, `mean`) are unary and always called directly; `pipe`
  itself is unchanged.
- **`pipe` is value-first** (like remeda, not `compose`): `pipe(value, f1, f2)`
  reads top-to-bottom as the data moving through stages. Typed by hand-written
  overloads up to 12 arguments (a value + 11 stages), and a mismatched stage is
  a compile error (there is no untyped rest fallback to swallow it). A pipe of
  more than 11 stages is a type error — nest a second `pipe`.
- **Type guards narrow through `pipe`.** `filter`'s type-guard overload returns
  the narrowed element type, so `pipe(xs, filter(isNumber), sum)` type-checks
  with no cast.
- **No mutation.** `sortBy` copies before sorting; native `Array.prototype.sort`
  mutates and must never be used on shared/derived arrays.
- **Non-null input.** Helpers do not accept `null`/`undefined` collections —
  callers guard. Empty-input policy is per function and documented in its file
  (`sum([]) === 0`, `mean([])` is `NaN`, `groupBy([])` is an empty `Map`).

## Functions

Every helper below (except unary `sum`/`mean` and `pipe`) has BOTH the curried
form shown and a direct form that appends the array (`map(fn, array) => U[]`,
`sortBy(keyFn, array) => T[]`, …).

| fn | curried shape | notes |
|----|----|----|
| `pipe(v, …fns)` | value-first composition | typed to 12 args / 11 stages, no untyped rest fallback; unary — no direct form |
| `map(fn)` | `(readonly T[]) => U[]` | + direct `map(fn, arr)`; wrapper over `Array.prototype.map` |
| `filter(pred)` | `(readonly T[]) => T[]` | + direct `filter(pred, arr)`; type-guard overload narrows in both forms |
| `prop(key)` | `(obj) => obj[key]` | + direct `prop(key, obj)`; function-first property access. Direct form is `T[K]`-typed; a curried `prop(key)` passed as an argument loses its value type — see caveat below |
| `pluck(key)` | `(readonly T[]) => T[key][]` | + direct `pluck(key, arr)`; the `xs.map(x => x.key)` shape in one step |
| `sortBy(keyFn)` | `(readonly T[]) => T[]` | + direct `sortBy(keyFn, arr)`; ascending, **stable**, **copies** (non-mutating). Direct form infers the key-fn param from the array |
| `sum(xs)` | `(readonly number[]) => number` | unary; `sum([]) === 0` |
| `mean(xs)` | `(readonly number[]) => number` | unary; `NaN` on empty (guard on `.length`) |
| `length(xs)` | `({ length: number }) => number` | unary; the `.length` of an array or string |
| `lengthOf(key)` | `(obj) => number` | + direct `lengthOf(key, obj)`; `length(prop(key, obj))` — the function-first `obj.key.length` |
| `join(sep)` | `(readonly unknown[]) => string` | + direct `join(sep, arr)`; wrapper over `Array.prototype.join` |
| `groupBy(keyFn)` | `(readonly T[]) => Map<K, T[]>` | + direct `groupBy(keyFn, arr)`; first-seen key order; order-preserving buckets |

> **`prop` caveat.** As a curried accessor, `prop(key)` recovers the property's
> value type only when applied directly to an object. Passed as an _argument_ to
> a higher-order helper it types the value as `unknown` — `sortBy(prop("w"))` is
> not usable. For sort keys use a typed arrow (`sortBy((r) => r.w)`); for array
> projection use `pluck`. `prop` is for direct/`pipe`d object access, and it is
> what `lengthOf` composes over.

## Examples

```ts
import { fn } from "@primestageprime/solid-ui-components";

// sum a projected field — named projection, not an inline reduce lambda
const totalMinCh = fn.pipe(columns, fn.map((c: Col) => c.geo.minCh), fn.sum);

// stable, non-mutating sort by a typed key function
const byWidth = fn.sortBy((b: Breakpoint) => b.minWidth)(breakpoints);

// narrow-then-aggregate through a pipe
const avg = fn.pipe(
  values,
  fn.filter((v): v is number => typeof v === "number"),
  fn.mean,
);

// pluck + join
const label = fn.pipe(selected, fn.pluck("label"), fn.join(", "));

// Outside a pipe, prefer the DIRECT form over a native method call:
const doubled = fn.map((n) => n * 2, counts); // not counts.map(...)
const ids = fn.pluck("id", rows); //             not rows.map(r => r.id)
const ordered = fn.sortBy((r) => r.rank, rows); // not [...rows].sort(...)
const owner = fn.prop("owner", task); //          not task.owner
const nChains = fn.lengthOf("dotChains", hits); // not hits.dotChains.length
```

## Adding a function

Ship a helper only when there are **≥2 genuine call sites** where the functional
form is a real improvement (a named projection, removed duplication, or a 2+
stage pipe). One file per function with a colocated `*.test.ts`; export it from
`index.ts`. Keep it a thin monomorphic wrapper — no generic dispatch, no
cleverness; these run in table-cell accessors. See
`docs/superpowers/plans/2026-07-18-fn-module.md` for the survey and the
considered-and-rejected list.
