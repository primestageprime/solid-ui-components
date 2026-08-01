// ============================================
// Health ratchet — the pure decision layer
// ============================================
//
// Extracted from health.mjs so the rules can be tested WITHOUT running a health
// check. The first version of the guard tests spawned `node scripts/health.mjs`
// once per case; each spawn walks all of src/ and runs the TypeScript compiler
// API, and nine of them inside the jsdom suite (competing with 273 other test
// files on a 2-core runner) hung CI until it was cancelled at 15 minutes. The
// rules being guarded are pure functions of (metrics, baseline, flags) — they
// never needed a subprocess.
//
// WHY THE RULES ARE WHAT THEY ARE
//
// `--update-baseline` used to rewrite every metric at once, and was the only
// escape hatch, so accepting one intended increase silently blessed every
// unrelated drift in the same command. That is not hypothetical: `dotChains`
// was burned 127 → 55 and `collectionMethodCalls` 362 → 225 by real work, then
// both crept back (59 / 230) as side effects of commits about other things
// (`e72db8f`, `6cc7609`). Separately, `cssTypedProps` had TWO exemption routes —
// scripts/prop-rubric.json, which demands a justification string, and the
// baseline, which demands nothing. `67b89c7` ("bless TableColumn.minWidth")
// took the silent one and the reason is gone.

/** A metric moved: `k` at `base`, now `v`. */
const delta = (k, base, v) => ({ k, base, v });

/**
 * Classify every metric against the baseline.
 * @returns {{regressions: Array, improvements: Array}} — `base === undefined`
 *   (a brand-new metric) is neither; it has no ceiling to compare against.
 */
export function classify(metrics, baseline) {
  const regressions = [];
  const improvements = [];
  for (const [k, v] of Object.entries(metrics)) {
    const base = baseline?.[k];
    if (base === undefined) continue;
    if (v > base) regressions.push(delta(k, base, v));
    else if (v < base) improvements.push(delta(k, base, v));
  }
  return { regressions, improvements };
}

/**
 * Decide what `--update-baseline` should do, without doing any of it.
 *
 * @param metrics   computed counts
 * @param baseline  the recorded ceilings (may be null on first run)
 * @param raisable  Set of metric names the caller explicitly permitted to rise
 * @param reason    the `--reason=` text, required whenever `raisable` is used
 * @returns {{error?: {kind: string, detail: any}, next?: object, lowered?: Array, raised?: Array}}
 *   `error.kind` is one of:
 *     "unknown-metric"  — a name in `raisable` is not a metric (a typo). Checked
 *                         FIRST: given both a misspelling and a missing reason,
 *                         the misspelling is the more useful thing to report.
 *     "missing-reason"  — `raisable` is non-empty but no reason was given.
 *     "unblessed-rise"  — a metric rose that was not named. The whole write is
 *                         refused, never partially applied: a partial write
 *                         would report success while the ceiling it failed to
 *                         raise still fails the next run.
 */
export function planBaselineUpdate({ metrics, baseline, raisable, reason }) {
  const named = raisable ?? new Set();

  const unknown = [...named].filter((k) => !(k in metrics));
  if (unknown.length > 0)
    return { error: { kind: "unknown-metric", detail: unknown } };

  if (named.size > 0 && !reason)
    return { error: { kind: "missing-reason", detail: [...named] } };

  const { regressions } = classify(metrics, baseline);
  const unblessed = regressions.filter(({ k }) => !named.has(k));
  if (unblessed.length > 0)
    return { error: { kind: "unblessed-rise", detail: unblessed } };

  // Named metrics take the current value; every other ceiling is clamped to the
  // better of (current, existing). So the bare flag cannot loosen anything.
  const next = Object.fromEntries(
    Object.entries(metrics).map(([k, v]) => {
      const base = baseline?.[k];
      if (base === undefined || named.has(k)) return [k, v];
      return [k, Math.min(v, base)];
    }),
  );

  // Carry forward recorded reasons and add one per ceiling raised now, so the
  // justification outlives the commit message. `_` keys are metadata — the
  // comparison above iterates computed metrics and never sees them.
  const raises = { ...(baseline?._raises ?? {}) };
  for (const { k, base, v } of regressions)
    raises[k] = { from: base, to: v, reason };
  if (Object.keys(raises).length > 0) next._raises = raises;

  const moved = (cmp) =>
    Object.entries(next).filter(
      ([k, v]) =>
        typeof v === "number" &&
        baseline?.[k] !== undefined &&
        cmp(v, baseline[k]),
    );

  return {
    next,
    lowered: moved((v, b) => v < b),
    raised: moved((v, b) => v > b),
  };
}
