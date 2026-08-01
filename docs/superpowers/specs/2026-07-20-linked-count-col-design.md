# linkedCountCol — linked drill-down count field type

**Date:** 2026-07-20
**Status:** Approved (Peter, 2026-07-20)

## Problem

The QaqcTriage migration produced seven bucket columns that all repeat the same
composition by hand: `withHref` over `intCol` with a zero-check ternary in the
href — `(a) => (a[key] > 0 ? detailHref(a, key) : null)`. The bench names it
locally (`bucketCol` in `dev/showcases/workshop/jtf-tables/triage.tsx`), and
jtf-ui's `QaqcAssetTriage.tsx` repeats the same shape. The zero-check is not a
decoration choice — it is a *semantic of counts*: a zero count has no worklist
to open, so it must render as a plain cell, never a dead link.

## Ruling

Add a first-class factory, `linkedCountCol`, to the field-type catalog. This is
a scoped exception to the 2026-07-20 combinator-first ruling ("instead of
growing an option on every factory, a combinator decorates ANY column"): the
factory earns its keep because zero-has-no-destination is a count semantic that
would otherwise be re-derived at every call site. A `withHrefWhen` combinator
was considered and rejected for now (no second caller demands the general
mechanism; start minimal).

## Design

**New files:** `src/components/Table/fields/linked-count.tsx` and
`linked-count.test.tsx`, exported through `fields/index.ts` alongside the other
factories.

**Signature:**

```ts
linkedCountCol<T>(
  source: ValueSource<T, number | null | undefined>,
  opts: {
    href: (row: T) => string;   // REQUIRED — without it, use intCol
    header?: string;
    id?: string;                // required when source is a derived fn
    tone?: ToneFn<T, number>;
  },
): FieldCol<T>
```

- `source` follows the shared `ValueSource`/`readerOf` convention (row key or
  derived `(row) => value`, ruled 2026-07-18).
- `href` is required: a linked count without a destination is just `intCol`,
  and the factory refuses to be one.
- No `suffix` option — no caller demands a unit on a linked count
  (start-minimal; add on demand).

**Semantics:** built *as* `withHref` over `intCol`, not a re-implementation —
geometry, formatting (IntCell), numeric sort, null-renders-blank, and tone all
delegate to `intCol` (derive-don't-duplicate). The factory adds exactly one
behavior: the positivity gate. Value > 0 applies `opts.href`; zero or null
yields a nullish href, taking `withHref`'s existing plain-cell path.

**Call-site effect:** the bench's `bucketCol` collapses to
`withHint(hint, linkedCountCol(key, { href, header, tone? }))` and the
zero-check ternary disappears from `triage.tsx`. jtf-ui's
`QaqcAssetTriage.tsx` gets the same collapse as a follow-up in that repo (its
commits ride the same unpushed batch).

## Testing (TDD)

- Positive count renders an `sui-field-link` anchor with the computed href.
- Zero renders the bare formatted value with no anchor.
- Null/undefined renders blank (inherited intCol ruling).
- `sortValue` stays numeric.
- `tone` still applies inside the link.

## Docs

Catalog entry in `docs/superpowers/plans/2026-07-17-field-type-catalog.md`
recording the factory and the scoped-exception ruling above.
