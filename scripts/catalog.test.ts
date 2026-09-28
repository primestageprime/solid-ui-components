// @vitest-environment node
//
// ============================================
// Catalog guard — the discovery index and its ranker
// ============================================
//
// Two layers of test:
//
//   1. Pure unit tests over string fixtures for the extractors (variant
//      assignment, overrides, COMPONENTS.md bullet parsing, ranking) — no fs,
//      no TypeScript Program build, so these run in milliseconds and pin the
//      parsing rules independently of the real repo's current content.
//
//   2. The two ACCEPTANCE QUERIES from the brief, run against the real,
//      current `catalog.json`-equivalent (`run()`, which builds fresh from
//      the live repo). These are integration tests on purpose: the whole
//      point of the tool is that `FillPaneRailGrid` / `MajorPaneBox` /
//      `NoShrinkScrollBox` and `HalfFillColumn` are the answers TODAY, in
//      THIS repo, not in a frozen fixture that could drift from COMPONENTS.md
//      and stop meaning anything.
import { describe, it, expect } from "vitest";
import {
  buildCatalog,
  componentsMdBulletFor,
  componentsMdBulletsFor,
  firstSentenceOf,
  kebab,
  notToBeConfusedWithOf,
  overridesOf,
  parsePreferFirstOf,
  parseTopLevelProps,
  precedingCommentOf,
  rankCatalog,
  resolveBaseBullet,
  run,
  scoreRecord,
  sinceOf,
  changelogSectionsOf,
  stripPreferClauses,
  synthesizeFactorySummary,
  synthesizeVariantSummary,
  useForOf,
  variantAssignmentOf,
} from "./catalog.mjs";

describe("variantAssignmentOf", () => {
  it("finds the factory and the raw overrides text of a curried variant", () => {
    const src = `export const PrimaryButton: Component<ButtonDataProps> = createButton({\n  variant: "primary",\n});\n`;
    const v = variantAssignmentOf(src, "PrimaryButton");
    expect(v?.factory).toBe("createButton");
    expect(v?.argsText).toContain('variant: "primary"');
  });

  it("is null for a base component (not a create* assignment)", () => {
    const src = `export function Button(props: ButtonProps) {\n  return <button />;\n}\n`;
    expect(variantAssignmentOf(src, "Button")).toBeNull();
  });

  it("balances nested braces in the overrides object (a `style` sub-object)", () => {
    const src = `export const FillPaneRailGrid: Component<GridDataProps> = createGrid({\n  columns: "x",\n  style: {\n    flex: "1",\n    "min-height": "0",\n  },\n});\nexport const Next = 1;\n`;
    const v = variantAssignmentOf(src, "FillPaneRailGrid");
    expect(v?.argsText).toContain('"min-height": "0"');
    expect(v?.argsText).not.toContain("Next");
  });
});

describe("overridesOf", () => {
  it("extracts the Pick<...> prop list from a *Overrides type", () => {
    const src = `export type ButtonOverrides = Pick<ButtonProps, "variant" | "size">;\n`;
    expect(overridesOf(src, "Button")).toEqual(["variant", "size"]);
  });

  it("is null when no *Overrides type is declared", () => {
    expect(overridesOf("export const x = 1;\n", "Button")).toBeNull();
  });
});

describe("componentsMdBulletFor / firstSentenceOf / useForOf / notToBeConfusedWithOf", () => {
  const doc =
    "## Layout\n" +
    "- **HalfFillColumn** — Curried `Stack` taking an EQUAL share. " +
    "Not `ClipFillColumn`, which measures content first. Use for: two stacked charts that must get the same room.\n" +
    "  - **AlarmBands** — nested bullet form, indented.\n";

  it("matches a top-level bullet", () => {
    const bullet = componentsMdBulletFor(doc, "HalfFillColumn");
    expect(bullet).toContain("Curried `Stack`");
  });

  it("matches an INDENTED (nested) bullet too", () => {
    expect(componentsMdBulletFor(doc, "AlarmBands")).toContain("nested bullet form");
  });

  it("returns null when the name has no bullet of its own", () => {
    expect(componentsMdBulletFor(doc, "NoSuchComponent")).toBeNull();
  });

  it("summary is the first sentence only", () => {
    const bullet = componentsMdBulletFor(doc, "HalfFillColumn")!;
    expect(firstSentenceOf(bullet)).toBe("Curried `Stack` taking an EQUAL share.");
  });

  it("useFor captures the clause after 'Use for:'", () => {
    const bullet = componentsMdBulletFor(doc, "HalfFillColumn")!;
    expect(useForOf(bullet)).toBe("two stacked charts that must get the same room.");
  });

  it("notToBeConfusedWith captures the 'Not `X`' clause", () => {
    const bullet = componentsMdBulletFor(doc, "HalfFillColumn")!;
    expect(notToBeConfusedWithOf(bullet)?.[0]).toContain("ClipFillColumn");
  });
});

// Three real COMPONENTS.md bullet fragments (copied verbatim, not
// paraphrased) covering the shapes `parsePreferFirstOf`/`stripPreferClauses`
// actually have to handle: a single-name "... first" pointer, a
// multi-name/parenthetical-aside "... first" list, and the "directly"
// closing word that must NOT be read as a pointer (self-reference).
describe("parsePreferFirstOf / stripPreferClauses — real bullet fragments", () => {
  it("HotkeyButton: a single-name 'reach for `X` first if ...' pointer", () => {
    const bullet =
      "Use for: the exact `[c]laim`-style affordance already reused by " +
      "`ActionList`'s multi-select actions bar — reach for `ActionList` " +
      "first if the surrounding list already exists; use `HotkeyButton` " +
      "directly for a standalone keyboard-driven action.";
    expect(parsePreferFirstOf(bullet, "HotkeyButton")).toEqual(["ActionList"]);
    // `HotkeyButton` names itself with "directly", which isn't a
    // `first`/`instead` pointer — the self-reference is excluded either way.
    const stripped = stripPreferClauses(bullet);
    expect(stripped).not.toContain("reach for");
    expect(stripped).not.toContain("if the surrounding list already exists");
    expect(stripped).toContain("use `HotkeyButton` directly");
  });

  it("BarSeries: a multi-name list with parenthetical asides, terminated by 'first'", () => {
    const bullet =
      "Use for: counts or stacked totals over time or category — but reach " +
      "for `CompletionTimeline` (bucketed counts with a running total), " +
      "`StackedTimelineChart` (bucketed stacked columns with change " +
      "events), or `ChannelChart` (diverging bars under a channel) first.";
    expect(parsePreferFirstOf(bullet, "BarSeries")).toEqual([
      "CompletionTimeline",
      "StackedTimelineChart",
      "ChannelChart",
    ]);
    // The composite's own descriptive vocabulary ("stacked", "events") lived
    // entirely inside the stripped clause's parentheticals — this is the
    // exact leak `stripPreferClauses` exists to close.
    const stripped = stripPreferClauses(bullet);
    expect(stripped).not.toContain("StackedTimelineChart");
    expect(stripped).not.toContain("change events");
    expect(stripped).toContain("counts or stacked totals over time or category");
  });

  it("CountBadge: 'reach for `X` directly' is a self-reference, not a pointer", () => {
    const bullet =
      "Note: `NotificationCenter` already composes this — reach for " +
      "`CountBadge` directly only when building your own trigger.";
    expect(parsePreferFirstOf(bullet, "CountBadge")).toEqual([]);
    // Neither "directly" nor "when" is a parsed terminator, so nothing is
    // stripped — the sentence stays intact (self-referential text is not
    // the leak this exists to fix; there's no OTHER component's vocabulary
    // in it to leak).
    expect(stripPreferClauses(bullet)).toBe(bullet);
  });
});

describe("componentsMdBulletsFor / resolveBaseBullet", () => {
  const doc =
    "## Layout\n" +
    "- **Grid** — Layout's two-dimensional grid primitive.\n" +
    "## Chart\n" +
    "- **Grid** — Chart's background gridline mark.\n" +
    "- **AreaSeries** — a filled area mark.\n";

  it("returns one {section, bullet} pair per occurrence of a same-named bullet", () => {
    const occurrences = componentsMdBulletsFor(doc, "Grid");
    expect(occurrences).toEqual([
      { section: "Layout", bullet: "Layout's two-dimensional grid primitive." },
      { section: "Chart", bullet: "Chart's background gridline mark." },
    ]);
  });

  it("returns [] for a name with no bullet at all", () => {
    expect(componentsMdBulletsFor(doc, "NoSuchThing")).toEqual([]);
  });

  it("resolveBaseBullet: a single occurrence resolves unambiguously regardless of family", () => {
    expect(resolveBaseBullet(doc, "AreaSeries", "Layout")).toEqual({
      bullet: "a filled area mark.",
      ambiguous: false,
    });
  });

  it("resolveBaseBullet: multiple occurrences resolve to the one whose SECTION matches the family", () => {
    expect(resolveBaseBullet(doc, "Grid", "Layout")).toEqual({
      bullet: "Layout's two-dimensional grid primitive.",
      ambiguous: false,
    });
    expect(resolveBaseBullet(doc, "Grid", "Chart")).toEqual({
      bullet: "Chart's background gridline mark.",
      ambiguous: false,
    });
  });

  it("resolveBaseBullet: multiple occurrences, none matching the family, is ambiguous", () => {
    expect(resolveBaseBullet(doc, "Grid", "Table")).toEqual({ bullet: null, ambiguous: true });
  });
});

describe("kebab", () => {
  it("matches dev/main.tsx's showcase id convention", () => {
    expect(kebab("SwimlaneChart")).toBe("swimlane-chart");
    expect(kebab("BaseTable")).toBe("base-table");
  });
});

describe("changelogSectionsOf / sinceOf", () => {
  const changelog =
    "# Changelog\n\n## Unreleased\n\n## 0.2.0 — 2026-02-01\n\nAdds `Widget`.\n\n## 0.1.0 — 2026-01-01\n\nAdds `Gadget` and `Widget`.\n";

  it("returns the EARLIEST version mentioning a name, not the latest", () => {
    const sections = changelogSectionsOf(changelog);
    expect(sinceOf(changelog, sections, "Widget")).toBe("0.1.0");
  });

  it("is null for a name the changelog never mentions", () => {
    const sections = changelogSectionsOf(changelog);
    expect(sinceOf(changelog, sections, "Sprocket")).toBeNull();
  });
});

describe("scoreRecord / rankCatalog", () => {
  const fixture = [
    {
      name: "FillPaneRailGrid",
      useFor: "a board's bottom band — a pane of controls beside one instrument held to a constant size",
      notToBeConfusedWith: null,
      summary: null,
      notes: null,
    },
    {
      name: "UnrelatedThing",
      useFor: "something about buttons",
      notToBeConfusedWith: null,
      summary: null,
      notes: null,
    },
  ];

  it("ranks the semantically relevant record above an unrelated one", () => {
    const ranked = rankCatalog(fixture as never, "fixed width column beside a growing pane");
    expect(ranked[0]?.record.name).toBe("FillPaneRailGrid");
  });

  it("stopwords like 'a' are excluded from query tokens by rankCatalog", () => {
    // scoreRecord itself is stopword-agnostic (it scores whatever tokens it's
    // given); rankCatalog is where 'a' gets filtered before scoring.
    expect(rankCatalog(fixture as never, "a")).toEqual([]);
  });
});

// ── depth-descending ranking (Peter's ruling, 2026-09-27: "Clients should
// use the largest (highest depth) component that satisfies their use case")
// ── pure fixtures, so the rule is pinned independently of whatever
// COMPONENTS.md prose happens to exist today. See the acceptance-query
// block below for why the brief's own "table with typed cells and a quick
// filter" example can't be pinned as a LIVE test right now. ─────────────────
describe("scoreRecord / rankCatalog — depth as a tiebreak-and-boost", () => {
  it("with EQUAL text relevance, the higher-depth (more finished) record ranks first", () => {
    const fixture = [
      {
        name: "FloatCell",
        useFor: "typed numeric cell rendering inside a table",
        notToBeConfusedWith: null,
        summary: null,
        notes: null,
        depth: 1,
      },
      {
        name: "FieldTable",
        useFor: "typed numeric cell rendering inside a table",
        notToBeConfusedWith: null,
        summary: null,
        notes: null,
        depth: 2,
      },
    ];
    const ranked = rankCatalog(fixture as never, "typed numeric cell table", 10);
    expect(ranked[0]?.record.name).toBe("FieldTable");
  });

  it("does NOT let depth swamp relevance: a Depth-1 exact-name hit still beats an unrelated Depth-3 with only a weak, tangential match", () => {
    const fixture = [
      {
        // Strong, on-topic match: the query phrase is the name itself, plus
        // a matching useFor clause — multiple fields, multiple tokens.
        name: "Grid",
        useFor: "a two-dimensional grid of columns and rows",
        notToBeConfusedWith: null,
        summary: null,
        notes: null,
        depth: 1,
      },
      {
        // Weak, tangential match: only ONE token ("grid") hits, buried in an
        // otherwise unrelated composite three levels deep.
        name: "ExtractionBoard",
        useFor: "a board that happens to render its rows in a grid layout",
        notToBeConfusedWith: null,
        summary: null,
        notes: null,
        depth: 3,
      },
    ];
    const ranked = rankCatalog(fixture as never, "grid", 10);
    expect(ranked[0]?.record.name).toBe("Grid");
  });

  it("a record with no text match scores 0 regardless of depth — the boost never surfaces an unrelated result on its own", () => {
    const fixture = [
      {
        name: "TotallyUnrelated",
        useFor: "nothing to do with the query",
        notToBeConfusedWith: null,
        summary: null,
        notes: null,
        depth: 3,
      },
    ];
    expect(rankCatalog(fixture as never, "grid layout columns", 10)).toEqual([]);
  });

  it("a null depth is neutral — neither boosted nor penalized against a record with a real depth", () => {
    const fixture = [
      { name: "KnownDepthGrid", useFor: "grid layout primitive", notToBeConfusedWith: null, summary: null, notes: null, depth: 1 },
      { name: "UnknownDepthGrid", useFor: "grid layout primitive", notToBeConfusedWith: null, summary: null, notes: null, depth: null },
    ];
    const ranked = rankCatalog(fixture as never, "grid layout", 10);
    // Equal text score; KnownDepthGrid's +1 boost puts it first, but
    // UnknownDepthGrid still surfaces (score > 0, not excluded by null depth).
    expect(ranked.map((r) => r.record.name)).toEqual(["KnownDepthGrid", "UnknownDepthGrid"]);
  });
});

// ── acceptance queries (brief-mandated, run against the live repo) ─────────
describe("npm run find — acceptance queries", () => {
  const records = run();

  it('"fixed width column beside a growing pane" surfaces FillPaneRailGrid, MajorPaneBox, NoShrinkScrollBox', () => {
    const ranked = rankCatalog(records, "fixed width column beside a growing pane", 10);
    const names = ranked.map((r) => r.record.name);
    expect(names).toContain("FillPaneRailGrid");
    expect(names).toContain("MajorPaneBox");
    expect(names).toContain("NoShrinkScrollBox");
  });

  it('"two stacked charts equal height" surfaces HalfFillColumn near the top', () => {
    const ranked = rankCatalog(records, "two stacked charts equal height", 10);
    const names = ranked.map((r) => r.record.name);
    expect(names.slice(0, 3)).toContain("HalfFillColumn");
  });

  // Brief-mandated: "stacked bands over time with events" must put the
  // finished chart (StackedTimelineChart, Depth 2) above the PARTS it
  // composes — AreaSeries, XAxis, AND `BarSeries`, which PR #234 left as a
  // documented honest failure (BarSeries' own new bullet, "... but reach for
  // `CompletionTimeline` ... `StackedTimelineChart` (bucketed stacked
  // columns with change events) ... first", quoted StackedTimelineChart's
  // OWN descriptive vocabulary — "stacked", "events" — inside a
  // parenthetical, so BarSeries out-scored the chart it was pointing away
  // from). Two changes fix it together: `stripPreferClauses` removes that
  // parenthetical from BarSeries' SCORED text (see `textOf` above), and the
  // parsed `preferFirst` edge (`BarSeries.preferFirst` now includes
  // `"StackedTimelineChart"`) makes `rankCatalog` rank the pointed-to
  // composite above the part outright once both match — not a case-by-case
  // score negotiation. StackedTimelineChart now ranks #1 for this query.
  it('"stacked bands over time with events" puts StackedTimelineChart above every part it composes, including BarSeries (previously left as an honest failure — see PR #234)', () => {
    const ranked = rankCatalog(records, "stacked bands over time with events", records.length);
    const names = ranked.map((r) => r.record.name);
    const stackedIdx = names.indexOf("StackedTimelineChart");
    expect(stackedIdx).toBeGreaterThanOrEqual(0);
    for (const partName of ["AreaSeries", "XAxis", "BarSeries"]) {
      const partIdx = names.indexOf(partName);
      if (partIdx !== -1) expect(stackedIdx).toBeLessThan(partIdx);
    }
  });

  // Brief-mandated: "table with typed cells and a quick filter" is meant to
  // put FieldTable above the table-cell PARTS it composes. PR #234 left this
  // as an honest failure: `TableQuickFilter` out-scores `FieldTable` on bare
  // name hits ("table"/"quick"/"filter" all hit its NAME), and neither
  // FieldTable nor its cells had a depth signal for `DEPTH_BOOST` to act on
  // at the time.
  //
  // What actually fixes the brief's example is not depth — it's the
  // `preferFirst` edge: nine of the typed cell renderers' own bullets say
  // "reach for `FieldTable` (`fields.xCol`) first" (read from COMPONENTS.md,
  // not hand-picked — `records.filter(r => r.preferFirst?.includes
  // ("FieldTable"))` below), and `rankCatalog` now ranks FieldTable above
  // every one of them that matches this query. `TableQuickFilter` itself
  // still out-scores FieldTable (its OWN bullet never says "reach for
  // `FieldTable` ... first/instead" — see `PREFER_CLAUSE_RE`'s doc comment
  // for why that phrasing, specifically, is deliberately left unparsed) —
  // that's a separate, real gap this PR doesn't claim to close, so this test
  // asserts only what the parsed edges actually establish: FieldTable above
  // the cells that point at it.
  it('"table with typed cells and a quick filter" ranks FieldTable above every table-cell renderer whose own bullet reaches for it first (previously left as an honest failure — see PR #234)', () => {
    const cellsPointingAtFieldTable = records.filter(
      (r) => Array.isArray(r.preferFirst) && r.preferFirst.includes("FieldTable"),
    );
    // A regression here means COMPONENTS.md's cell bullets stopped saying
    // "reach for `FieldTable` ... first" OR the parser stopped reading it —
    // either way, worth knowing about explicitly rather than the test below
    // silently vacuously passing on zero cells.
    expect(cellsPointingAtFieldTable.length).toBeGreaterThan(0);

    const ranked = rankCatalog(records, "table with typed cells and a quick filter", records.length);
    const names = ranked.map((r) => r.record.name);
    const fieldTableIdx = names.indexOf("FieldTable");
    expect(fieldTableIdx).toBeGreaterThanOrEqual(0);

    for (const cell of cellsPointingAtFieldTable) {
      const cellIdx = names.indexOf(cell.name);
      if (cellIdx === -1) continue; // this cell's own bullet didn't match the query at all
      expect(fieldTableIdx).toBeLessThan(cellIdx);
    }
  });

  // ChartCanvasLg previously had summary: null (no COMPONENTS.md bullet of
  // its own AND no JSDoc — ChartCanvas.md documents the family in prose
  // under "ChartCanvas", not per curried variant). The synthesis rule gives
  // it a summary built from its baked `height: 300` override, so it is now
  // findable by that value even though nothing was hand-written for it.
  it('a variant that previously had summary: null (ChartCanvasLg) is now findable by its synthesized "height: 300"', () => {
    const target = records.find((r) => r.name === "ChartCanvasLg")!;
    expect(target.summary).not.toBeNull();
    expect(target.summarySource).toBe("synthesized");

    const ranked = rankCatalog(records, "chart canvas height 300", 10);
    expect(ranked.map((r) => r.record.name)).toContain("ChartCanvasLg");
  });
});

describe("buildCatalog — end-to-end on a tiny fixture surface", () => {
  it("produces a variant record with resolved depth, overrides, and dataProps from the FACTORY's file", () => {
    const surface = {
      exports: [
        {
          name: "createButton",
          kind: "factory",
          file: "src/components/Button/Button.tsx",
          line: 85,
          dir: "Button",
        },
        {
          name: "PrimaryButton",
          kind: "component",
          file: "src/components/Button/variants.ts",
          line: 18,
          dir: "Button",
        },
      ],
    };
    const files: Record<string, string> = {
      "src/components/Button/Button.tsx":
        "// Button — Primitive (Depth 1)\n" +
        'export type ButtonOverrides = Pick<ButtonProps, "variant" | "size">;\n' +
        "export type ButtonDataProps = Omit<ButtonProps, keyof ButtonOverrides>;\n" +
        "export function createButton(defaults: ButtonOverrides) {}\n",
      "src/components/Button/variants.ts":
        "// Primary button — default size\n" +
        'export const PrimaryButton: Component<ButtonDataProps> = createButton({\n  variant: "primary",\n});\n',
    };
    const records = buildCatalog({
      surface,
      readSrc: (f) => files[f],
      componentsMd: "",
      changelogSrc: "",
      mainTsxSrc: "",
    });
    const primary = records.find((r) => r.name === "PrimaryButton")!;
    expect(primary.kind).toBe("variant");
    expect(primary.depth).toBe(1);
    expect(primary.variantOf?.factory).toBe("createButton");
    expect(primary.overrides).toEqual(["variant", "size"]);
    expect(primary.dataProps).toBe("ButtonDataProps");
    // No COMPONENTS.md entry in this fixture, but the JSDoc immediately
    // above the export IS taken as the summary (priority 2, ahead of
    // synthesis) — `summary: null` is no longer possible for a variant with
    // either a bullet OR a JSDoc comment.
    expect(primary.summary).toBe("Primary button — default size");
    expect(primary.summarySource).toBe("jsdoc");
    expect(primary.notes).toContain("Primary button");
  });

  it("synthesizes a variant summary from its baked overrides when it has NEITHER a bullet NOR a JSDoc comment, inheriting the base's bullet as a lead-in", () => {
    const surface = {
      exports: [
        {
          name: "createGrid",
          kind: "factory",
          file: "src/components/Layout/Grid.tsx",
          line: 63,
          dir: "Layout",
        },
        {
          name: "FillPaneRailGrid",
          kind: "component",
          file: "src/components/Layout/variants.ts",
          line: 419,
          dir: "Layout",
        },
      ],
    };
    const files: Record<string, string> = {
      "src/components/Layout/Grid.tsx":
        "// Grid — Primitive (Depth 1)\n" +
        'export type GridOverrides = Pick<GridProps, "columns" | "gap">;\n' +
        "export function createGrid(defaults: GridOverrides) {}\n",
      "src/components/Layout/variants.ts":
        "export const FillPaneRailGrid: Component<GridDataProps> = createGrid({\n" +
        '  columns: "minmax(0, 1fr) 292px",\n' +
        '  gap: "sm",\n' +
        "});\n",
    };
    const componentsMd =
      "- **Grid** — A two-dimensional layout primitive with explicit column and row tracks.\n";
    const records = buildCatalog({
      surface,
      readSrc: (f) => files[f],
      componentsMd,
      changelogSrc: "",
      mainTsxSrc: "",
    });
    const variant = records.find((r) => r.name === "FillPaneRailGrid")!;
    expect(variant.summary).toBe(
      'A two-dimensional layout primitive with explicit column and row tracks. A `Grid` variant with `columns: "minmax(0, 1fr) 292px"`, `gap: "sm"`.',
    );
    expect(variant.summarySource).toBe("synthesized");

    const factory = records.find((r) => r.name === "createGrid")!;
    expect(factory.summary).toBe(
      "A two-dimensional layout primitive with explicit column and row tracks. Factory behind `Grid`'s curried variants; bakes `columns`, `gap`.",
    );
    expect(factory.summarySource).toBe("synthesized");
  });

  it("resolves a same-named base bullet by FAMILY first — the chart-parts agent's bug: Layout's createGrid must inherit Layout's Grid bullet, never Chart's", () => {
    const surface = {
      exports: [
        {
          name: "createGrid",
          kind: "factory",
          file: "src/components/Layout/Grid.tsx",
          line: 63,
          dir: "Layout",
        },
        {
          name: "FillPaneRailGrid",
          kind: "component",
          file: "src/components/Layout/variants.ts",
          line: 419,
          dir: "Layout",
        },
      ],
    };
    const files: Record<string, string> = {
      "src/components/Layout/Grid.tsx": "export function createGrid(defaults) {}\n",
      "src/components/Layout/variants.ts":
        'export const FillPaneRailGrid: Component<GridDataProps> = createGrid({\n  columns: "x",\n});\n',
    };
    // Two unrelated components both happen to be named "Grid" in the
    // manifest, each under its OWN family's section — Layout's layout
    // primitive and Chart's gridline component. The OLD rule counted
    // bullets by NAME ONLY (`baseBulletCount === 1`), saw two, and gave up —
    // or worse, in the single-bullet case, blindly inherited whichever
    // family's bullet happened to exist, misattributing it. The fix
    // resolves by family FIRST: `createGrid` lives in `Layout`, so it must
    // inherit Layout's bullet, never Chart's.
    const componentsMd =
      "## Layout\n" +
      "- **Grid** — Layout's two-dimensional grid primitive.\n" +
      "## Chart\n" +
      "- **Grid** — Chart's background gridline mark.\n";
    const records = buildCatalog({
      surface,
      readSrc: (f) => files[f],
      componentsMd,
      changelogSrc: "",
      mainTsxSrc: "",
    });
    const variant = records.find((r) => r.name === "FillPaneRailGrid")!;
    expect(variant.summary).toBe(
      "Layout's two-dimensional grid primitive. A `Grid` variant with `columns: \"x\"`.",
    );
    expect(variant.summary).not.toContain("Chart's background gridline mark");
    expect(variant.summary).not.toContain("(base ambiguous)");
  });

  it("falls back to '(base ambiguous)' when NEITHER same-named bullet's section matches the base's family", () => {
    const surface = {
      exports: [
        {
          name: "createGrid",
          kind: "factory",
          file: "src/components/Layout/Grid.tsx",
          line: 63,
          dir: "Layout",
        },
        {
          name: "FillPaneRailGrid",
          kind: "component",
          file: "src/components/Layout/variants.ts",
          line: 419,
          dir: "Layout",
        },
      ],
    };
    const files: Record<string, string> = {
      "src/components/Layout/Grid.tsx": "export function createGrid(defaults) {}\n",
      "src/components/Layout/variants.ts":
        'export const FillPaneRailGrid: Component<GridDataProps> = createGrid({\n  columns: "x",\n});\n',
    };
    // Both bullets sit under sections OTHER than "Layout" — the family
    // resolution has nothing to prefer, and falling back to "just pick one"
    // would silently misattribute again, so this stays ambiguous.
    const componentsMd =
      "## Chart\n" +
      "- **Grid** — Chart's background gridline mark.\n" +
      "## Table\n" +
      "- **Grid** — Table's cell grid mark.\n";
    const records = buildCatalog({
      surface,
      readSrc: (f) => files[f],
      componentsMd,
      changelogSrc: "",
      mainTsxSrc: "",
    });
    const variant = records.find((r) => r.name === "FillPaneRailGrid")!;
    expect(variant.summary).toBe('A `Grid` variant with `columns: "x"`. (base ambiguous)');
  });

  it("a barrel re-export ALIAS (same {file, line} as another export, but no declaration of its own) inherits that export's summary", () => {
    const surface = {
      exports: [
        {
          name: "ButtonGroup",
          kind: "component",
          file: "src/components/ButtonGroup/variants.ts",
          line: 10,
          dir: "ButtonGroup",
        },
        {
          // `export { ButtonGroup as HUDButtonGroup } from "./components/ButtonGroup"`
          // resolves, via the TS checker, to the SAME file/line as ButtonGroup.
          name: "HUDButtonGroup",
          kind: "component",
          file: "src/components/ButtonGroup/variants.ts",
          line: 10,
          dir: "ButtonGroup",
        },
      ],
    };
    const files: Record<string, string> = {
      "src/components/ButtonGroup/variants.ts":
        "export const ButtonGroup: Component<ButtonGroupDataProps> = createButtonGroup({});\n",
    };
    const componentsMd = "- **ButtonGroup** — Button arrangement container.\n";
    const records = buildCatalog({
      surface,
      readSrc: (f) => files[f],
      componentsMd,
      changelogSrc: "",
      mainTsxSrc: "",
    });
    const alias = records.find((r) => r.name === "HUDButtonGroup")!;
    expect(alias.summary).toBe("Alias for `ButtonGroup`. Button arrangement container.");
    expect(alias.summarySource).toBe("alias");
  });
});

describe("parseTopLevelProps", () => {
  it("splits top-level key: value pairs, ignoring commas nested inside a `style` object", () => {
    const props = parseTopLevelProps(
      '{\n  columns: "x",\n  style: {\n    flex: "1",\n    "min-height": "0",\n  },\n}',
    );
    expect(props).toEqual([
      { key: "columns", value: '"x"' },
      { key: "style", value: '{\n    flex: "1",\n    "min-height": "0",\n  }' },
    ]);
  });

  it("drops a bare spread (no describable value)", () => {
    expect(parseTopLevelProps("{ ...defaults, tone: \"accent\" }")).toEqual([
      { key: "tone", value: '"accent"' },
    ]);
  });

  it("returns [] for an empty object literal", () => {
    expect(parseTopLevelProps("{}")).toEqual([]);
  });
});

describe("synthesizeVariantSummary / synthesizeFactorySummary", () => {
  it("renders baked overrides as backtick key:value clauses, with no parent lead-in when parentSummary is null", () => {
    expect(synthesizeVariantSummary("Grid", '{ columns: "x" }', null)).toBe(
      'A `Grid` variant with `columns: "x"`.',
    );
  });

  it("prefixes the parent's summary when given one", () => {
    expect(synthesizeVariantSummary("Grid", '{ columns: "x" }', "A grid primitive.")).toBe(
      'A grid primitive. A `Grid` variant with `columns: "x"`.',
    );
  });

  it("names the default variant explicitly when overrides are empty", () => {
    expect(synthesizeVariantSummary("ButtonGroup", "{}", null)).toBe(
      "A `ButtonGroup` variant with no overrides (the default).",
    );
  });

  it("factory summary bakes prop NAMES only (a factory has no literal values of its own)", () => {
    expect(synthesizeFactorySummary("Grid", ["columns", "gap"], null)).toBe(
      "Factory behind `Grid`'s curried variants; bakes `columns`, `gap`.",
    );
  });
});

describe("precedingCommentOf — trailing `*/` on a single-line block comment", () => {
  it("strips the trailing `*/` marker, not just the leading `/**`", () => {
    const src =
      "/** Accent-tone action row — emphasized context. */\n" +
      'export const AccentActionRow = createActionRow({\n  tone: "accent",\n});\n';
    expect(precedingCommentOf(src, "AccentActionRow")).toBe(
      "Accent-tone action row — emphasized context.",
    );
  });
});

describe("variantAssignmentOf — generic factory call", () => {
  it("matches `create<Factory><Generic>(...)`, not just `create<Factory>(...)`", () => {
    const src =
      "export const AccentHighlightSegments: Component<HighlightSegmentsDataProps<HighlightSegment>> =\n" +
      "  createHighlightSegments<HighlightSegment>({ fillOpacity: 0.22 });\n";
    const v = variantAssignmentOf(src, "AccentHighlightSegments");
    expect(v?.factory).toBe("createHighlightSegments");
    expect(v?.argsText).toContain("fillOpacity: 0.22");
  });
});
