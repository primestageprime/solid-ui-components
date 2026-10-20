#!/usr/bin/env node
// ============================================
// Three outcomes for a find (diddit #4163; Peter, 2026-10-20: "1) Exact match
// - short circuit 2) Close cousin match - keep searching until you run out of
// alternatives 3) No match - add component to the gap list").
// --------------------------------------------
// Every need ends in exactly one of:
//   exact   the biggest component that fully covers the need; found on the
//           fast path (ranker v2, scripts/find.mjs) and returned at once —
//           no second retriever, no model load, no tokens;
//   cousin  nothing covers the whole need, but a component covers its SHAPE
//           (a chart over time, a grid of cells, a slider): the whole union
//           candidate set (ranker v2 ∪ BM25 ∪ MiniLM, scripts/find-recall.mjs)
//           is walked to the end before the nearest is chosen as the
//           PLACEHOLDER, and a gap record says what is missing;
//   none    no component reaches the need's shape: a `GapBox` (the existing
//           SUI placeholder: title / kind / nearest / props) stands in, and a
//           gap record names the missing component.
//
// ── Signals (zero tokens) ───────────────────────────────────────────────────
// For a candidate C against a need N:
//   tagCov   the share of N's inferred tags that C carries (facet-weighted,
//            `scoreRecord(...).coverage`): how much of the need's SHAPE C has;
//   wordCov  the share of N's content words that are EXPLAINED — reached a
//            tag through the vocabulary / lexicon, or appear in C's name or
//            COMPONENTS.md bullet: how much of the need's WORDING C answers;
//   fit      0.6 · tagCov + 0.4 · wordCov, the walk's ordering key, biggest
//            depth first inside a fit tie.
// The words left unexplained by the best candidate are the need's DEFINING
// words ("candlestick", "pie", "map", "signature"): a cousin and a none both
// have them; what separates them is whether any component still covers the
// need's shape (tagCov).
//
//   node scripts/find-outcome.mjs "<need>" [--json] [--gaps <app>/gaps.json] [--no-embed]
// ============================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { componentsMdBulletFor, loadTagVocabulary } from "./catalog.mjs";
import {
  effectiveDepth,
  find,
  inferTags,
  loadLexicon,
  loadRecords,
  scoreRecord,
  splitCamel,
  stripNegations,
  stem,
  tokenize,
} from "./find.mjs";
import { buildBm25 } from "./find-bm25.mjs";
import { candidateSetLive } from "./find-recall.mjs";
import { createEmbedRanker } from "./find-embed.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Thresholds, in one place so the bench can say what moved. Tuned on the odd
 *  half of scripts/find-outcomes-bench.json; the even half is the held-out
 *  number (scripts/find-outcomes-bench.mjs). */
export const OUTCOME = {
  exactTagCov: 0.4, // the pick carries ≥ 40% of the need's shape …
  exactWordCov: 0.7, // … explains ≥ 70% of its words, and none of its DEFINING words is unexplained
  noneTagCov: 0.5, // no candidate carries half the shape: nothing is near
  defining: 3, // the need's first N content words define it ("a PIE chart", "a KANBAN board")
  nameBonus: 0.2, // a defining word in the candidate's name: the need names it
  fullWording: 0.9, // wording this well explained lowers the shape bar …
  fullWordingTagCov: 0.3, // … to this (inferred tags are noisy: "state" → shows:status)
  commonWord: 15, // a word this many catalog entries use is a common noun ("task"), never defining
  kindPenalty: { factory: 0.05, variant: 0.03 }, // the plain component before its curried kin on a fit tie
  fitTagWeight: 0.4,
  k: 20,
};

// words a need uses to ask, not to describe: never "unexplained"
const ASK_WORDS = new Set(
  [
    "user",
    "users",
    "reader",
    "person",
    "click",
    "clicks",
    "open",
    "opens",
    "must",
    "also",
    "takes",
    "take",
    "shown",
    "its",
    "own",
    "the",
    "then",
    "along",
    "across",
    "between",
    "inside",
    "around",
    "before",
    "after",
    "on",
    "with",
    "without",
    "per",
    "each",
    "any",
    "all",
    "more",
    "than",
    "down",
    "side",
    "top",
    "left",
    "right",
    "centre",
    "center",
    "bottom",
    "chosen",
    "mouse",
    "finger",
    "page",
    "app",
  ].map(stem),
);

const contentStem = (w) => stem(w.replace(/(able|ible)$/, ""));
// camelCase splits only for coined names (`TaskStepsTable`), not "LaTeX" / "OHLC"
const contentStems = (need) =>
  [
    ...new Set(
      tokenize(
        stripNegations(need).replace(
          /\b[A-Za-z][a-z]+(?:[A-Z][a-z]+){2,}\b/g,
          (m) => splitCamel(m),
        ),
      ).map(contentStem),
    ),
  ].filter((s) => !ASK_WORDS.has(s) && s.length > 1);

/** The stems a need's inferred tags were produced from (vocabulary words and
 *  lexicon phrases): these words are explained by the shape itself. */
const reachedStems = (inferred) => {
  const out = new Set();
  for (const t of inferred.tags)
    for (const why of t.why)
      if (!why.startsWith("implied"))
        for (const s of tokenize(why).map(contentStem)) out.add(s);
  return out;
};

const entryStems = (record, componentsMd) => {
  // a factory / variant has its family's bullet (createStatusFlowChart → StatusFlowChart)
  const bullet = `${componentsMdBulletFor(componentsMd, record.name) ?? ""} ${record.family && record.family !== record.name ? (componentsMdBulletFor(componentsMd, record.family) ?? "") : ""}`;
  const text = `${record.name.replace(/([a-z0-9])([A-Z])/g, "$1 $2")} ${bullet} ${record.useFor ?? ""} ${record.summary ?? ""} ${record.notes ?? ""}`;
  return new Set(tokenize(text).map(contentStem));
};

/** Score one candidate's fit to the need. Pure. */
export function fitOf(record, need, ctx, W = OUTCOME) {
  const { tagCov } = { tagCov: scoreRecord(record, need.inferred).coverage };
  const stems = entryStems(record, ctx.componentsMd);
  const explained = need.stems.filter(
    (s) => need.reached.has(s) || stems.has(s),
  );
  const wordCov = need.stems.length ? explained.length / need.stems.length : 0;
  const unexplained = need.stems.filter(
    (s) => !need.reached.has(s) && !stems.has(s),
  );
  const defining = unexplained.filter(
    (s) =>
      need.stems.indexOf(s) < W.defining &&
      (ctx.wordCount?.get(s) ?? 0) < W.commonWord,
  );
  const nameStems = new Set(
    tokenize(record.name.replace(/([a-z0-9])([A-Z])/g, "$1 $2")).map(
      contentStem,
    ),
  );
  // the need NAMES the component: a defining word that is not a vocabulary word ("burndown", "three")
  const named = need.stems
    .slice(0, W.defining)
    .some((s) => !ctx.vocabStems.has(s) && nameStems.has(s));
  // interaction tags are hard requirements: "zoomable" is not covered by a chart that cannot zoom
  const does = need.inferred.tags
    .filter((t) => t.tag.startsWith("does:") && !t.implied)
    .map((t) => t.tag);
  const own = new Set(record.tags ?? []);
  const doesCovered = does.every((t) => own.has(t));
  const headHit = need.head ? own.has(need.head.tag) : false;
  return {
    name: record.name,
    depth: effectiveDepth(record, ctx.records),
    tagCov: Math.round(tagCov * 100) / 100,
    wordCov: Math.round(wordCov * 100) / 100,
    fit:
      Math.round(
        (W.fitTagWeight * tagCov +
          (1 - W.fitTagWeight) * wordCov +
          (named ? W.nameBonus : 0) -
          (W.kindPenalty[record.kind] ?? 0)) *
          100,
      ) / 100,
    unexplained,
    defining,
    named,
    doesCovered,
    headHit,
  };
}

const pascal = (words) =>
  words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");

/** The gap record for a cousin / none: a PascalCase name from the need's
 *  defining words plus its head noun, the need as the description, the
 *  placeholder as `nearest`. */
export function gapRecord(need, best) {
  const defining = (best?.unexplained ?? need.stems).slice(0, 2);
  const head = need.inferred.tags.find((t) => t.head)?.tag.split(":")[1];
  const words = [
    ...defining,
    ...(head && !defining.includes(head) ? [head] : []),
  ];
  return {
    name: pascal(words.length ? words : need.stems.slice(0, 2)),
    description: need.text.replace(/\s+/g, " ").trim().slice(0, 200),
    nearest: best?.name ?? "none",
    missing: best ? best.unexplained : need.stems,
  };
}

const readTheNeed = (text, ctx) => {
  const inferred = inferTags(text, { vocab: ctx.vocab, lexicon: ctx.lexicon });
  return {
    text,
    inferred,
    head: inferred.tags.find((t) => t.head) ?? null,
    stems: contentStems(text),
    reached: reachedStems(inferred),
  };
};

/** The outcome call. `ctx` = { records, vocab, lexicon, bm25, componentsMd,
 *  embedRanker? }. Exact short-circuits on the fast path; cousin and none
 *  walk the whole union candidate set first. */
export async function classify(text, ctx, W = OUTCOME) {
  const need = readTheNeed(text, ctx);
  const byName = ctx.byName ?? new Map(ctx.records.map((r) => [r.name, r]));
  const hasHead = Boolean(need.head);
  const isExact = (c) =>
    c &&
    hasHead &&
    c.defining.length === 0 &&
    ((c.tagCov >= W.exactTagCov && c.wordCov >= W.exactWordCov) ||
      (c.tagCov >= W.fullWordingTagCov && c.wordCov >= W.fullWording));
  // none of the need's defining words reach the candidate: "a VIDEO PLAYER with a scrub bar" is not a bar
  const isStranger = (c) =>
    !c || c.defining.length >= Math.min(W.defining, need.stems.length);
  const byFit = (a, b) => b.fit - a.fit || (b.depth ?? 0) - (a.depth ?? 0);
  const result = (outcome, pick, alternatives, confidence, extra = {}) => ({
    outcome,
    pick,
    alternatives,
    confidence: Math.round(confidence * 100) / 100,
    need: {
      text,
      tags: need.inferred.tags.map((t) => t.tag),
      unexplained: pick?.unexplained ?? need.stems,
    },
    ...extra,
  });
  // 1. exact: the fast path's best-fitting candidate covers the need — stop here
  const fast = find(text, {
    records: ctx.records,
    vocab: ctx.vocab,
    lexicon: ctx.lexicon,
    top: 5,
  });
  const fastFits = fast.results
    .map((r) => fitOf(byName.get(r.name), need, ctx, W))
    .sort(byFit);
  if (isExact(fastFits[0]))
    return result("exact", fastFits[0], fastFits.slice(1), fastFits[0].fit, {
      path: "fast",
    });
  // 2. walk the whole union to the end before settling
  const union = await candidateSetLive(text, { ...ctx, k: W.k }, { k: W.k });
  const walked = union
    .map((c) => fitOf(byName.get(c.name), need, ctx, W))
    .sort(byFit);
  const best = walked[0];
  if (isExact(best))
    return result("exact", best, walked.slice(1, 6), best.fit, {
      path: "union",
      walked: walked.length,
    });
  // cousin: the nearest SHAPE stands in — the best fit among the candidates
  // that carry the need's head noun (a chart for "a pie chart"), else the best fit
  const shaped = walked.filter((c) => c.headHit);
  const near = shaped.length ? shaped : walked;
  if (!hasHead || isStranger(near[0]))
    return result("none", null, walked.slice(0, 3), best ? 1 - best.fit : 1, {
      path: "union",
      walked: walked.length,
      gap: gapRecord(need, best && best.tagCov > 0 ? best : null),
      placeholder: "GapBox",
    });
  return result(
    "cousin",
    near[0],
    walked.filter((c) => c !== near[0]).slice(0, 5),
    near[0].fit,
    {
      path: "union",
      walked: walked.length,
      gap: gapRecord(need, near[0]),
      placeholder: near[0].name,
    },
  );
}

/** Everything `classify` needs, built once. `embed: false` skips MiniLM. */
export async function loadContext({ embed = true } = {}) {
  const records = loadRecords();
  const vocab = loadTagVocabulary(root);
  const componentsMd = readFileSync(join(root, "COMPONENTS.md"), "utf8");
  // how many catalog entries use each word: a word everyone uses defines nothing
  const wordCount = new Map();
  for (const r of records)
    for (const s of entryStems(r, componentsMd))
      wordCount.set(s, (wordCount.get(s) ?? 0) + 1);
  return {
    records,
    wordCount,
    vocabStems: new Set(
      [...vocab].flatMap((t) =>
        tokenize(t.split(":")[1].replace(/-/g, " ")).map(contentStem),
      ),
    ),
    byName: new Map(records.map((r) => [r.name, r])),
    vocab,
    lexicon: loadLexicon(),
    bm25: buildBm25(records),
    componentsMd,
    embedRanker: embed ? await createEmbedRanker(records) : null,
  };
}

/** Append a cousin / none result to an app's gaps.json (the sketch-fidelity
 *  shape `{title, kind, nearest, props}` plus `outcome`, `need`, `next`).
 *  Idempotent on `title`. Returns the entry, or null for an exact. */
export function appendGap(path, res) {
  if (res.outcome === "exact") return null;
  const list = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
  const entry = {
    title: res.gap.name,
    kind: "visual",
    nearest: res.gap.nearest,
    props: null,
    outcome: res.outcome,
    need: res.gap.description,
    missing: res.gap.missing,
    placeholder: res.placeholder,
    next:
      res.outcome === "cousin"
        ? `gap-filler agent: extend or compose ${res.gap.nearest} into ${res.gap.name}`
        : `bespoke build: ${res.gap.name}`,
  };
  const i = list.findIndex((g) => g.title === entry.title);
  if (i === -1) list.push(entry);
  else list[i] = { ...list[i], ...entry };
  writeFileSync(path, `${JSON.stringify(list, null, 2)}\n`);
  return entry;
}

export const render = (res) => {
  const lines = [
    `Outcome: ${res.outcome.toUpperCase()} (confidence ${res.confidence}, ${res.path} path${res.walked ? `, ${res.walked} candidates walked` : ""})`,
  ];
  lines.push(`Read as: ${res.need.tags.join(", ") || "(no tags)"}`);
  if (res.pick)
    lines.push(
      `Pick: ${res.pick.name} depth=${res.pick.depth ?? "?"} tagCov=${res.pick.tagCov} wordCov=${res.pick.wordCov}`,
    );
  if (res.outcome === "cousin")
    lines.push(
      `Placeholder: ${res.placeholder} — missing: ${res.gap.missing.join(", ") || "-"}`,
    );
  if (res.outcome === "none")
    lines.push(
      `Placeholder: <GapBox title="${res.gap.name}" nearest="${res.gap.nearest}" />`,
    );
  if (res.gap) lines.push(`Gap: ${res.gap.name} — ${res.gap.description}`);
  if (res.alternatives?.length)
    lines.push(
      `Alternatives: ${res.alternatives.map((a) => `${a.name} (${a.fit})`).join(", ")}`,
    );
  return lines.join("\n");
};

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  const gapsPath = opt("--gaps");
  const text = argv
    .filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--gaps")
    .join(" ");
  if (!text) {
    console.error(
      'usage: node scripts/find-outcome.mjs "<need>" [--json] [--gaps <app>/gaps.json] [--no-embed]',
    );
    process.exit(2);
  }
  const ctx = await loadContext({ embed: !argv.includes("--no-embed") });
  const res = await classify(text, ctx);
  const gap = gapsPath ? appendGap(gapsPath, res) : null;
  if (argv.includes("--json"))
    console.log(JSON.stringify({ ...res, gapsEntry: gap }, null, 2));
  else {
    console.log(render(res));
    if (gap) console.log(`Appended to ${gapsPath}: ${gap.title} (${gap.next})`);
  }
}
