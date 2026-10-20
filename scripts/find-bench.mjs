#!/usr/bin/env node
// ============================================
// Component-search benchmark — top-1 / top-3 hit rate of `npm run find`.
// --------------------------------------------
// scripts/find-bench.json holds needs phrased like briefs, each with the
// component(s) that answer it and a split (tuning / heldout). Three rankers
// are scored so the before/after is honest:
//   legacy   `catalog.mjs --find` (prose keywords, +1 per depth level)
//   tagged   scripts/find.mjs with the vocabulary only (no lexicon)
//   tuned    scripts/find.mjs with scripts/find-lexicon.json
//
//   node scripts/find-bench.mjs                 # the table, both splits
//   node scripts/find-bench.mjs --misses        # plus every tuning-split miss (top 5 shown)
//   node scripts/find-bench.mjs --misses --reveal-heldout   # the held-out misses too: ONLY once tuning is finished
//   node scripts/find-bench.mjs --json
// ============================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rankCatalog, loadTagVocabulary } from "./catalog.mjs";
import { find, loadLexicon, loadRecords } from "./find.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// `--file <path>` scores another needs file (scripts/find-bench-real.json:
// the quoted held-out set alone); items without a `split` count as heldout.
const fileIdx = process.argv.indexOf("--file");
const benchPath =
  fileIdx !== -1
    ? process.argv[fileIdx + 1]
    : join(root, "scripts", "find-bench.json");
const bench = JSON.parse(readFileSync(benchPath, "utf8")).needs.map((n) => ({
  split: "heldout",
  ...n,
}));
const records = loadRecords();
const vocab = loadTagVocabulary(root);
const lexicon = loadLexicon();

const rankers = {
  legacy: (need) => rankCatalog(records, need, 5).map((r) => r.record.name),
  tagged: (need) =>
    find(need, { records, vocab, lexicon: {}, top: 5 }).results.map(
      (r) => r.name,
    ),
  tuned: (need) =>
    find(need, { records, vocab, lexicon, top: 5 }).results.map((r) => r.name),
};

export const score = (items, ranker) => {
  let top1 = 0;
  let top3 = 0;
  const misses = [];
  for (const item of items) {
    const got = ranker(item.need);
    const pos = got.findIndex((n) => item.expect.includes(n));
    if (pos === 0) top1++;
    if (pos >= 0 && pos < 3) top3++;
    else misses.push({ need: item.need, expect: item.expect, got });
  }
  return { n: items.length, top1, top3, misses };
};

const argv = process.argv.slice(2);
const splits = ["tuning", "heldout", "authored"];
const out = {};
for (const split of splits) {
  const items = bench.filter((b) => b.split === split);
  out[split] = {};
  for (const [name, ranker] of Object.entries(rankers))
    out[split][name] = score(items, ranker);
}
const realMisses = bench.filter((b) => b.miss);
out.realMisses = {};
for (const [name, ranker] of Object.entries(rankers))
  out.realMisses[name] = score(realMisses, ranker);

if (argv.includes("--json")) {
  console.log(JSON.stringify(out, null, 2));
} else {
  const pct = (a, n) => `${a}/${n} (${Math.round((100 * a) / n)}%)`;
  console.log("| split | ranker | top-1 | top-3 |");
  console.log("|---|---|---|---|");
  for (const split of [...splits, "realMisses"])
    for (const name of Object.keys(rankers)) {
      const s = out[split][name];
      console.log(
        `| ${split} | ${name} | ${pct(s.top1, s.n)} | ${pct(s.top3, s.n)} |`,
      );
    }
  if (argv.includes("--misses")) {
    const show = argv.includes("--reveal-heldout") ? splits : ["tuning"];
    for (const split of show) {
      console.log(`\n${split} misses (tuned ranker):`);
      for (const m of out[split].tuned.misses)
        console.log(
          `  - "${m.need}"\n      expect ${m.expect.join("|")}\n      got    ${m.got.join(", ")}`,
        );
    }
  }
}
