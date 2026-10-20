#!/usr/bin/env node
// ============================================
// Three-outcome benchmark — confusion matrix and pick correctness per
// category for scripts/find-outcome.mjs over scripts/find-outcomes-bench.json.
// --------------------------------------------
// The set is frozen (f5f5cfbf). Thresholds are tuned on its ODD items (1-based)
// only; the EVEN items are the held-out number. The targets (Peter, diddit
// #4163): no exact/cousin confusion that hides an existing component, and no
// "exact" for a cousin.
//
//   node scripts/find-outcomes-bench.mjs [--json] [--misses] [--no-embed]
// ============================================
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, loadContext, OUTCOME } from "./find-outcome.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTCOMES = ["exact", "cousin", "none"];

/** A pick is right when it is an expected name or a member of an expected
 *  name's family (`FluidListDetailThreePanel` is a curried `ThreePanelLayout`). */
export const scoreOutcomes = (items, results, familyOf = (n) => n) => {
  const matrix = Object.fromEntries(
    OUTCOMES.map((a) => [a, Object.fromEntries(OUTCOMES.map((b) => [b, 0]))]),
  );
  const picks = Object.fromEntries(
    OUTCOMES.map((o) => [o, { n: 0, right: 0 }]),
  );
  const misses = [];
  items.forEach((it, i) => {
    const r = results[i];
    matrix[it.outcome][r.outcome]++;
    const p = picks[it.outcome];
    p.n++;
    const pickRight =
      it.outcome === "none"
        ? r.outcome === "none"
        : r.outcome === it.outcome &&
          r.pick != null &&
          (it.expect.includes(r.pick.name) ||
            it.expect.map(familyOf).includes(familyOf(r.pick.name)));
    if (pickRight) p.right++;
    if (!pickRight)
      misses.push({
        need: it.need,
        label: it.outcome,
        got: r.outcome,
        pick: r.pick?.name ?? null,
        expect: it.expect ?? null,
        tags: r.need.tags,
        unexplained: r.need.unexplained,
        path: r.path,
      });
  });
  const n = items.length;
  const right = OUTCOMES.reduce((a, o) => a + matrix[o][o], 0);
  return { n, outcomeAccuracy: right, matrix, picks, misses };
};

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const argv = process.argv.slice(2);
  const bench = JSON.parse(
    readFileSync(join(root, "scripts", "find-outcomes-bench.json"), "utf8"),
  ).needs;
  const ctx = await loadContext({ embed: !argv.includes("--no-embed") });
  const familyOf = (n) => ctx.byName.get(n)?.family ?? n;
  // `--sweep` tries threshold combinations on the TUNING half only and prints
  // each one's tuning score (the held-out half is never looked at while sweeping)
  if (argv.includes("--sweep")) {
    const tuning = bench.filter((_, i) => i % 2 === 0);
    for (const fitTagWeight of [0.3, 0.4, 0.5])
      for (const exactTagCov of [0.4, 0.5, 0.6])
        for (const exactWordCov of [0.5, 0.6, 0.7]) {
          const W = { ...OUTCOME, fitTagWeight, exactTagCov, exactWordCov };
          const rs = [];
          for (const it of tuning) rs.push(await classify(it.need, ctx, W));
          const s = scoreOutcomes(tuning, rs, familyOf);
          const pick = Object.values(s.picks).reduce((a, p) => a + p.right, 0);
          console.log(
            `tag=${fitTagWeight} exactTag=${exactTagCov} exactWord=${exactWordCov}: outcome ${s.outcomeAccuracy}/${s.n} pick ${pick}/${s.n} | exact→cousin ${s.matrix.exact.cousin} exact→none ${s.matrix.exact.none} cousin→exact ${s.matrix.cousin.exact} cousin→none ${s.matrix.cousin.none}`,
          );
        }
    process.exit(0);
  }
  const t0 = Date.now();
  const results = [];
  for (const it of bench) results.push(await classify(it.need, ctx));
  const ms = Date.now() - t0;
  const halves = {
    tuning: bench
      .map((b, i) => [b, results[i], i])
      .filter(([, , i]) => i % 2 === 0),
    heldout: bench
      .map((b, i) => [b, results[i], i])
      .filter(([, , i]) => i % 2 === 1),
    all: bench.map((b, i) => [b, results[i], i]),
  };
  const out = {};
  for (const [name, rows] of Object.entries(halves))
    out[name] = scoreOutcomes(
      rows.map((r) => r[0]),
      rows.map((r) => r[1]),
      familyOf,
    );
  out.msPerNeed = Math.round(ms / bench.length);
  out.fastPath = results.filter((r) => r.path === "fast").length;
  if (argv.includes("--json")) {
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  }
  for (const name of Object.keys(halves)) {
    const s = out[name];
    console.log(
      `\n${name} (${s.n}): outcome accuracy ${s.outcomeAccuracy}/${s.n}`,
    );
    console.log("| label \\ got | exact | cousin | none | pick right |");
    console.log("|---|---|---|---|---|");
    for (const o of OUTCOMES)
      console.log(
        `| ${o} | ${OUTCOMES.map((g) => s.matrix[o][g]).join(" | ")} | ${s.picks[o].right}/${s.picks[o].n} |`,
      );
  }
  console.log(
    `\n${out.msPerNeed} ms per need, ${out.fastPath}/${bench.length} short-circuited on the fast path, 0 tokens`,
  );
  if (argv.includes("--misses"))
    for (const m of out.all.misses)
      console.log(
        `  - [${m.label} → ${m.got}, ${m.path}] "${m.need.slice(0, 90)}"\n      pick ${m.pick} expect ${m.expect?.join("|") ?? "-"}; tags ${m.tags.join(" ")}; unexplained ${m.unexplained.join(" ")}`,
      );
}
