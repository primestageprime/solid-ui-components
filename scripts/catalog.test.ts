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
  firstSentenceOf,
  kebab,
  notToBeConfusedWithOf,
  overridesOf,
  rankCatalog,
  run,
  sinceOf,
  changelogSectionsOf,
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
    expect(primary.summary).toBeNull(); // no COMPONENTS.md entry in this fixture
    expect(primary.notes).toContain("Primary button");
  });
});
