#!/usr/bin/env node
// ============================================
// catalog-index.md — the whole component catalog as one compact page a model
// can read in one go (diddit #4161 round 2: "the builder is a model, so it
// may do better reading a compact index than calling a ranker").
// --------------------------------------------
// One line per base component (primitive / composite / factory record in
// catalog.json): name, depth, the `Tags:` words, the first sentence of its
// doc, and the names of its curried variants folded in. Sized to stay under
// about 15k tokens (`--check` fails above MAX_CHARS).
//
//   node scripts/catalog-index.mjs            # write catalog-index.md
//   node scripts/catalog-index.mjs --check    # exit 1 if stale or too big
// ============================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "catalog-index.md");
const MAX_CHARS = 60_000; // ~15k tokens at 4 chars per token

const firstSentence = (s) =>
  (s ?? "")
    .replace(/\s+/g, " ")
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .split(/(?<=[.;])\s/)[0]
    .slice(0, 80);

const shortTags = (tags) =>
  (tags ?? [])
    .map((t) => t.replace(/^shows:/, "").replace(/^does:/, "~").replace(/^data:/, "=").replace(/^role:/, "@"))
    .join(" ");

export function buildIndex(records) {
  const base = records.filter((r) => r.kind !== "variant");
  const variantsOf = new Map();
  for (const r of records) {
    if (r.kind !== "variant" || !r.variantOf) continue;
    const f = r.variantOf.factory;
    if (!variantsOf.has(f)) variantsOf.set(f, []);
    variantsOf.get(f).push(r.name);
  }
  const lines = [
    "# SUI component index",
    "",
    "One line per component: `Name (depth) tags — doc`. Tag facets: plain = what it shows, `~` = interaction, `=` = data shape, `@` = where it sits. Higher depth = more composed; reach for the highest depth that covers the need. `variants:` are curried, data-only names of the factory on that line.",
    "",
  ];
  for (const r of base.sort((a, b) => a.name.localeCompare(b.name))) {
    const doc = firstSentence(r.useFor ?? r.summary ?? r.notes);
    const vs = variantsOf.get(r.name) ?? [];
    const vtext = vs.length ? ` variants: ${vs.slice(0, 6).join(", ")}${vs.length > 6 ? ` +${vs.length - 6}` : ""}` : "";
    const depth = r.depth ?? (/Depth\s*([0-9])/.exec(`${r.summary ?? ""} ${r.notes ?? ""}`)?.[1] ?? (r.kind === "composite" ? 2 : 1));
    lines.push(`${r.name} (${depth}) ${shortTags(r.tags)} — ${doc}${vtext}`);
  }
  return `${lines.join("\n")}\n`;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const records = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8"));
  const text = buildIndex(records);
  const tokens = Math.round(text.length / 4);
  if (process.argv.includes("--check")) {
    const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;
    if (current !== text || text.length > MAX_CHARS) {
      console.error(`catalog-index.md is ${current !== text ? "stale" : "too big"} (${text.length} chars, ~${tokens} tokens). Run \`npm run catalog:index\`.`);
      process.exit(1);
    }
    console.log(`catalog-index.md is fresh (~${tokens} tokens).`);
    process.exit(0);
  }
  writeFileSync(OUT, text);
  console.log(`catalog-index.md written: ${text.split("\n").length - 5} lines, ${text.length} chars, ~${tokens} tokens${text.length > MAX_CHARS ? " (OVER BUDGET)" : ""}.`);
}
