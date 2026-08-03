// ============================================
// Bundle budget — the pure decision layer
// ============================================
//
// Split from bundle-budget.mjs for the same reason health-ratchet.mjs is split
// from health.mjs: measuring a bundle means running several real Vite builds
// over a freshly built dist, which takes tens of seconds. The rules being
// guarded are pure functions of (measurement, baseline), so the tests must
// never pay that cost — see the header of health-ratchet.mjs for what happened
// when guard tests did spawn the real thing.
//
// WHY SIZES ARE RATCHETED IN WHOLE KB
//
// The health metrics are counts, so `v > base` is exactly right. Byte sizes are
// not: a dependency patch that shifts a bundle by 40 bytes would fail CI under
// a strict ratchet, and — worse — an improvement of 40 bytes would ALSO fail,
// since the ratchet demands gains be locked in. Both are noise.
//
// Rounding UP to whole KB before comparing kills that noise while preserving
// every signal worth having: a leaked `katex` is +250 KB and a leaked `d3-dag`
// is +100 KB. Nothing this guard exists to catch is smaller than 1 KB.

/** Bytes → whole KB, rounded up. The unit the ratchet actually compares. */
export const toKb = (bytes) => Math.ceil(bytes / 1024);

/**
 * Heavy third-party deps that must not leak into a bundle whose components
 * never use them. Matched against the emitted bundle text.
 *
 * These are the two ADR 0005 names them plus kobalte, which only the SERVER
 * build can leak (it inlines kobalte via ssr.noExternal, so kobalte lands
 * *inside* the bundle and needs module granularity to leave again). The client
 * build keeps kobalte external, so it can never appear there.
 */
export const HEAVY_DEPS = ["katex", "d3-dag", "sugiyama", "kobalte"];

/**
 * Classify one fixture's contamination.
 *
 * `expected` lists the heavy deps this fixture is SUPPOSED to contain — math.jsx
 * must carry katex. That makes the check two-sided on purpose: a missing
 * expected dep is reported as `starved`, because a bundle that shrank by
 * shaking away code it genuinely needed is a correctness bug wearing a
 * bundle-size win's clothing.
 *
 * @param found     heavy dep names actually present in the bundle
 * @param expected  heavy dep names that legitimately belong
 * @returns {{leaked: string[], starved: string[]}}
 */
export function classifyContamination(found, expected) {
  const ok = new Set(expected);
  const seen = new Set(found);
  return {
    leaked: found.filter((d) => !ok.has(d)),
    starved: expected.filter((d) => !seen.has(d)),
  };
}

/**
 * A fixture that renders nothing is not passing, however small it is.
 *
 * Only SSR fixtures can be checked this way — they run in Node and print their
 * markup. The 953 B SSR bundle that motivated this harness was briefly
 * indistinguishable from a broken one, so size alone is never the whole
 * verdict.
 */
export const rendersMarkup = (stdout) => /^<[a-z]/i.test(stdout.trim());
