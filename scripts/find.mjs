#!/usr/bin/env node
// ============================================
// SUI component finder — the biggest component that covers a described need.
// --------------------------------------------
// `npm run find -- "<need>"` ranks catalog.json against a need phrased the
// way a brief or a builder phrases it ("a sidebar grouped by state with
// counts", "the current step in a workflow, animated") and answers with the
// most composed component that covers it, then the smaller SUI parts that
// component is made of. The trigger (2026-10-20): an engineer built a new
// SequenceFlow although SwimlaneChart (current-step-in-workflow, animated)
// already existed — the old keyword ranker (`catalog.mjs --find`, kept as
// `npm run find:legacy`) only matched words that happened to be in the
// COMPONENTS.md bullet.
//
// ── How a need becomes tags ──────────────────────────────────────────────────
// Every base component file carries a `Tags:` line (facets shows / does /
// data / role, closed vocabulary in scripts/tags-vocabulary.json; see
// catalog.mjs `parseTags`). A need is turned into the same tags two ways:
//   1. a query word that IS a vocabulary word ("table", "timeline", "drag")
//      maps to that word in every facet that has it;
//   2. scripts/find-lexicon.json maps builder phrasings to tags ("sidebar"
//      → role:rail, "owner" → shows:avatar, "steps" → data:steps). The
//      lexicon is tuned against the TUNING split of scripts/find-bench.json
//      only; the held-out split is the honest number (scripts/find-bench.mjs).
//
// ── Ranking ──────────────────────────────────────────────────────────────────
//   score = tag score (facet-weighted hits on the inferred tags, scaled by
//           how much of the need the record covers)
//         + prose score (query words found in useFor / summary / notes / name,
//           "reach for X first" clauses stripped, as the legacy ranker does)
//         + name bonus (the need names the component)
//         − penalties (factory: a builder wants the curried component, not
//           `createX`; a variant with baked overrides below its default
//           sibling; deprecated)
// then "biggest applicable": inside the band of records scoring within
// TIE_BAND of the best, the highest depth wins (Peter's 2026-09-27 ruling:
// use the largest component that satisfies the use case), and a record whose
// own bullet says "reach for C first" never outranks C. Every result carries
// `why` (tags hit, words hit, depth, penalties) in text and `--json` output.
//
// ── CLI ──────────────────────────────────────────────────────────────────────
//   node scripts/find.mjs "<need>"              # top 5, with parts and why
//   node scripts/find.mjs "<need>" --json       # machine-readable
//   node scripts/find.mjs "<need>" --top 10
//   node scripts/find.mjs "<need>" --no-lexicon # vocabulary words only (the pre-tuning ranker)
// ============================================
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { length } from "./fn.mjs";
import { stripPreferClauses, loadTagVocabulary } from "./catalog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(root, "catalog.json");
const LEXICON_PATH = join(root, "scripts", "find-lexicon.json");

// ── tunables (all in one place so the bench can report what moved) ──────────
export const WEIGHTS = {
  facet: { shows: 3, data: 2.5, does: 2, role: 1.5 },
  prose: { useFor: 1.2, summary: 0.8, notes: 0.6, name: 1.5 },
  proseCap: 6, // prose can refine a tag match, never replace it
  nameBonus: 5,
  headBoost: 2, // the need's first `shows:` tag counts double
  factoryPenalty: 1.5,
  overriddenVariantPenalty: 0.75,
  deprecatedPenalty: 4,
  tieBand: 0.9, // records within 90% of the best score compete on depth
};

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "in",
  "on",
  "to",
  "for",
  "with",
  "is",
  "are",
  "be",
  "and",
  "or",
  "its",
  "it",
  "that",
  "this",
  "as",
  "at",
  "by",
  "i",
  "we",
  "need",
  "want",
  "show",
  "shows",
  "showing",
  "display",
  "displays",
  "one",
  "some",
  "each",
  "per",
  "into",
  "from",
  "over",
  "under",
  "my",
  "our",
  "their",
  "when",
  "where",
  "which",
  "what",
  "has",
  "have",
  "like",
  "should",
  "can",
  "so",
  "up",
]);

/** Tiny stemmer: enough to make "charts" / "chart", "dragging" / "drag",
 *  "grouped" / "group" meet. Not linguistics; a lookup aid. */
export const stem = (w) => {
  if (w.length <= 3) return w;
  return w
    .replace(/ies$/, "y")
    .replace(/(sses|shes|ches|xes)$/, (m) => m.slice(0, -2))
    .replace(/ing$/, "")
    .replace(/ed$/, "")
    .replace(/([b-df-hj-np-tv-z])\1$/, "$1") // dragg → drag, stopp → stop
    .replace(/s$/, "");
};

/** Ranker v2's pre-read of a need (diddit #4161 round 2). The quoted held-out
 *  set (sketch gap lists, briefs, gaps.json) reads differently from an
 *  authored sentence: it says what the thing is NOT ("not a table", "no status
 *  pill", "instead of the chip"), it quotes UI strings ("Filter tasks",
 *  "▽ Oldest") whose words are app nouns, and a gaps.json title is a coined
 *  PascalCase name (`TaskStepsTable`) whose words are the need. So:
 *   1. quoted strings go;
 *   2. a negated clause goes, from the negation to the next comma, semicolon,
 *      period or closing bracket: "not a X", "no X", "never X", "without X",
 *      "instead of X", "rather than X";
 *   3. PascalCase / camelCase splits into words.
 *  Pure; `scoreRecord` never sees the original. */
export const stripNegations = (text) =>
  text
    // a quoted UI string of two or more words is app text ("Filter tasks",
    // "▽ Oldest"); a single quoted word is usually the thing itself ("Logs")
    .replace(/["“”]([^"“”]*)["“”]/g, (m, inner) =>
      inner.trim().split(/\s+/).length >= 2 ? " " : ` ${inner} `,
    )
    .replace(
      /\b(?:not|no|never|without|instead of|rather than|nor)\b[^,;.()\]]*/gi,
      " ",
    )
    .replace(/\s{2,}/g, " ")
    .trim();

export const splitCamel = (text) =>
  text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

export const readNeed = (text, { v2 = true } = {}) =>
  v2 ? splitCamel(stripNegations(text)) : text;

export const tokenize = (text) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t));

export const loadLexicon = (path = LEXICON_PATH) =>
  existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};

/** The vocabulary grouped by value: "table" → ["shows:table", "data:table"]. */
const byValue = (vocab) => {
  const m = new Map();
  for (const tag of vocab) {
    const value = tag.split(":")[1];
    if (!m.has(value)) m.set(value, []);
    m.get(value).push(tag);
  }
  return m;
};

/** Need → inferred tags, with the evidence for each (which word or phrase
 *  produced it) and the position it was found at.
 *
 *  Order matters, twice over:
 *  1. Lexicon phrases are matched longest-first and CONSUME their words, so
 *     "top bar" reads as role:header and never also as shows:bar, and "actions
 *     bar" as a toolbar — the bare vocabulary word only fires on what is left.
 *  2. The first `shows:` tag by position is the HEAD of the need ("an inline
 *     sparkline inside a table cell" is about a sparkline, not a cell) and
 *     scores double. Builders lead with the thing, then say where it sits.
 *  A need that names no interaction is a display need: `does:view` is
 *  implied, so an editor does not outrank a renderer on a "show me X" need. */
const HEAD_EXCLUDE = new Set(["shows:panel", "shows:text"]);

export function inferTags(query, { vocab, lexicon = {}, v2 = true }) {
  const tokens = tokenize(readNeed(query, { v2 }));
  const stems = tokens.map(stem);
  let stemText = ` ${stems.join(" ")} `;
  const found = new Map(); // tag -> { why: Set, at: number }
  const add = (tag, why, at) => {
    if (!found.has(tag)) found.set(tag, { why: new Set(), at });
    const f = found.get(tag);
    f.why.add(why);
    f.at = Math.min(f.at, at);
  };
  const phrases = Object.keys(lexicon)
    .filter((k) => !k.startsWith("$"))
    .map((phrase) => ({ phrase, p: tokenize(phrase).map(stem).join(" ") }))
    .filter((x) => x.p)
    .sort((a, b) => b.p.length - a.p.length);
  for (const { phrase, p } of phrases) {
    const idx = stemText.indexOf(` ${p} `);
    if (idx === -1) continue;
    for (const t of lexicon[phrase]) add(t, phrase, idx);
    // consume: blank the phrase so shorter phrases and bare words skip it
    stemText =
      stemText.slice(0, idx + 1) +
      " ".repeat(p.length) +
      stemText.slice(idx + 1 + p.length);
  }
  const values = byValue(vocab);
  for (const [value, tags] of values) {
    const v = value.replace(/-/g, " ").split(" ").map(stem).join(" ");
    const idx = stemText.indexOf(` ${v} `);
    if (idx !== -1) for (const t of tags) add(t, value, idx);
  }
  const tags = [...found.entries()]
    .map(([tag, { why, at }]) => ({ tag, why: [...why], at }))
    .sort((a, b) => a.at - b.at);
  // "panel" and "text" are too generic to be the thing a need is about
  // ("a panel lists the log lines" is about the log, not the panel).
  const head = tags.find(
    (t) => t.tag.startsWith("shows:") && !HEAD_EXCLUDE.has(t.tag),
  );
  if (head) head.head = true;
  if (!tags.some((t) => t.tag.startsWith("does:")) && length(tags) > 0)
    tags.push({
      tag: "does:view",
      why: ["implied: no interaction named"],
      at: Infinity,
      implied: true,
    });
  return { tokens, tags };
}

const proseText = (record, field) => {
  const v = record[field];
  if (!v) return "";
  return stripPreferClauses(
    Array.isArray(v) ? v.join(" ") : String(v),
  ).toLowerCase();
};

const isDeprecated = (r) =>
  /deprecated/i.test(`${r.summary ?? ""} ${r.notes ?? ""}`.slice(0, 200));

/** Score one record against an inferred need. Pure. */
export function scoreRecord(record, need, W = WEIGHTS) {
  const why = { tags: [], words: [], penalties: [] };
  let tagScore = 0;
  let weightTotal = 0;
  const own = new Set(record.tags ?? []);
  for (const { tag, head } of need.tags) {
    const facet = tag.split(":")[0];
    const w = (W.facet[facet] ?? 1) * (head ? W.headBoost : 1);
    weightTotal += w;
    if (own.has(tag)) {
      tagScore += w;
      why.tags.push(tag);
    }
  }
  // coverage: a record that carries 4 of the need's 4 tags beats one that
  // carries 2 of 4 by more than the raw sum says — the need is "all of this".
  const coverage = weightTotal > 0 ? tagScore / weightTotal : 0;
  tagScore = tagScore * (0.5 + coverage);

  let prose = 0;
  const stems = new Set(need.tokens.map(stem));
  for (const [field, w] of Object.entries(W.prose)) {
    const hay =
      field === "name" ? record.name.toLowerCase() : proseText(record, field);
    if (!hay) continue;
    const hayStems = new Set(tokenize(hay).map(stem));
    for (const s of stems)
      if (hayStems.has(s) || (field === "name" && hay.includes(s))) {
        prose += w;
        why.words.push(`${field}:${s}`);
      }
  }
  prose = Math.min(prose, W.proseCap);

  let bonus = 0;
  const joined = need.tokens.join("");
  const nameLower = record.name.toLowerCase();
  if (
    joined.length >= 4 &&
    (joined.includes(nameLower) || nameLower === need.tokens.join(""))
  ) {
    bonus += W.nameBonus;
    why.words.push(`name:${record.name}`);
  }

  let penalty = 0;
  if (record.kind === "factory") {
    penalty += W.factoryPenalty;
    why.penalties.push("factory");
  }
  if (
    record.kind === "variant" &&
    record.variantOf &&
    /\S/.test(record.variantOf.overrides.replace(/[{}\s]/g, ""))
  ) {
    penalty += W.overriddenVariantPenalty;
    why.penalties.push("variant-with-overrides");
  }
  if (isDeprecated(record)) {
    penalty += W.deprecatedPenalty;
    why.penalties.push("deprecated");
  }

  const score = tagScore + prose + bonus - penalty;
  return {
    score: Math.round(score * 100) / 100,
    tagScore,
    prose,
    bonus,
    penalty,
    coverage,
    why,
  };
}

/** The depth the "biggest" rule compares on. A record whose own header has
 *  no canonical depth line (56 base records at 0.230.0, e.g. the
 *  `SwimlaneChart` alias in variants.ts, `GroupedSelector`'s "Composed
 *  (Depth 2, …)" prose) still usually SAYS its depth in its summary; failing
 *  that, the deepest tagged sibling in its family stands in. */
export const effectiveDepth = (record, records) => {
  if (record.depth != null) return record.depth;
  const m = /Depth\s*([0-9])/.exec(
    `${record.summary ?? ""} ${record.notes ?? ""}`,
  );
  if (m) return Number(m[1]);
  let best = null;
  for (const r of records)
    if (
      r.family === record.family &&
      r.depth != null &&
      (best === null || r.depth > best)
    )
      best = r.depth;
  if (best !== null) return best;
  // last resort: the catalog's own primitive/composite classification
  return record.kind === "composite"
    ? 2
    : record.kind === "primitive"
      ? 1
      : null;
};

/** Rank: score, then "biggest applicable" inside the tie band, then
 *  preferFirst edges (a part never outranks the composite its bullet names). */
export function rank(records, need, { top = 5, W = WEIGHTS } = {}) {
  const scored = records
    .map((record) => ({
      record,
      depth: effectiveDepth(record, records),
      ...scoreRecord(record, need, W),
    }))
    .filter(
      (r) => r.score > 0 && (r.tagScore > 0 || r.bonus > 0 || r.prose >= 2),
    );
  const best = Math.max(0, ...scored.map((r) => r.score));
  const band = best * W.tieBand;
  const matched = new Set(scored.map((r) => r.record.name));
  // families with a plain (unpenalised) record inside the band: their
  // curried/factory kin do not get depth priority over that plain record.
  const prefers = (a, b) =>
    Array.isArray(a.record.preferFirst) &&
    a.record.preferFirst.includes(b.record.name) &&
    matched.has(b.record.name);
  scored.sort((a, b) => {
    if (prefers(a, b) && !prefers(b, a)) return 1;
    if (prefers(b, a) && !prefers(a, b)) return -1;
    const aIn = a.score >= band;
    const bIn = b.score >= band;
    if (aIn && bIn) {
      // Depth 0 and 1 are both the Primitive layer (adherence.mjs
      // `isPrimitiveDepth`): `AppShell` (Depth 0, the older label) is not
      // smaller than `Page` (Depth 1).
      const level = (x) => (x.depth == null ? -1 : Math.max(x.depth, 1));
      const d = level(b) - level(a);
      if (d !== 0) return d;
      // same depth: the plain component before its curried/factory kin
      const p = a.penalty - b.penalty;
      if (p !== 0) return p;
    }
    return b.score - a.score || a.record.name.localeCompare(b.record.name);
  });
  for (const r of scored) r.inBand = r.score >= band;
  return scored.slice(0, top);
}

// ── parts: the SUI components a file imports ────────────────────────────────
const partsCache = new Map();
/** Names of catalog components imported by the record's file from sibling
 *  component directories (`../Chart`, `../Layout/variants`, `./Foo`). */
export function partsOf(record, records, readSrc) {
  const key = record.file;
  if (partsCache.has(key)) return partsCache.get(key);
  const names = new Set(records.map((r) => r.name));
  const out = new Set();
  try {
    const src = readSrc(record.file);
    for (const m of src.matchAll(
      /import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*["'](\.\.?\/[^"']*)["']/g,
    )) {
      if (/^\.\.\/\.\./.test(m[2])) continue; // fn / internal, not components
      for (const raw of m[1].split(",")) {
        const name = raw
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/)[0]
          .trim();
        if (name && names.has(name) && name !== record.name) out.add(name);
      }
    }
  } catch {
    /* unreadable file: no parts */
  }
  const list = [...out].sort();
  partsCache.set(key, list);
  return list;
}

export function find(
  query,
  { records, vocab, lexicon, top = 5, readSrc, W = WEIGHTS, v2 = true },
) {
  const need = inferTags(query, { vocab, lexicon, v2 });
  const ranked = rank(records, need, { top, W });
  return {
    query,
    inferred: need.tags,
    results: ranked.map((r) => ({
      name: r.record.name,
      depth: r.depth,
      kind: r.record.kind,
      family: r.record.family,
      score: r.score,
      inBand: r.inBand,
      coverage: Math.round(r.coverage * 100) / 100,
      tagsHit: r.why.tags,
      wordsHit: r.why.words,
      penalties: r.why.penalties,
      parts: readSrc ? partsOf(r.record, records, readSrc) : [],
      summary: r.record.useFor ?? r.record.summary ?? r.record.notes ?? null,
      showcase: r.record.showcase,
      file: r.record.file,
    })),
  };
}

export const loadRecords = (path = CATALOG_PATH) =>
  JSON.parse(readFileSync(path, "utf8"));

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const noLexicon = argv.includes("--no-lexicon");
  const v1 = argv.includes("--v1"); // ranker v1: no negation/quote stripping, the v1 lexicon
  const topIdx = argv.indexOf("--top");
  const top = topIdx !== -1 ? Number(argv[topIdx + 1]) : 5;
  const query = argv
    .filter(
      (a, i) => !a.startsWith("--") && !(topIdx !== -1 && i === topIdx + 1),
    )
    .join(" ");
  if (!query) {
    console.error(
      'usage: npm run find -- "<need>" [--json] [--top N] [--no-lexicon]',
    );
    process.exit(2);
  }
  if (!existsSync(CATALOG_PATH)) {
    console.error("catalog.json does not exist — run `npm run catalog` first.");
    process.exit(1);
  }
  const out = find(query, {
    records: loadRecords(),
    vocab: loadTagVocabulary(root),
    lexicon: noLexicon
      ? {}
      : v1
        ? loadLexicon(join(root, "scripts", "find-lexicon-v1.json"))
        : loadLexicon(),
    v2: !v1,
    top,
    readSrc: (f) => readFileSync(join(root, f), "utf8"),
  });
  if (json) {
    console.log(JSON.stringify(out, null, 2));
  } else {
    console.log(`Need: "${out.query}"`);
    if (!v1 && readNeed(out.query) !== out.query)
      console.log(`Read after stripping: "${readNeed(out.query)}"`);
    console.log(
      `Read as: ${out.inferred.map((t) => `${t.tag}${t.head ? " [head]" : ""} (${t.why.join("/")})`).join(", ") || "(no tags inferred — prose only)"}\n`,
    );
    for (const [i, r] of out.results.entries()) {
      console.log(
        `${String(i + 1).padStart(2)}. ${r.name}  depth=${r.depth ?? "?"} ${r.kind}  score=${r.score}${r.inBand ? "" : " (below band)"}`,
      );
      if (r.summary)
        console.log(`    ${r.summary.replace(/\s+/g, " ").slice(0, 160)}`);
      console.log(
        `    why: tags ${r.tagsHit.length ? r.tagsHit.join(" ") : "-"}; words ${r.wordsHit.length ? r.wordsHit.join(" ") : "-"}${r.penalties.length ? `; penalties ${r.penalties.join(" ")}` : ""}`,
      );
      if (r.parts.length) console.log(`    made of: ${r.parts.join(", ")}`);
    }
  }
}
