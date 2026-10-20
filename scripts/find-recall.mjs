#!/usr/bin/env node
// ============================================
// Recall-first finder (diddit #4161, Peter 2026-10-20: "wanting 100% SUI
// find (ie. it never fails to find a component that already exists). I'm
// happy to trade some efficiency for correctness.")
// --------------------------------------------
// Two local retrievers never agreed on the misses, so their UNION is the
// candidate set: ranker v2 (tags, scripts/find.mjs) top-K ∪ BM25
// (scripts/find-bm25.mjs) top-K, plus MiniLM top-K when an embedding
// candidate file is supplied (scripts/find-embed.mjs output; the model is not
// a SUI dependency). On the 44 quoted held-out needs the union surfaced the
// right component on 44/44 at K=20 (ranker v2 ∪ MiniLM) — see
// scripts/experiments/search-comparison-2026-10-20/recall.json.
//
// The candidate set, each with its FULL COMPONENTS.md entry (or its JSDoc),
// is what a reader model then picks from (`--reader-batch` writes the
// batches for a Sonnet picker; `--pick <picks.json>` merges its answer). A
// pick under `--confidence` (default 0.6) falls back to the exhaustive read
// of COMPONENTS.md.
//
//   node scripts/find-recall.mjs "<need>"                     # the candidate set, with entries
//   node scripts/find-recall.mjs --bench <needs.json> --reader-batch <dir> [--embed-cands <file>] [--k 20]
// ============================================
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { componentsMdBulletFor, loadTagVocabulary } from "./catalog.mjs";
import { find, loadLexicon, loadRecords } from "./find.mjs";
import { buildBm25 } from "./find-bm25.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function candidateSet(
  need,
  { records, vocab, lexicon, bm25, embedCands = null, k = 20 },
) {
  const out = new Map();
  const add = (name, via, rank) => {
    if (!out.has(name)) out.set(name, { name, via: [], bestRank: rank });
    const o = out.get(name);
    o.via.push(via);
    o.bestRank = Math.min(o.bestRank, rank);
  };
  find(need, { records, vocab, lexicon, top: k }).results.forEach((r, i) =>
    add(r.name, "tags", i),
  );
  bm25.rank(need, k).forEach((r, i) => add(r.record.name, "bm25", i));
  if (embedCands)
    embedCands.slice(0, k).forEach((c, i) => add(c.split(" ")[0], "minilm", i));
  return [...out.values()].sort(
    (a, b) => a.bestRank - b.bestRank || b.via.length - a.via.length,
  );
}

export const entryFor = (record, componentsMd) => {
  const bullet = componentsMdBulletFor(componentsMd, record.name);
  const text = bullet ?? record.useFor ?? record.summary ?? record.notes ?? "";
  return text.replace(/\s+/g, " ").slice(0, 700);
};

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = (name, dflt) => {
    const i = argv.indexOf(name);
    return i === -1 ? dflt : argv[i + 1];
  };
  const records = loadRecords();
  const byName = new Map(records.map((r) => [r.name, r]));
  const vocab = loadTagVocabulary(root);
  const lexicon = loadLexicon();
  const bm25 = buildBm25(records);
  const componentsMd = readFileSync(join(root, "COMPONENTS.md"), "utf8");
  const k = Number(opt("--k", 20));
  const benchPath = opt("--bench", null);
  if (benchPath) {
    const needs = JSON.parse(readFileSync(benchPath, "utf8")).needs;
    const emb = opt("--embed-cands", null)
      ? JSON.parse(readFileSync(opt("--embed-cands"), "utf8"))
      : null;
    const items = needs.map((n, i) => {
      const cands = candidateSet(n.need, {
        records,
        vocab,
        lexicon,
        bm25,
        embedCands: emb ? emb[i].candidates : null,
        k,
      });
      return {
        id: i + 1,
        need: n.need,
        candidates: cands.map((c) => ({
          name: c.name,
          depth: byName.get(c.name)?.depth ?? null,
          via: c.via.join("+"),
          entry: entryFor(byName.get(c.name), componentsMd),
        })),
      };
    });
    const dir = opt("--reader-batch", null);
    if (dir) {
      mkdirSync(dir, { recursive: true });
      const per = Number(opt("--per", 11));
      for (let b = 0; b * per < items.length; b++)
        writeFileSync(
          join(dir, `reader${b + 1}.json`),
          JSON.stringify(items.slice(b * per, (b + 1) * per)),
        );
      console.log(
        `${Math.ceil(items.length / per)} reader batches in ${dir}; mean candidates per need ${(items.reduce((a, x) => a + x.candidates.length, 0) / items.length).toFixed(1)}`,
      );
    }
    // recall of the union itself, when expectations are present
    if (needs[0]?.expect) {
      const hit = items.filter((it, i) =>
        it.candidates.some((c) => needs[i].expect.includes(c.name)),
      ).length;
      console.log(`union recall: ${hit}/${needs.length}`);
      items.forEach((it, i) => {
        if (!it.candidates.some((c) => needs[i].expect.includes(c.name)))
          console.log(
            `  miss: ${needs[i].need.slice(0, 80)} | expect ${needs[i].expect.join("|")}`,
          );
      });
    }
    process.exit(0);
  }
  const need = argv.filter((a) => !a.startsWith("--")).join(" ");
  for (const c of candidateSet(need, { records, vocab, lexicon, bm25, k }))
    console.log(
      `${c.name} [${c.via.join("+")}]\n    ${entryFor(byName.get(c.name), componentsMd).slice(0, 160)}`,
    );
}
