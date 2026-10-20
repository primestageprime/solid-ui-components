#!/usr/bin/env node
// ============================================
// BM25 over the catalog — arm B of the search comparison (diddit #4161).
// --------------------------------------------
// A classic computed index: every record's name (PascalCase split), tag words,
// useFor, summary and notes become one document; BM25 (k1 = 1.2, b = 0.75)
// ranks them against the need after the same negation / quote stripping
// ranker v2 does. No tags are inferred and no lexicon is read: this is the
// "just index the text" baseline. Depth breaks ties only.
//
//   node scripts/find-bm25.mjs "<need>" [--top N] [--json]
// ============================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripPreferClauses } from "./catalog.mjs";
import { tokenize, stem, readNeed, splitCamel } from "./find.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const docText = (r) =>
  [
    splitCamel(r.name),
    (r.tags ?? []).map((t) => t.split(":")[1].replace(/-/g, " ")).join(" "),
    stripPreferClauses(r.useFor ?? ""),
    stripPreferClauses(r.summary ?? ""),
    stripPreferClauses(r.notes ?? ""),
  ].join(" ");

export function buildBm25(records, { k1 = 1.2, b = 0.75 } = {}) {
  const docs = records.map((r) => tokenize(docText(r)).map(stem));
  const N = docs.length;
  const avgdl = docs.reduce((a, d) => a + d.length, 0) / N;
  const df = new Map();
  const tf = docs.map((d) => {
    const m = new Map();
    for (const t of d) m.set(t, (m.get(t) ?? 0) + 1);
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
    return m;
  });
  const idf = (t) => Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
  return {
    rank(need, top = 10) {
      const q = [...new Set(tokenize(readNeed(need)).map(stem))];
      const scored = records.map((r, i) => {
        let s = 0;
        const dl = docs[i].length;
        for (const t of q) {
          const f = tf[i].get(t) ?? 0;
          if (!f) continue;
          s += idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * dl) / avgdl)));
        }
        return { record: r, score: Math.round(s * 100) / 100 };
      });
      return scored
        .filter((x) => x.score > 0)
        .sort((a, c) => c.score - a.score || (c.record.depth ?? -1) - (a.record.depth ?? -1) || a.record.name.localeCompare(c.record.name))
        .slice(0, top);
    },
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const topIdx = argv.indexOf("--top");
  const top = topIdx !== -1 ? Number(argv[topIdx + 1]) : 5;
  const query = argv.filter((a, i) => !a.startsWith("--") && i !== topIdx + 1).join(" ");
  const records = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8"));
  const ranked = buildBm25(records).rank(query, top);
  if (argv.includes("--json")) console.log(JSON.stringify(ranked.map((x) => ({ name: x.record.name, depth: x.record.depth, score: x.score })), null, 2));
  else for (const [i, x] of ranked.entries()) console.log(`${i + 1}. ${x.record.name} (${x.record.depth ?? "?"}) ${x.score}`);
}
