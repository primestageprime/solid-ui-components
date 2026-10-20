#!/usr/bin/env node
// ============================================
// Local embeddings over the catalog — the third retriever of the recall-first
// finder (scripts/find-recall.mjs; diddit #4161). MiniLM
// (Xenova/all-MiniLM-L6-v2, int8) through @huggingface/transformers, a SUI
// devDependency since 2026-10-20 (manager approval on #4161): one vector per
// catalog record, cosine ranking of the need. The model downloads once
// (~23 MB, Hugging Face hub cache); the record vectors are cached in
// node_modules/.cache keyed by the catalog's text, so a lookup after the
// first costs the model load (~8 s) plus a few ms.
//
// On the 44 quoted held-out needs alone: 41% / 57% / 33 of 44 at k=10; in
// union with ranker v2 it lifted candidate recall from 41 to 44 of 44.
//
//   node scripts/find-embed.mjs "<need>" [--top N]
// ============================================
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripPreferClauses } from "./catalog.mjs";
import { readNeed, splitCamel, loadRecords } from "./find.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(root, "node_modules", ".cache", "sui-find-embeddings.json");
const MODEL = "Xenova/all-MiniLM-L6-v2";

export const docText = (r) =>
  [
    splitCamel(r.name),
    (r.tags ?? []).map((t) => t.split(":")[1].replace(/-/g, " ")).join(", "),
    stripPreferClauses(r.useFor ?? r.summary ?? r.notes ?? ""),
  ]
    .join(". ")
    .slice(0, 600);

const cos = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

/** Builds (or loads from cache) one vector per record and returns a ranker.
 *  Resolves to null when the model cannot be loaded (no network for the
 *  first download, dependency missing) so callers can fall back. */
export async function createEmbedRanker(records) {
  let pipeline;
  try {
    ({ pipeline } = await import("@huggingface/transformers"));
  } catch {
    return null;
  }
  const texts = records.map(docText);
  const key = createHash("sha1")
    .update(MODEL + texts.join("\n"))
    .digest("hex");
  let vectors = null;
  if (existsSync(CACHE)) {
    try {
      const c = JSON.parse(readFileSync(CACHE, "utf8"));
      if (c.key === key) vectors = c.vectors;
    } catch {
      /* rebuild */
    }
  }
  let extractor;
  try {
    extractor = await pipeline("feature-extraction", MODEL, { dtype: "q8" });
  } catch {
    return null;
  }
  const embed = async (list) => {
    const out = [];
    for (let i = 0; i < list.length; i += 32) {
      const t = await extractor(list.slice(i, i + 32), {
        pooling: "mean",
        normalize: true,
      });
      const dims = t.dims[1];
      for (let j = 0; j < t.dims[0]; j++)
        out.push(Array.from(t.data.slice(j * dims, (j + 1) * dims)));
    }
    return out;
  };
  if (!vectors) {
    vectors = await embed(texts);
    mkdirSync(dirname(CACHE), { recursive: true });
    writeFileSync(CACHE, JSON.stringify({ key, vectors }));
  }
  return {
    async rank(need, top = 20) {
      const [q] = await embed([readNeed(need)]);
      return records
        .map((record, i) => ({
          record,
          score: Math.round(cos(q, vectors[i]) * 1000) / 1000,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, top);
    },
  };
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const topIdx = argv.indexOf("--top");
  const top = topIdx !== -1 ? Number(argv[topIdx + 1]) : 5;
  const need = argv
    .filter((a, i) => !a.startsWith("--") && i !== topIdx + 1)
    .join(" ");
  const ranker = await createEmbedRanker(loadRecords());
  if (!ranker) {
    console.error(
      "embeddings unavailable (model or @huggingface/transformers not loadable)",
    );
    process.exit(1);
  }
  for (const [i, r] of (await ranker.rank(need, top)).entries())
    console.log(
      `${i + 1}. ${r.record.name} (${r.record.depth ?? "?"}) ${r.score}`,
    );
}
