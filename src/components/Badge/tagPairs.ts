// ============================================
// composeTagPairs — pure helper for the Badge family (Depth 0: no component, no
// CSS, no JSX). Companion to TagPill: it decides HOW a flat list of dim:value
// tags is presented as split lozenges, so an app renders "stax · jtf" instead
// of two separate "customer:stax" and "project:jtf" pills. TagPill owns the
// pixels; this owns the composition.
//
// The presentation contract:
//   * A pair RULE names two dims (parent, child). When BOTH are present, the two
//     tags collapse into ONE split lozenge whose halves are the parent's VALUE
//     and the child's VALUE — the dim names drop out of sight (they survive in
//     `title` for hover recovery). customer:stax + project:jtf → "stax │ jtf".
//   * A dim present WITHOUT its partner is not abbreviated — the reader would
//     have no anchor for a bare value — so it falls through to the labeled form.
//   * Every unconsumed tag renders labeled: key = dim, value = value.
//
// Deterministic: pairs emit first in rule order, then the remaining labeled tags
// in input order (or by cfg.order when given). Each source tag is consumed at
// most once; a duplicated dim pairs on its first occurrence, extras stay labeled.
// ============================================

/** A pairing rule: when both dims are present, collapse them into one lozenge. */
export type TagPairRule = { parent: string; child: string };

/** How to present a tag set: the pair rules plus an optional dim ordering. */
export type TagDisplayConfig = { pairs: TagPairRule[]; order?: string[] };

/** A raw tag: a dimension and its value (e.g. { dim: "customer", value: "stax" }). */
export type SourceTag = { dim: string; value: string };

/**
 * A presentation-ready tag. `key`/`value` are the two halves of the split
 * lozenge; `title` is the hover-recovery string; `sources` are the 1 (labeled)
 * or 2 (pair, [parent, child]) underlying tags. Maps onto ActionListTag's
 * `{ key, value }` split form at a call site.
 */
export type ComposedTag = {
  key: string;
  value: string;
  title: string;
  sources: SourceTag[];
};

/**
 * Compose a flat tag list into presentation-ready split/labeled lozenges,
 * honouring the pair rules and ordering documented above.
 *
 * @param tags  The raw dim:value tags, in their natural order.
 * @param cfg   Pair rules (tried in order) and an optional dim ordering.
 * @returns     Pairs first (rule order), then the remaining labeled tags.
 */
export function composeTagPairs(tags: SourceTag[], cfg: TagDisplayConfig): ComposedTag[] {
  const consumed = new Array<boolean>(tags.length).fill(false);

  const firstUnconsumed = (dim: string, skip = -1): number => {
    for (let i = 0; i < tags.length; i++) {
      if (!consumed[i] && i !== skip && tags[i].dim === dim) return i;
    }
    return -1;
  };

  const pairs: ComposedTag[] = [];
  for (const rule of cfg.pairs ?? []) {
    const pi = firstUnconsumed(rule.parent);
    if (pi === -1) continue;
    const ci = firstUnconsumed(rule.child, pi);
    if (ci === -1) continue;
    consumed[pi] = true;
    consumed[ci] = true;
    const parent = tags[pi];
    const child = tags[ci];
    pairs.push({
      key: parent.value,
      value: child.value,
      title: `${parent.dim}: ${parent.value} · ${child.dim}: ${child.value}`,
      sources: [parent, child],
    });
  }

  const remaining = tags
    .map((tag, idx) => ({ tag, idx }))
    .filter(({ idx }) => !consumed[idx]);

  if (cfg.order?.length) {
    const rank = (dim: string) => {
      const k = cfg.order!.indexOf(dim);
      return k === -1 ? cfg.order!.length : k;
    };
    remaining.sort((a, b) => rank(a.tag.dim) - rank(b.tag.dim) || a.idx - b.idx);
  }

  const labeled: ComposedTag[] = remaining.map(({ tag }) => ({
    key: tag.dim,
    value: tag.value,
    title: `${tag.dim}: ${tag.value}`,
    sources: [tag],
  }));

  return [...pairs, ...labeled];
}
