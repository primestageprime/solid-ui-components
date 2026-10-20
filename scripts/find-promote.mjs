#!/usr/bin/env node
// ============================================
// Promotion loop — a slow find makes the next fast find cheaper (diddit #4161).
// --------------------------------------------
// Peter, 2026-10-20: "each time we find a big component early, it drops the
// cost for the times we have to look harder. If we find one through a slow
// search, make a skill that figures out how to get it in a faster search.
// That should also incrementally improve."
//
// Given a need and the component the SLOW path (union + reader, or the
// exhaustive read) found for it, this:
//   1. runs the FAST path (ranker v2, scripts/find.mjs) and records where the
//      answer sits;
//   2. diagnoses the miss: which of the need's words reach no tag, which of
//      the answer's tags the need never infers, whether a negation or quoted
//      string hid the words, whether a part outranks it without a
//      `preferFirst` edge;
//   3. tries the SMALLEST fix that puts the answer in the fast top 3, in this
//      order: a lexicon phrase (need words → answer tags, scripts/
//      find-lexicon.json); a tag the need infers that the answer plausibly
//      lacks (its `Tags:` line; only with --allow-tags); a "Use for" phrase
//      on the answer's COMPONENTS.md bullet (only with --allow-doc);
//   4. proves it by re-running the fast path, and appends the case to
//      scripts/find-regress.json, which scripts/find.test.ts pins at top 3.
// Nothing is written without --apply. The held-out sets are never fed in.
//
//   node scripts/find-promote.mjs "<need>" <Answer> [--apply] [--allow-tags] [--allow-doc] [--source "<where>"]
//   node scripts/find-promote.mjs --batch <cases.json> [--apply ...]   # [{need, answer, source}]
// ============================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTagVocabulary, parseTags } from "./catalog.mjs";
import {
  find,
  inferTags,
  loadLexicon,
  loadRecords,
  readNeed,
  tokenize,
  stem,
} from "./find.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LEXICON = join(root, "scripts", "find-lexicon.json");
const REGRESS = join(root, "scripts", "find-regress.json");
const HELD_OUT = ["find-bench-real.json", "find-bench-fresh.json"].map((f) =>
  join(root, "scripts", f),
);

const STOP = new Set([
  "that",
  "with",
  "when",
  "then",
  "this",
  "than",
  "them",
  "from",
  "into",
  "only",
  "also",
  "each",
  "every",
  "same",
  "very",
  "just",
]);

export function fastPosition(need, answer, ctx, top = 20) {
  const got = find(need, {
    records: ctx.records,
    vocab: ctx.vocab,
    lexicon: ctx.lexicon,
    top,
  }).results.map((r) => r.name);
  return { pos: got.indexOf(answer), got };
}

export function diagnose(need, answer, ctx) {
  const record = ctx.byName.get(answer);
  if (!record) return { error: `${answer} is not a catalog export` };
  const inferred = inferTags(need, {
    vocab: ctx.vocab,
    lexicon: ctx.lexicon,
  }).tags;
  const inferredSet = new Set(inferred.map((t) => t.tag));
  const own = new Set(record.tags ?? []);
  const stripped = readNeed(need);
  const lost = tokenize(need).filter((w) => !tokenize(stripped).includes(w));
  const reaching = new Set(
    inferred.flatMap((t) => t.why.flatMap((w) => tokenize(w).map(stem))),
  );
  const unreached = [...new Set(tokenize(stripped).map(stem))].filter(
    (s) => !reaching.has(s) && s.length > 3 && !STOP.has(s),
  );
  const { pos, got } = fastPosition(need, answer, ctx);
  const above = got
    .slice(0, Math.max(pos, 0))
    .map((n) => ctx.byName.get(n))
    .filter(Boolean);
  const partsAbove = above
    .filter((r) => (r.depth ?? 1) < (record.depth ?? 1))
    .map((r) => r.name);
  return {
    pos,
    inferred: [...inferredSet],
    answerTagsNotInferred: [...own].filter((t) => !inferredSet.has(t)),
    inferredNotOnAnswer: [...inferredSet].filter(
      (t) => !own.has(t) && t !== "does:view",
    ),
    unreachedWords: unreached,
    wordsLostToStripping: lost,
    partsAbove,
  };
}

/** Try lexicon phrases (unigrams, then bigrams from the stripped need) that
 *  map to the answer's not-yet-inferred tags; return the first that lifts the
 *  answer into the top 3, or the best improvement found. */
export function tryLexicon(need, answer, ctx, diag) {
  const stems = tokenize(readNeed(need)).map(stem);
  const words = tokenize(readNeed(need));
  const phrases = [];
  diag.unreachedWords.forEach((s) => {
    const w = words.find((x) => stem(x) === s);
    if (w) phrases.push(w);
  });
  for (let i = 0; i + 1 < words.length; i++)
    if (!STOP.has(words[i]) && !STOP.has(words[i + 1]))
      phrases.push(`${words[i]} ${words[i + 1]}`);
  const targetTags = diag.answerTagsNotInferred
    .filter((t) => !t.startsWith("role:"))
    .slice(0, 3);
  if (!targetTags.length) return null;
  let best = { pos: diag.pos };
  for (const phrase of [...new Set(phrases)]) {
    if (ctx.lexicon[phrase]) continue;
    const lexicon = { ...ctx.lexicon, [phrase]: targetTags };
    const { pos } = fastPosition(need, answer, { ...ctx, lexicon });
    if (pos !== -1 && (best.pos === -1 || pos < best.pos))
      best = { pos, phrase, tags: targetTags };
    if (pos !== -1 && pos < 3) break;
  }
  return best.phrase ? best : null;
}

export function tryTag(need, answer, ctx, diag) {
  const record = ctx.byName.get(answer);
  const add = diag.inferredNotOnAnswer
    .filter((t) => ctx.vocab.has(t))
    .slice(0, 2);
  if (!add.length) return null;
  const records = ctx.records.map((r) =>
    r.name === answer ? { ...r, tags: [...(r.tags ?? []), ...add] } : r,
  );
  const { pos } = fastPosition(need, answer, { ...ctx, records });
  return pos !== -1 && pos < 3 ? { pos, tags: add, file: record.file } : null;
}

export function promote(
  need,
  answer,
  ctx,
  {
    apply = false,
    allowTags = false,
    allowDoc = false,
    source = "",
    recordOnly = false,
  } = {},
) {
  const diag = diagnose(need, answer, ctx);
  if (diag.error) return { need, answer, error: diag.error };
  const result = {
    need,
    answer,
    before: diag.pos,
    diag,
    fix: null,
    after: diag.pos,
  };
  if (diag.pos !== -1 && diag.pos < 3) {
    result.fix = { kind: "none", why: "already in the fast top 3" };
  } else if (recordOnly) {
    result.fix = {
      kind: "manual",
      why: "still missed; --record-only tries nothing",
      partsAbove: diag.partsAbove,
    };
  } else {
    const lex = tryLexicon(need, answer, ctx, diag);
    if (lex && lex.pos < 3) {
      result.fix = { kind: "lexicon", phrase: lex.phrase, tags: lex.tags };
      result.after = lex.pos;
      if (apply) {
        ctx.lexicon[lex.phrase] = lex.tags;
        writeFileSync(LEXICON, `${JSON.stringify(ctx.lexicon, null, 2)}\n`);
      }
    } else if (allowTags) {
      const tag = tryTag(need, answer, ctx, diag);
      if (tag) {
        result.fix = { kind: "tag", tags: tag.tags, file: tag.file };
        result.after = tag.pos;
        if (apply) {
          const path = join(root, tag.file);
          const src = readFileSync(path, "utf8");
          const line = src.match(/^.*Tags:.*$/m)[0];
          writeFileSync(
            path,
            src.replace(
              line,
              `${line.replace(/\s*\*\/\s*$/, "")}, ${tag.tags.join(", ")}${/\*\/\s*$/.test(line) ? " */" : ""}`,
            ),
          );
          const r = ctx.byName.get(answer);
          r.tags = [...(r.tags ?? []), ...tag.tags];
        }
      }
    }
    if (!result.fix) {
      result.fix = {
        kind: lex ? "lexicon-partial" : "manual",
        why: lex
          ? `best lexicon phrase "${lex.phrase}" only reaches position ${lex.pos + 1}`
          : "no lexicon phrase or tag lifts it; a doc line (Use for) or a preferFirst edge is needed",
        ...(lex ? { phrase: lex.phrase, tags: lex.tags } : {}),
        partsAbove: diag.partsAbove,
      };
      if (lex) result.after = lex.pos;
    }
  }
  if (apply && result.after !== -1 && result.after < 3) {
    const regress = existsSync(REGRESS)
      ? JSON.parse(readFileSync(REGRESS, "utf8"))
      : {
          $comment:
            "Promoted cases (scripts/find-promote.mjs): a need the slow path answered, now pinned in the fast path's top 3 by scripts/find.test.ts. Never a held-out need.",
          cases: [],
        };
    if (!regress.cases.some((c) => c.need === need)) {
      regress.cases.push({
        need,
        expect: [answer],
        source,
        promotedBy: result.fix.kind === "none" ? "fast" : result.fix.kind,
        on: new Date().toISOString().slice(0, 10),
      });
      writeFileSync(REGRESS, `${JSON.stringify(regress, null, 2)}\n`);
    }
  }
  return result;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const opt = (n, d) =>
    argv.indexOf(n) === -1 ? d : argv[argv.indexOf(n) + 1];
  // --record-only: no automatic fix; a case now fast (after a hand-made
  // lexicon/doc change) is just proved and pinned in the regression set.
  const recordOnly = argv.includes("--record-only");
  const flags = {
    apply: argv.includes("--apply"),
    allowTags: argv.includes("--allow-tags"),
    allowDoc: argv.includes("--allow-doc"),
    source: opt("--source", ""),
  };
  const records = loadRecords();
  const ctx = {
    records,
    byName: new Map(records.map((r) => [r.name, r])),
    vocab: loadTagVocabulary(root),
    lexicon: loadLexicon(),
  };
  const heldOut = new Set(
    HELD_OUT.filter(existsSync).flatMap((f) =>
      JSON.parse(readFileSync(f, "utf8")).needs.map((n) => n.need),
    ),
  );
  const cases = opt("--batch", null)
    ? JSON.parse(readFileSync(opt("--batch"), "utf8"))
    : [
        {
          need: argv
            .filter(
              (a, i) =>
                !a.startsWith("--") &&
                !(
                  i > 0 &&
                  argv[i - 1].startsWith("--") &&
                  ["--source", "--batch"].includes(argv[i - 1])
                ),
            )
            .slice(0, -1)
            .join(" "),
          answer: argv.filter((a) => !a.startsWith("--")).at(-1),
          source: flags.source,
        },
      ];
  const results = [];
  for (const c of cases) {
    if (
      heldOut.has(c.need) &&
      !argv.includes("--i-know-this-retires-the-held-out-set")
    ) {
      console.log(
        `skip (held-out need, pass --i-know-this-retires-the-held-out-set to promote it): ${c.need.slice(0, 60)}`,
      );
      continue;
    }
    const r = promote(c.need, c.answer, ctx, {
      ...flags,
      source: c.source ?? flags.source,
      recordOnly,
    });
    results.push(r);
    if (argv.includes("--json")) continue;
    const posStr = (p) => (p === -1 ? "absent" : `#${p + 1}`);
    console.log(
      `\n${c.answer} for "${c.need.slice(0, 90)}"\n  fast path: ${posStr(r.before)} → ${posStr(r.after)}  fix: ${JSON.stringify(r.fix)}`,
    );
    if (r.diag)
      console.log(
        `  unreached words: ${r.diag.unreachedWords.join(", ") || "-"}; answer tags not inferred: ${r.diag.answerTagsNotInferred.join(" ") || "-"}; lost to stripping: ${r.diag.wordsLostToStripping.join(", ") || "-"}`,
      );
  }
  if (argv.includes("--json")) console.log(JSON.stringify(results, null, 2));
  const recovered = results
    .filter((r) => r.before === -1 || r.before >= 3)
    .filter((r) => r.after !== -1 && r.after < 3).length;
  console.log(
    `\n${results.length} cases, ${results.filter((r) => r.fix?.kind === "none").length} already fast, ${recovered} recovered into the top 3${flags.apply ? " (applied)" : " (dry run)"}`,
  );
}
