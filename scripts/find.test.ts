// @vitest-environment node
//
// ============================================
// Component finder guard — the tag reader, the ranker, and the benchmark.
// ============================================
//
// Three layers:
//   1. Pure unit tests over fixtures for `parseTags` / `inferTags` /
//      `scoreRecord` / `rank` — the rules this file's header documents
//      (phrase consumption, head noun, implied view, biggest-in-band).
//   2. The live catalog: every base record is tagged from its own file and
//      every tag word is in the vocabulary (the same facts
//      `untaggedComponents` / `unknownTags` ratchet in scripts/health.mjs).
//   3. The benchmark (scripts/find-bench.json) as an acceptance floor: the
//      numbers reported on diddit #4161 (2026-10-20). Lowering them is a
//      ranking regression; raising them is the point of tuning.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTags, loadTagVocabulary, rankCatalog } from "./catalog.mjs";
import {
  inferTags,
  scoreRecord,
  rank,
  find,
  loadLexicon,
  loadRecords,
  effectiveDepth,
  stem,
} from "./find.mjs";

const root = join(__dirname, "..");
const vocab = loadTagVocabulary(root);
const lexicon = loadLexicon();

describe("parseTags", () => {
  it("reads a `// Tags:` line", () => {
    expect(
      parseTags(
        "// Foo — Composite (Depth 2)\n// Tags: shows:table, does:sort, role:panel\nimport x",
      ),
    ).toEqual(["shows:table", "does:sort", "role:panel"]);
  });
  it("reads a ` * Tags:` line inside a block comment, with the closer on the same line", () => {
    expect(
      parseTags(
        "/* Foo — Atomic (Depth 1).\n * Tags: shows:number, role:cell */\nimport x",
      ),
    ).toEqual(["shows:number", "role:cell"]);
  });
  it("returns null when there is no line, and dedupes", () => {
    expect(parseTags("// Foo — Atomic (Depth 1)\nimport x")).toBeNull();
    expect(parseTags("// Tags: shows:text, shows:text")).toEqual([
      "shows:text",
    ]);
  });
});

describe("inferTags", () => {
  it("a vocabulary word maps to itself in every facet that has it", () => {
    const { tags } = inferTags("a table", { vocab, lexicon: {} });
    expect(tags.map((t) => t.tag)).toEqual(
      expect.arrayContaining(["shows:table", "data:table"]),
    );
  });
  it("a lexicon phrase consumes its words: 'top bar' is a header, not a bar chart", () => {
    const { tags } = inferTags("a top bar", {
      vocab,
      lexicon: { "top bar": ["role:header"] },
    });
    const names = tags.map((t) => t.tag);
    expect(names).toContain("role:header");
    expect(names).not.toContain("shows:bar");
  });
  it("the first shows: tag is the head; no interaction named implies does:view", () => {
    const { tags } = inferTags("an inline sparkline inside a table cell", {
      vocab,
      lexicon: {},
    });
    expect(tags.find((t) => t.head)?.tag).toBe("shows:sparkline");
    expect(tags.find((t) => t.tag === "does:view")?.implied).toBe(true);
  });
  it("stems meet: charts/chart, dragging/drag, grouped/group", () => {
    expect(stem("charts")).toBe("chart");
    expect(stem("dragging")).toBe("drag");
    expect(stem("grouped")).toBe("group");
  });
});

const rec = (
  name: string,
  depth: number | null,
  tags: string[],
  extra: Record<string, unknown> = {},
) => ({
  name,
  depth,
  kind: "composite",
  family: name,
  variantOf: null,
  summary: null,
  useFor: null,
  notes: null,
  preferFirst: null,
  tags,
  ...extra,
});

describe("scoreRecord / rank", () => {
  const need = inferTags("a sidebar grouped by state with counts", {
    vocab,
    lexicon,
  });
  it("coverage scales the tag score: carrying all of the need beats carrying half", () => {
    const full = rec(
      "Full",
      2,
      need.tags.map((t) => t.tag),
    );
    const half = rec(
      "Half",
      2,
      need.tags.slice(0, Math.ceil(need.tags.length / 2)).map((t) => t.tag),
    );
    expect(scoreRecord(full as never, need).score).toBeGreaterThan(
      scoreRecord(half as never, need).score,
    );
  });
  it("inside the tie band the most composed record wins; outside it, score wins", () => {
    const tags = need.tags.map((t) => t.tag);
    const small = rec("Small", 1, tags);
    const big = rec("Big", 3, tags);
    const weak = rec("Weak", 4, tags.slice(0, 1));
    const ranked = rank([small, big, weak] as never, need, { top: 3 });
    expect(ranked.map((r) => r.record.name)).toEqual(["Big", "Small", "Weak"]);
  });
  it("a factory and a variant with baked overrides sort below the plain component at equal depth", () => {
    const tags = need.tags.map((t) => t.tag);
    const plain = rec("Plain", 2, tags);
    const factory = rec("createPlain", 2, tags, { kind: "factory" });
    const curried = rec("BigPlain", 2, tags, {
      kind: "variant",
      variantOf: { factory: "createPlain", overrides: "{ size: 'big' }" },
    });
    const ranked = rank([factory, curried, plain] as never, need, { top: 3 });
    expect(ranked[0].record.name).toBe("Plain");
  });
  it("depth 0 and 1 are the same level for the biggest rule", () => {
    const tags = need.tags.map((t) => t.tag);
    const zero = rec("Zero", 0, tags, {
      useFor: "sidebar grouped state counts",
    });
    const one = rec("One", 1, tags);
    expect(rank([one, zero] as never, need, { top: 2 })[0].record.name).toBe(
      "Zero",
    );
  });
  it("effectiveDepth falls back to a depth named in the summary, then to the family", () => {
    const records = [
      rec("A", null, [], { summary: "Composed (Depth 2, zero CSS)." }),
      rec("B", null, [], { family: "F" }),
      rec("C", 3, [], { family: "F" }),
    ];
    expect(effectiveDepth(records[0] as never, records as never)).toBe(2);
    expect(effectiveDepth(records[1] as never, records as never)).toBe(3);
  });
});

describe("live catalog — tags", () => {
  const records = loadRecords();
  it("every record is tagged, every base record from its own file", () => {
    expect(records.filter((r: { tags: unknown }) => !r.tags)).toEqual([]);
    expect(
      records
        .filter(
          (r: { kind: string; tagsSource: string }) =>
            r.kind !== "variant" && r.tagsSource !== "own",
        )
        .map((r: { name: string }) => r.name),
    ).toEqual([]);
  });
  it("every tag word is in the vocabulary", () => {
    const unknown = new Set<string>();
    for (const r of records)
      for (const t of r.tags) if (!vocab.has(t)) unknown.add(t);
    expect([...unknown]).toEqual([]);
  });
  it("the real miss: the current step in a workflow, animated → SwimlaneChart family, with its parts", () => {
    const out = find(
      "the current step in a workflow, animated, with the steps before and after it",
      {
        records,
        vocab,
        lexicon,
        top: 3,
        readSrc: (f: string) => readFileSync(join(root, f), "utf8"),
      },
    );
    expect([
      "SwimlaneChart",
      "AnimatedSwimlaneChart",
      "LinearFlowSwimlaneChart",
    ]).toContain(out.results[0].name);
    expect(out.results[0].tagsHit).toContain("data:steps");
  });
});

describe("benchmark floor (scripts/find-bench.json)", () => {
  const records = loadRecords();
  const bench = JSON.parse(
    readFileSync(join(root, "scripts", "find-bench.json"), "utf8"),
  ).needs as {
    need: string;
    expect: string[];
    split: string;
    miss?: boolean;
  }[];
  const hits = (items: typeof bench, ranker: (need: string) => string[]) => {
    let top1 = 0;
    let top3 = 0;
    for (const item of items) {
      const pos = ranker(item.need).findIndex((n) => item.expect.includes(n));
      if (pos === 0) top1++;
      if (pos >= 0 && pos < 3) top3++;
    }
    return { top1, top3, n: items.length };
  };
  const tuned = (need: string) =>
    find(need, { records, vocab, lexicon, top: 5 }).results.map((r) => r.name);
  const legacy = (need: string) =>
    rankCatalog(records, need, 5).map((r) => r.record.name);

  it("tuning split: 31/31 top-1 (the set the lexicon was tuned on)", () => {
    const s = hits(
      bench.filter((b) => b.split === "tuning"),
      tuned,
    );
    expect(s.n).toBe(31);
    expect(s.top1).toBeGreaterThanOrEqual(31);
  });
  it("held-out split (44 needs quoted verbatim from the sketch gap lists, briefs and marks' gaps.json, frozen at 6f378f68 before any further tuning): at least 22/44 top-1 and 26/44 top-3 (ranker v2, 561d369c; retired as an honest score after the doc fixes of 133c5c92)", () => {
    const s = hits(
      bench.filter((b) => b.split === "heldout"),
      tuned,
    );
    expect(s.n).toBe(44);
    expect(s.top1).toBeGreaterThanOrEqual(22);
    expect(s.top3).toBeGreaterThanOrEqual(26);
  });
  it("authored split (written after tagging, never tuned on): at least 27/29 top-1", () => {
    const s = hits(
      bench.filter((b) => b.split === "authored"),
      tuned,
    );
    expect(s.n).toBe(29);
    expect(s.top1).toBeGreaterThanOrEqual(27);
  });
  it("the real misses (7 authored + 7 quoted): ranker v2 at least 10/14 top-1, legacy at most 5/14 (5 once FramedCashflowScrubChart counted as a drag-zoom answer)", () => {
    const real = bench.filter((b) => b.miss);
    expect(real.length).toBe(14);
    expect(hits(real, tuned).top1).toBeGreaterThanOrEqual(10);
    expect(hits(real, legacy).top1).toBeLessThanOrEqual(5);
  });
});

describe("promoted cases (scripts/find-regress.json, scripts/find-promote.mjs)", () => {
  const records = loadRecords();
  const regress = JSON.parse(
    readFileSync(join(root, "scripts", "find-regress.json"), "utf8"),
  ).cases as {
    need: string;
    expect: string[];
  }[];
  it("every promoted need stays in the fast path's top 3", () => {
    const lost = regress.filter(
      (c) =>
        !find(c.need, { records, vocab, lexicon, top: 3 }).results.some((r) =>
          c.expect.includes(r.name),
        ),
    );
    expect(lost.map((c) => c.need)).toEqual([]);
  });
});

describe("three outcomes (scripts/find-outcome.mjs over scripts/find-outcomes-bench.json, frozen at f5f5cfbf)", () => {
  // Floors from diddit #4163 (2026-10-20), two text retrievers only (no MiniLM, so
  // the test needs no model). Peter's targets: no exact/cousin confusion that
  // hides an existing component, and no "exact" for a cousin that is really
  // none. Lowering a floor is a regression; the four cousin → exact and two
  // cousin → none (needs with no vocabulary word) are the known misses.
  it("outcome accuracy ≥ 50/59; no exact ever read as cousin or none; no none ever read as exact; exact pick ≥ 21/23; none ≥ 13/17; cousin → exact ≤ 3", async () => {
    const { classify, loadContext } = await import("./find-outcome.mjs");
    const { scoreOutcomes } = await import("./find-outcomes-bench.mjs");
    const bench = JSON.parse(
      readFileSync(join(root, "scripts", "find-outcomes-bench.json"), "utf8"),
    ).needs as { need: string; outcome: string; expect?: string[] }[];
    const ctx = await loadContext({ embed: false });
    const results = [];
    for (const it of bench) results.push(await classify(it.need, ctx));
    const s = scoreOutcomes(
      bench,
      results,
      (n: string) => ctx.byName.get(n)?.family ?? n,
    );
    expect(s.n).toBe(59);
    expect(s.outcomeAccuracy).toBeGreaterThanOrEqual(50);
    expect(s.matrix.exact.cousin + s.matrix.exact.none).toBe(0);
    expect(s.matrix.none.exact).toBe(0);
    expect(s.matrix.cousin.exact).toBeLessThanOrEqual(3);
    expect(s.picks.exact.right).toBeGreaterThanOrEqual(21);
    expect(s.picks.none.right).toBeGreaterThanOrEqual(13);
    // every result carries the contract
    for (const r of results) {
      expect(["exact", "cousin", "none"]).toContain(r.outcome);
      if (r.outcome !== "exact")
        expect(r.gap).toMatchObject({
          name: expect.any(String),
          description: expect.any(String),
          nearest: expect.any(String),
        });
      if (r.outcome === "none") expect(r.placeholder).toBe("GapBox");
      // an exact usually short-circuits on the fast path; the union walk may still find one
      expect(["fast", "union"]).toContain(r.path);
    }
  }, 60_000);
});

describe("build phases and ask-early (diddit #4163 Decisions #4523, #4524)", () => {
  const gap = (title: string, outcome: "cousin" | "none", extra = {}) => ({
    title,
    outcome,
    phase: outcome === "cousin" ? 2 : 3,
    nearest: outcome === "cousin" ? "ScrubChart" : "none",
    need: `a ${title}`,
    status: "open",
    askedAt: "2026-10-20T10:00:00Z",
    answer: null,
    answeredAt: null,
    ...extra,
  });
  it("an outcome maps to its phase: exact 1, cousin 2, none 3", async () => {
    const { PHASE } = await import("./find-outcome.mjs");
    expect(PHASE).toEqual({ exact: 1, cousin: 2, none: 3 });
  });
  it("'good enough' skips the item and marks it accepted; 'build' and no answer both build", async () => {
    const { planPhase, withAnswer } = await import("./find-outcome.mjs");
    const gaps = [
      withAnswer(
        gap("CandlestickChart", "cousin"),
        "good enough",
        "2026-10-20T10:09:00Z",
      ),
      withAnswer(gap("GanttChart", "cousin"), "build", "2026-10-20T10:12:00Z"),
      gap("PieChart", "cousin"), // unanswered after the timeout
      gap("MapPins", "none"), // phase 3: not this phase's business
    ];
    const p2 = planPhase(gaps, 2);
    expect(p2.skipped.map((g) => g.title)).toEqual(["CandlestickChart"]);
    expect(p2.build.map((g) => [g.title, g.decision])).toEqual([
      ["GanttChart", "answered: build"],
      ["PieChart", "no answer: build"],
    ]);
    expect(p2.gaps.find((g) => g.title === "CandlestickChart")?.status).toBe(
      "accepted",
    );
    expect(p2.gaps.find((g) => g.title === "MapPins")?.status).toBe("open");
    const p3 = planPhase(p2.gaps, 3);
    expect(p3.build.map((g) => g.title)).toEqual(["MapPins"]);
  });
  it("the Question names the nearest and the gap, and a gaps.json entry carries the ask fields", async () => {
    const { askText, appendGap } = await import("./find-outcome.mjs");
    expect(askText(gap("CandlestickChart", "cousin"))).toBe(
      'Is ScrubChart good enough for "a CandlestickChart", or should I build CandlestickChart?',
    );
    const { mkdtempSync, readFileSync: rf } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const path = join(mkdtempSync(join(tmpdir(), "sui-gaps-")), "gaps.json");
    const res = {
      outcome: "cousin",
      phase: 2,
      placeholder: "ScrubChart",
      gap: {
        name: "CandlestickChart",
        description: "a candlestick chart",
        nearest: "ScrubChart",
        missing: ["candlestick"],
      },
    };
    appendGap(path, res as never);
    let list = JSON.parse(rf(path, "utf8"));
    expect(list[0]).toMatchObject({
      title: "CandlestickChart",
      phase: 2,
      status: "open",
      askedAt: null,
      answer: null,
      answeredAt: null,
    });
    // the builder answers in place; a re-run of find keeps the answer
    list[0] = {
      ...list[0],
      askedAt: "t0",
      answer: "good enough",
      answeredAt: "t1",
    };
    const { writeFileSync: wf } = await import("node:fs");
    wf(path, JSON.stringify(list));
    appendGap(path, res as never);
    list = JSON.parse(rf(path, "utf8"));
    expect(list[0]).toMatchObject({
      askedAt: "t0",
      answer: "good enough",
      answeredAt: "t1",
    });
  });
});
