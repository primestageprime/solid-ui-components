#!/usr/bin/env node
// ============================================
// Duplicate guard — "is there already a component for this?" (diddit #4161)
// --------------------------------------------
// Peter, 2026-10-20: a finder that "never fails to find a component that
// already exists", and a backstop when a builder adds a new component or
// module anyway. This runs the recall-first candidate set
// (scripts/find-recall.mjs: ranker v2 ∪ BM25, ∪ MiniLM when supplied) on the
// NEW thing's name and description and prints the likely existing
// equivalents, each with its full doc entry, so the builder (or a reader
// model) can say which one it is a duplicate of — or write the three-line
// justification AGENT_GUIDE's push-back protocol asks for.
//
// Where it runs (proposal, prototype here):
//   1. `npm run new:component -- <Name> --depth N` calls it first and prints
//      the equivalents before scaffolding (advisory; `--description` sharpens
//      it). Additive: nothing refuses yet.
//   2. The pre-push gate can call `--since origin/main`: every new
//      `src/components/<Dir>` directory on the branch is checked from its own
//      header summary, and the report is printed with the gate output.
//   3. The singularity canon check can call it on every GapBox title before
//      a builder is allowed to write new markup.
//
//   node scripts/dup-guard.mjs <Name> ["<description>"] [--k 8] [--json]
//   node scripts/dup-guard.mjs --since origin/main
// Exit 2 when a likely equivalent is found (a candidate surfaced by two or
// more retrievers, or whose name shares a word with the new name), 0 otherwise.
// ============================================
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTagVocabulary } from "./catalog.mjs";
import { loadLexicon, loadRecords, splitCamel } from "./find.mjs";
import { buildBm25 } from "./find-bm25.mjs";
import { candidateSet, entryFor } from "./find-recall.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export function guard(name, description, ctx, { k = 8 } = {}) {
  const need = `${splitCamel(name)}. ${description ?? ""}`.trim();
  const cands = candidateSet(need, { ...ctx, k }).slice(0, k);
  const words = new Set(
    splitCamel(name)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
  return cands.map((c) => {
    const shared = splitCamel(c.name)
      .toLowerCase()
      .split(/\s+/)
      .some((w) => words.has(w));
    const likely = c.via.length >= 2 || shared;
    return {
      name: c.name,
      via: c.via,
      likely,
      entry: entryFor(ctx.byName.get(c.name), ctx.componentsMd),
    };
  });
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = (n, d) =>
    argv.indexOf(n) === -1 ? d : argv[argv.indexOf(n) + 1];
  const records = loadRecords();
  const ctx = {
    records,
    byName: new Map(records.map((r) => [r.name, r])),
    vocab: loadTagVocabulary(root),
    lexicon: loadLexicon(),
    bm25: buildBm25(records),
    componentsMd: readFileSync(join(root, "COMPONENTS.md"), "utf8"),
  };
  const k = Number(opt("--k", 8));
  const targets = [];
  if (argv.includes("--since")) {
    const base = opt("--since", "origin/main");
    const dirs = execSync(
      `git diff --name-only --diff-filter=A ${base} -- src/components`,
      { cwd: root, encoding: "utf8" },
    )
      .split("\n")
      .map((f) => f.split("/")[2])
      .filter(Boolean);
    for (const dir of [...new Set(dirs)]) {
      const file = join(root, "src/components", dir, `${dir}.tsx`);
      const src = existsSync(file) ? readFileSync(file, "utf8") : "";
      const header = src
        .split("\n")
        .slice(0, 12)
        .join(" ")
        .replace(/[/*]/g, " ")
        .replace(/\s+/g, " ");
      targets.push({ name: dir, description: header.slice(0, 300) });
    }
  } else {
    const positional = argv.filter(
      (a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")),
    );
    if (!positional[0]) {
      console.error(
        'usage: node scripts/dup-guard.mjs <Name> ["<description>"] [--k 8] [--json] | --since <ref>',
      );
      process.exit(1);
    }
    targets.push({
      name: positional[0],
      description: positional.slice(1).join(" "),
    });
  }
  let flagged = false;
  const out = [];
  for (const t of targets) {
    const result = guard(t.name, t.description, ctx, { k });
    out.push({ ...t, equivalents: result });
    if (result.some((r) => r.likely)) flagged = true;
    if (!argv.includes("--json")) {
      console.log(
        `\n${t.name}: ${result.some((r) => r.likely) ? "LIKELY EXISTING EQUIVALENT" : "no strong match"} — check before building`,
      );
      for (const r of result)
        console.log(
          `  ${r.likely ? "!" : " "} ${r.name} [${r.via.join("+")}]\n      ${r.entry.slice(0, 180)}`,
        );
    }
  }
  if (argv.includes("--json")) console.log(JSON.stringify(out, null, 2));
  process.exit(flagged ? 2 : 0);
}
