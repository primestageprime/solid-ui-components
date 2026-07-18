# `fn` — data-last functional utilities

A small, self-contained module of always-curried, **data-last** helpers plus a
typed, value-first **`pipe`**. It exists to replace inline dot-chained
`.map().filter().reduce()` lambdas with small named pure functions composed
through `pipe` (ruled 2026-07-18).

> **Designed to be lifted out as its own package.** Nothing here imports from
> anywhere else in SUI — no components, no `types.ts`, no `solid-js`, no DOM.
> Pure TypeScript with zero runtime dependencies. Other SUI code imports _from_
> `fn`; `fn` imports from nothing but itself.

## Convention

- **Data-last, one calling shape.** Every helper takes its configuration first
  and returns a function of the data: `map(fn)` is `(array) => U[]`,
  `sortBy(keyFn)` is `(array) => T[]`. There is no data-first overload (no
  purry-style dispatch). Helpers that take _only_ data (`sum`, `mean`) are
  called directly. Everything is meant to flow through `pipe`.
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

| fn | shape | notes |
|----|----|----|
| `pipe(v, …fns)` | value-first composition | typed to arity 12 + rest fallback |
| `map(fn)` | `(readonly T[]) => U[]` | wrapper over `Array.prototype.map` |
| `filter(pred)` | `(readonly T[]) => T[]` | type-guard overload narrows the element type |
| `pluck(key)` | `(readonly T[]) => T[key][]` | the `xs.map(x => x.key)` shape in one step |
| `sortBy(keyFn)` | `(readonly T[]) => T[]` | ascending, **stable**, **copies** (non-mutating); pass a typed key fn |
| `sum(xs)` | `(readonly number[]) => number` | `sum([]) === 0` |
| `mean(xs)` | `(readonly number[]) => number` | `NaN` on empty (guard on `.length`) |
| `join(sep)` | `(readonly unknown[]) => string` | wrapper over `Array.prototype.join` |
| `groupBy(keyFn)` | `(readonly T[]) => Map<K, T[]>` | first-seen key order; order-preserving buckets |

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
```

## Adding a function

Ship a helper only when there are **≥2 genuine call sites** where the functional
form is a real improvement (a named projection, removed duplication, or a 2+
stage pipe). One file per function with a colocated `*.test.ts`; export it from
`index.ts`. Keep it a thin monomorphic wrapper — no generic dispatch, no
cleverness; these run in table-cell accessors. See
`docs/superpowers/plans/2026-07-18-fn-module.md` for the survey and the
considered-and-rejected list.
