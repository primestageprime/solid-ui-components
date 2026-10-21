#!/usr/bin/env node
// ============================================
// Composition walk — arm F of the search comparison (diddit #4161).
// --------------------------------------------
// Peter's "biggest applicable" read literally: find the small parts the need
// matches, then walk the "made of" graph UPWARD to the largest component
// that imports them. The graph is `partsOf` from find.mjs inverted (which
// base components import this one), built once over every base record.
//
// For a need: ranker v2's top N (default 10) are the seeds. Each seed is
// replaced by its deepest importer that also matches at least one of the
// need's tags (so a chart part does not walk up into an unrelated page);
// a seed with no such importer stays. The result is re-ranked by depth,
// Held-out 2026-10-20: 18% / 41% with 5 seeds, 11% / 27% with 10: walking
// up overshoots (a search field walks into the rail that pins it), so this
// arm loses to ranker v2 (50% / 59%). Kept as the record of the experiment.
// then the seed's rank. Zero tokens.
//
//   node scripts/find-walk.mjs "<need>" [--top N]
// ============================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTagVocabulary } from "./catalog.mjs";
import {
  find,
  inferTags,
  loadLexicon,
  loadRecords,
  partsOf,
  effectiveDepth,
} from "./find.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function buildUsedBy(records, readSrc) {
  const usedBy = new Map();
  for (const r of records) {
    if (r.kind === "variant") continue;
    for (const p of partsOf(r, records, readSrc)) {
      if (!usedBy.has(p)) usedBy.set(p, []);
      usedBy.get(p).push(r.name);
    }
  }
  return usedBy;
}

export function walk(
  need,
  { records, vocab, lexicon, usedBy, seeds = 10, top = 5 },
) {
  const byName = new Map(records.map((r) => [r.name, r]));
  const tags = new Set(
    inferTags(need, { vocab, lexicon }).tags.map((t) => t.tag),
  );
  const seedList = find(need, { records, vocab, lexicon, top: seeds }).results;
  const out = new Map();
  seedList.forEach((s, rank) => {
    let best = byName.get(s.name);
    let bestDepth = effectiveDepth(best, records) ?? 0;
    const seen = new Set([s.name]);
    const frontier = [s.name];
    while (frontier.length) {
      const cur = frontier.pop();
      for (const up of usedBy.get(cur) ?? []) {
        if (seen.has(up)) continue;
        seen.add(up);
        const r = byName.get(up);
        if (!r || !(r.tags ?? []).some((t) => tags.has(t))) continue;
        const d = effectiveDepth(r, records) ?? 0;
        if (d > bestDepth) {
          best = r;
          bestDepth = d;
        }
        frontier.push(up);
      }
    }
    if (!out.has(best.name) || out.get(best.name).rank > rank)
      out.set(best.name, {
        name: best.name,
        depth: bestDepth,
        rank,
        via: s.name,
      });
  });
  return [...out.values()]
    .sort((a, b) => b.depth - a.depth || a.rank - b.rank)
    .slice(0, top);
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const topIdx = argv.indexOf("--top");
  const top = topIdx !== -1 ? Number(argv[topIdx + 1]) : 5;
  const query = argv
    .filter((a, i) => !a.startsWith("--") && i !== topIdx + 1)
    .join(" ");
  const records = loadRecords();
  const readSrc = (f) => readFileSync(join(root, f), "utf8");
  const usedBy = buildUsedBy(records, readSrc);
  for (const [i, r] of walk(query, {
    records,
    vocab: loadTagVocabulary(root),
    lexicon: loadLexicon(),
    usedBy,
    top,
  }).entries())
    console.log(
      `${i + 1}. ${r.name} (${r.depth})${r.via !== r.name ? ` via ${r.via}` : ""}`,
    );
}
