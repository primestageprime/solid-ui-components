# One queue component, and the motion seam

> **Partial.** This file was created empty on 2026-07-27 and never written. It
> was filled on 2026-07-31 with the hazards established by the BucketQueue work
> of 0.128.0–0.131.0, rescued from `docs/handoffs/open-work.md` before that
> handoff was retired. The broader "why one queue component rather than several"
> argument is still unwritten — add it here rather than starting a new ADR.

Motion is a **seam**, not a feature of the renderer: `motion.ts` and
`MotionContext` are separable from the layout and keyboard concerns. Each hazard
below comes from that separation being violated or misunderstood.

## Collapse is the sizing model's central concept, spelled `counts[i] === 0`

`layout.ts` takes an optional `collapsed?: boolean[]`, and both call sites test
`counts[i] === 0 || collapsed?.[i]`. There is **no separate "collapsed mode"** —
`capRows` / `fill` / `weight` compose because a collapsed bucket simply leaves
`active`.

A future change that adds a third way for a bucket to render no rows should join
that expression, not branch around it.

## `motion.ts` must not bail on the whole batch

It used to return early when no transfer had a live destination row, which
silently dropped the *source* bucket's gap-closing FLIP too. The FLIP pass is
now independent of arrivals.

If you add another case where a destination cannot render its arriving row, the
cue path — `MotionContext.bucketEl` → the header count — is where it belongs.
Fixed in `e17d36f`.

## `keyboard.ts`'s `allKeys()` is built from the ITEMS, not the DOM

This is the sharpest hazard in the component.

Anything that hides rows without removing them from `allKeys` puts the single
tab stop on a row that renders nowhere — leaving **no** row with `tabindex="0"`
and dropping the whole queue out of the tab order.

`allKeys()` therefore stays bucket-level. Per-item vetoes (`isCheckable`, added
in 0.131.0) belong in `activate`, which both activation paths already funnel
through — **not** in `allKeys`. A refused row stays reachable and dims in place
rather than disappearing, precisely so the tab order survives.

Pinned by a test in `BucketQueue.keyboard.test.tsx`. If that test fails, do not
adjust it to match new behavior without re-reading this section.

## `BucketQueue.tsx` is split to stay under the 500-line rule

The header is `BucketHeader.tsx`; the live-measurement / `ResizeObserver`
concern is `measurement.ts`. No public API changed in that split. Note that
`missingDepthHeaders` applies to these internal files too — see `AGENT_GUIDE.md`
§ *The health ratchet will fail you*.
