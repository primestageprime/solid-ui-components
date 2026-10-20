// ============================================
// Local-embedding arm B of the search comparison (diddit #4161): MiniLM
// (Xenova/all-MiniLM-L6-v2, q8) through @huggingface/transformers, one vector
// per catalog record, cosine ranking of the need. NOT a dependency of SUI:
// run it from a scratch directory that has `npm i @huggingface/transformers`
// (the model downloads once, ~23 MB). Held-out 2026-10-20: 41% / 57%.
//   node find-embed.mjs <out-candidates.json>
// ============================================
import { readFileSync, writeFileSync } from "node:fs";
import { pipeline } from "@huggingface/transformers";
const cwd = "/Users/peter/Documents/clients/PrimeStage/platform/sui-component-search";
const { stripPreferClauses } = await import(cwd + "/scripts/catalog.mjs");
const { readNeed, splitCamel } = await import(cwd + "/scripts/find.mjs");
const records = JSON.parse(readFileSync(cwd + "/catalog.json", "utf8"));
const held = JSON.parse(readFileSync(cwd + "/scripts/find-bench-real.json", "utf8")).needs;
const docText = (r) => [splitCamel(r.name), (r.tags ?? []).map((t) => t.split(":")[1].replace(/-/g, " ")).join(", "), stripPreferClauses(r.useFor ?? r.summary ?? r.notes ?? "")].join(". ").slice(0, 600);
const t0 = Date.now();
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
console.log("model loaded", Date.now() - t0, "ms");
const embed = async (texts) => {
  const out = [];
  for (let i = 0; i < texts.length; i += 32) {
    const t = await extractor(texts.slice(i, i + 32), { pooling: "mean", normalize: true });
    const dims = t.dims[1];
    for (let j = 0; j < t.dims[0]; j++) out.push(Array.from(t.data.slice(j * dims, (j + 1) * dims)));
  }
  return out;
};
const t1 = Date.now();
const docVecs = await embed(records.map(docText));
console.log("indexed", records.length, "records in", Date.now() - t1, "ms");
const t2 = Date.now();
const needVecs = await embed(held.map((n) => readNeed(n.need)));
const perLookup = (Date.now() - t2) / held.length;
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
let t1h = 0, t3h = 0, t10h = 0;
const cands = [];
held.forEach((n, i) => {
  const ranked = records.map((r, k) => ({ name: r.name, depth: r.depth, s: cos(needVecs[i], docVecs[k]) })).sort((a, b) => b.s - a.s).slice(0, 15);
  const got = ranked.map((x) => x.name);
  const pos = got.findIndex((x) => n.expect.includes(x));
  if (pos === 0) t1h++; if (pos >= 0 && pos < 3) t3h++; if (pos >= 0 && pos < 10) t10h++;
  cands.push({ id: i + 1, need: n.need, candidates: ranked.map((x) => `${x.name} (${x.depth ?? "?"}) ${(records.find((r) => r.name === x.name).useFor || records.find((r) => r.name === x.name).summary || "").replace(/\s+/g, " ").slice(0, 100)}`), scores: ranked.map((x) => Math.round(x.s * 1000) / 1000) });
});
console.log(`MiniLM held-out: top1 ${t1h}/44 top3 ${t3h}/44 top10 ${t10h}/44, ${perLookup.toFixed(0)} ms/lookup (embedding the need; ranking is sub-ms)`);
writeFileSync(process.argv[2], JSON.stringify(cands));
