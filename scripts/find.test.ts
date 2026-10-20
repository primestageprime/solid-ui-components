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
  it("held-out split: at least 27/29 top-1 and 29/29 top-3 (never tuned on)", () => {
    const s = hits(
      bench.filter((b) => b.split === "heldout"),
      tuned,
    );
    expect(s.n).toBe(29);
    expect(s.top1).toBeGreaterThanOrEqual(27);
    expect(s.top3).toBe(29);
  });
  it("the seven real misses are all top-1 now, and were 1/7 on the legacy ranker", () => {
    const real = bench.filter((b) => b.miss);
    expect(hits(real, tuned).top1).toBe(7);
    expect(hits(real, legacy).top1).toBeLessThanOrEqual(2);
  });
});
