// @vitest-environment node
//
// ============================================
// Adherence guard — the rules that make the per-component worklist mean
// something
// ============================================
//
// Two classes of defect are what these tests exist to prevent, because both
// were live in the first draft of the script and both make the report worse
// than no report:
//
//   1. A WRONG DEPTH. Five rules key off the declared depth, so a header
//      parsed loosely mis-files everything downstream. `grep -o "Depth [0-9]"`
//      over the real AnimatedSwimlaneChart.tsx returns TWO values, and
//      RateGauge.tsx:33 ("Why it is Depth 2 and not the Atomic it began as")
//      matches on prose about a different thing entirely.
//
//   2. A FALSE POSITIVE AT THE TOP. `src/components/Badge/` is a namespace
//      holding eight independent Primitives, each with its own stylesheet.
//      Scored by FOLDER it read "Depth 2 owns 8 CSS files" and put seven
//      correct Primitives at the head of the worklist. Scored by MODULE it is
//      eight Primitives owning eight stylesheets, which is the architecture
//      working. `analyse` is per module for this reason and the test below
//      pins it.
//
// `analyse` is pure over a file map, so every case is a handful of string
// literals — no fixture tree, no subprocess. The earlier health.mjs guards
// spawned a process per case and hung CI at fifteen minutes.
import { describe, it, expect } from "vitest";
import {
  analyse,
  intrinsicElementsOf,
  isPrimitiveDepth,
  isUnitPath,
  leadingCommentBlock,
  parseDeclaredDepth,
  renderOpenItems,
} from "./adherence.mjs";

/** Build the `{files, read}` pair `analyse` takes from a path→source map. */
const world = (files: Record<string, string>) => ({
  files: Object.keys(files),
  read: (p: string) => files[p] ?? "",
});

const ruleIds = (report: { items: { id: string }[] }) =>
  report.items.map((i) => i.id);

const HEADER = (name: string, kind: string, depth: number) =>
  `// ============================================\n` +
  `// ${name} — ${kind} (Depth ${depth})\n` +
  `// ============================================\n`;

describe("parseDeclaredDepth — only the canonical header, only at the top", () => {
  it("reads the canonical `— <Kind> (Depth N)` line", () => {
    expect(parseDeclaredDepth(HEADER("RateGauge", "Composite", 2))).toEqual({
      depth: 2,
      kind: "Composite",
      loose: false,
    });
  });

  it("IGNORES prose further down that happens to say `Depth 2`", () => {
    // The real RateGauge.tsx:33 shape. Taking this match would have declared a
    // Primitive to be a Composite and put its legitimate stylesheet at the top
    // of the worklist.
    const src =
      HEADER("Thing", "Atomic", 1) +
      `import { Stack } from "../Layout";\n` +
      `// Why it is Depth 2 and not the Atomic it began as: …\n`;
    expect(parseDeclaredDepth(src).depth).toBe(1);
  });

  it("reports a file whose ONLY `Depth N` is prose as loose, not as a depth", () => {
    // This is the state that passes health's `missingDepthHeaders`, which is a
    // bare /Depth [0-9]/ over the whole file. Assigning the prose match would
    // hide the gap the rule exists to surface.
    const src = `// Thing — some component\nexport const Thing = () => null;\n// it wraps a Depth 2 child\n`;
    expect(parseDeclaredDepth(src)).toEqual({
      depth: null,
      kind: null,
      loose: true,
    });
  });

  it("stops at the first non-comment line", () => {
    const src = `// Thing\nexport const x = 1;\n// Thing — Composite (Depth 3)\n`;
    expect(parseDeclaredDepth(src).depth).toBeNull();
    expect(leadingCommentBlock(src)).toBe("Thing");
  });
});

describe("isPrimitiveDepth — Depth 0 is the older Primitive label", () => {
  it("treats both 0 and 1 as the Primitive layer", () => {
    // Surface, Cell, Dot, GroupBracket, ResizableContainer and Sparkline all
    // declare `(Depth 0)` and all own CSS legitimately. Reading 0 as "not a
    // Primitive" would put six correct Primitives at the top of the list.
    expect(isPrimitiveDepth(0)).toBe(true);
    expect(isPrimitiveDepth(1)).toBe(true);
    expect(isPrimitiveDepth(2)).toBe(false);
    expect(isPrimitiveDepth(null)).toBe(false);
  });
});

describe("the unit is the module, not the folder", () => {
  const badgeFolder = {
    "/src/components/Badge/StatusBadge.tsx":
      HEADER("StatusBadge", "Atomic", 1) + `export const StatusBadge = () => null;`,
    "/src/components/Badge/StatusBadge.css": ".badge {}",
    "/src/components/Badge/TagPill.tsx":
      HEADER("TagPill", "Atomic", 1) + `export const TagPill = () => null;`,
    "/src/components/Badge/TagPill.css": ".pill {}",
    "/src/components/Badge/ComposedTag.tsx":
      HEADER("ComposedTag", "Composite", 2) +
      `import { TagPill } from "./TagPill";\nexport const ComposedTag = () => null;`,
  };

  it("does not blame a namespace folder's deepest member for its siblings' CSS", () => {
    const report = analyse(world(badgeFolder));
    // The Composite in the folder owns no stylesheet of its own, so nothing
    // fires. Folder-scored, this was `ADH-Badge-css` with eight files.
    expect(ruleIds(report)).not.toContain("ADH-ComposedTag-css");
    expect(ruleIds(report)).not.toContain("ADH-Badge-css");
  });

  it("names the module in the item id, so a refactor knows what to open", () => {
    const report = analyse(
      world({
        ...badgeFolder,
        "/src/components/Badge/ComposedTag.css": ".composed {}",
      }),
    );
    expect(ruleIds(report)).toContain("ADH-ComposedTag-css");
  });

  it("selects PascalCase .tsx only, matching health's own component selector", () => {
    expect(isUnitPath("/src/components/A/A.tsx")).toBe(true);
    expect(isUnitPath("/src/components/A/dial.tsx")).toBe(false);
    expect(isUnitPath("/src/components/A/A.test.tsx")).toBe(false);
    expect(isUnitPath("/src/components/A/types.ts")).toBe(false);
  });
});

describe("css — a Composite owns zero CSS files", () => {
  it("flags a Depth-2 module that owns its own stylesheet", () => {
    const report = analyse(
      world({
        "/src/components/Fab/Fab.tsx":
          HEADER("Fab", "Composite", 2) + `export const Fab = () => null;`,
        "/src/components/Fab/Fab.css": ".fab {}",
      }),
    );
    expect(ruleIds(report)).toContain("ADH-Fab-css");
    expect(report.items.find((i) => i.id === "ADH-Fab-css")?.severity).toBe(
      "high",
    );
  });

  it("does NOT flag a Primitive that owns one", () => {
    const report = analyse(
      world({
        "/src/components/Button/Button.tsx":
          HEADER("Button", "Atomic", 1) + `export const Button = () => null;`,
        "/src/components/Button/Button.css": ".btn {}",
      }),
    );
    expect(ruleIds(report)).toEqual([]);
  });

  it("suspends the rule for a layout-exempt component, with the reason attached", () => {
    const report = analyse({
      ...world({
        "/src/components/Modal/Modal.tsx":
          HEADER("Modal", "Composite", 2) + `export const Modal = () => null;`,
        "/src/components/Modal/Modal.css": ".modal {}",
      }),
      exemptions: {
        components: {
          Modal: { rules: ["css"], reason: "STYLE_GUIDE layout-exempt" },
        },
      },
    });
    expect(ruleIds(report)).not.toContain("ADH-Modal-css");
    expect(report.exempted.map((i) => i.id)).toContain("ADH-Modal-css");
    expect(report.exempted[0].exempt).toBe("STYLE_GUIDE layout-exempt");
  });

  it("accepts an exemption keyed by the FOLDER, for a named family", () => {
    // The STYLE_GUIDE exempts "the Layout family", not Stack/Row/Box one by
    // one, so the config has to be expressible the way the document is.
    const report = analyse({
      ...world({
        "/src/components/Layout/Grid.tsx":
          HEADER("Grid", "Composite", 2) + `export const Grid = () => null;`,
        "/src/components/Layout/Grid.css": ".grid {}",
      }),
      exemptions: {
        components: {
          Layout: { rules: ["css"], reason: "the arrangement vocabulary" },
        },
      },
    });
    expect(ruleIds(report)).not.toContain("ADH-Grid-css");
  });
});

describe("intrinsic — HTML is a finding, SVG is information", () => {
  it("counts each element type separately", () => {
    const counts = intrinsicElementsOf(
      `<div><div /><span>x</span><path d="" /></div>`,
    );
    expect(counts.get("div")).toBe(2);
    expect(counts.get("span")).toBe(1);
    expect(counts.get("path")).toBe(1);
  });

  it("does not count a Component or a comment's example", () => {
    const counts = intrinsicElementsOf(
      `// <div> in prose\n<Stack><TagPill /></Stack>`,
    );
    expect(counts.size).toBe(0);
  });

  it("splits a chart's SVG interior out as info, per §8", () => {
    const report = analyse(
      world({
        "/src/components/Spark/Spark.tsx":
          HEADER("Spark", "Composite", 2) +
          `export const Spark = () => <svg><path d="" /><div>legend</div></svg>;`,
      }),
    );
    const bySeverity = Object.fromEntries(
      report.items.map((i) => [i.rule, i.severity]),
    );
    expect(bySeverity["intrinsic"]).toBe("high");
    expect(bySeverity["intrinsic-svg"]).toBe("info");
  });
});

describe("inline-style — the §1 passthrough is not a violation", () => {
  it("flags style={{ } and ignores style={props.style}", () => {
    const report = analyse(
      world({
        "/src/components/Panel/Panel.tsx":
          HEADER("Panel", "Composite", 2) +
          `export const Panel = (p) => <Box style={p.style} />;`,
        "/src/components/Panel/inner.tsx": `export const I = () => <Box style={{ left: x() }} />;`,
      }),
    );
    // The private lowercase module's style belongs to the unit it serves —
    // MutationSliders' `dial.tsx` is the real shape of this.
    const item = report.items.find((i) => i.id === "ADH-Panel-inline-style");
    expect(item?.detail).toEqual(["src/components/Panel/inner.tsx:1"]);
  });
});

describe("third-party — a Composite may not skip the Primitive wrapper", () => {
  it("flags a configured UI-primitive package and leaves d3 alone", () => {
    const report = analyse({
      ...world({
        "/src/components/Sliders/Sliders.tsx":
          HEADER("Sliders", "Composite", 2) +
          `import { Slider } from "@kobalte/core/slider";\nimport { scaleLinear } from "d3-scale";`,
      }),
      exemptions: { thirdPartyPrimitives: ["@kobalte/"] },
    });
    const item = report.items.find((i) => i.id === "ADH-Sliders-third-party");
    expect(item?.detail).toEqual(["@kobalte/core/slider"]);
  });
});

describe("depth-mismatch — the repo's headers against each other", () => {
  it("flags a Depth-2 module importing something the repo calls Depth 2", () => {
    const report = analyse(
      world({
        "/src/components/Inner/Inner.tsx":
          HEADER("Inner", "Composite", 2) + `export const Inner = () => null;`,
        "/src/components/Outer/Outer.tsx":
          HEADER("Outer", "Composite", 2) +
          `import { Inner } from "../Inner/Inner";\nexport const Outer = () => null;`,
      }),
    );
    const item = report.items.find((i) => i.id === "ADH-Outer-depth-mismatch");
    expect(item?.detail[0]).toContain("declares 2");
    expect(item?.detail[0]).toContain("implies 3");
    expect(ruleIds(report)).not.toContain("ADH-Inner-depth-mismatch");
  });

  it("narrows a BARREL import to the module exporting the imported name", () => {
    // `import { Stack } from "../Layout"` must be credited with Stack's depth,
    // not with the deepest member of the Layout barrel. Without this, every
    // component importing any barrel inherits that barrel's worst case and the
    // rule fires on almost everything.
    const report = analyse(
      world({
        "/src/components/Layout/index.ts": `export * from "./Stack";\nexport * from "./Deep";`,
        "/src/components/Layout/Stack.tsx":
          HEADER("Stack", "Primitive", 1) + `export const Stack = () => null;`,
        "/src/components/Layout/Deep.tsx":
          HEADER("Deep", "Composite", 3) + `export const Deep = () => null;`,
        "/src/components/Card/Card.tsx":
          HEADER("Card", "Composite", 2) +
          `import { Stack } from "../Layout";\nexport const Card = () => null;`,
      }),
    );
    expect(ruleIds(report)).not.toContain("ADH-Card-depth-mismatch");
  });

  it("survives a barrel cycle instead of recurring forever", () => {
    const report = analyse(
      world({
        "/src/components/A/index.ts": `export * from "../B/index";`,
        "/src/components/B/index.ts": `export * from "../A/index";`,
        "/src/components/A/A.tsx":
          HEADER("A", "Atomic", 1) + `export const A = () => null;`,
      }),
    );
    expect(report.summary.components).toBe(1);
  });
});

describe("kind-depth-conflict — a header that contradicts itself", () => {
  it("reports `Atomic (Depth 2)` rather than resolving it silently", () => {
    const report = analyse(
      world({
        "/src/components/Odd/Odd.tsx":
          HEADER("Odd", "Atomic", 2) + `export const Odd = () => null;`,
        "/src/components/Odd/Odd.css": ".odd {}",
      }),
    );
    expect(ruleIds(report)).toContain("ADH-Odd-kind-depth-conflict");
    // And the Composite rules stay quiet: the author's claim is "Atomic", so
    // blaming it for owning a stylesheet would be acting on the half of a
    // contradiction we happened to prefer.
    expect(ruleIds(report)).not.toContain("ADH-Odd-css");
  });
});

describe("helper-exports and missing-factory", () => {
  it("flags a bare helper function reaching the root barrel", () => {
    const report = analyse({
      ...world({
        "/src/components/Tree/Tree.tsx":
          HEADER("Tree", "Composite", 2) +
          `export const Tree = () => null;\nexport function flattenTree() {}\nexport function createTree() {}\nexport function useTree() {}`,
      }),
      publicNames: new Set(["Tree", "flattenTree", "createTree", "useTree"]),
    });
    const item = report.items.find((i) => i.id === "ADH-Tree-helper-exports");
    // A Factory and a hook are the sanctioned public shapes; a bare transform
    // is the component's internals.
    expect(item?.detail).toEqual(["flattenTree"]);
  });

  it("asks missing-factory only of a folder's primary unit", () => {
    const report = analyse({
      ...world({
        "/src/components/List/List.tsx":
          HEADER("List", "Composite", 2) + `export const List = () => null;`,
        "/src/components/List/ListItem.tsx":
          HEADER("ListItem", "Composite", 2) +
          `export const ListItem = () => null;`,
      }),
      publicNames: new Set(["List", "ListItem"]),
    });
    expect(ruleIds(report)).toContain("ADH-List-missing-factory");
    // A published SUB-component reaches a caller through its parent's curried
    // set and owes no factory of its own.
    expect(ruleIds(report)).not.toContain("ADH-ListItem-missing-factory");
  });

  it("is satisfied by a variants.ts in the folder", () => {
    const report = analyse({
      ...world({
        "/src/components/List/List.tsx":
          HEADER("List", "Composite", 2) + `export const List = () => null;`,
        "/src/components/List/variants.ts": `export const TightList = List;`,
      }),
      publicNames: new Set(["List"]),
    });
    expect(ruleIds(report)).not.toContain("ADH-List-missing-factory");
  });
});

describe("unused-variants — production consumers only", () => {
  it("counts a carried-forward manifest consumer and ignores an absent one", () => {
    const report = analyse({
      ...world({
        "/src/components/Fab/Fab.tsx":
          HEADER("Fab", "Composite", 2) +
          `export const Fab = () => null;\nexport const GhostFab = () => null;`,
        "/src/components/Fab/variants.ts": `export const X = 1;`,
      }),
      publicNames: new Set(["Fab", "GhostFab"]),
      // `Fab` is imported by a repo the manifest carried forward from another
      // machine; `GhostFab` by nobody. dev/showcases never appears here — §4:
      // "Showcase-only or test-only usage is not demand".
      consumers: { Fab: ["jtf-ui"] },
    });
    const item = report.items.find((i) => i.id === "ADH-Fab-unused-variants");
    expect(item?.detail).toEqual(["GhostFab"]);
    expect(item?.severity).toBe("info");
  });
});

describe("the report as a worklist", () => {
  const busy = () =>
    analyse({
      ...world({
        "/src/components/Big/Big.tsx":
          HEADER("Big", "Composite", 2) +
          `export const Big = () => <div><span/><ul/><li/><table/></div>;`,
        "/src/components/Big/Big.css": ".big {}",
        "/src/components/Sm/Sm.tsx":
          HEADER("Sm", "Composite", 2) + `export const Sm = () => null;`,
        "/src/components/Sm/Sm.css": ".sm {}",
      }),
    });

  it("ranks high before medium before info, then smallest job first", () => {
    // The SessionStart hook prints only the first dozen lines, so the cheapest
    // actionable item has to be reachable from there.
    const { items } = busy();
    expect(items[0].severity).toBe("high");
    const highs = items.filter((i) => i.severity === "high");
    expect(highs.map((i) => i.detail.length)).toEqual(
      [...highs.map((i) => i.detail.length)].sort((a, b) => a - b),
    );
  });

  it("emits ONE item per (component, rule), whatever the occurrence count", () => {
    const { items } = busy();
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    const intrinsic = items.find((i) => i.id === "ADH-Big-intrinsic");
    expect(intrinsic?.detail.length).toBe(5);
  });

  it("leads OPEN_ITEMS.md with a flat id-first list, not with headings", () => {
    const md = renderOpenItems(busy(), { at: "PINNED" });
    const head = md.split("\n").slice(0, 12);
    expect(head.filter((l) => l.startsWith("- `ADH-")).length).toBeGreaterThan(
      0,
    );
    expect(md).toContain("PINNED");
  });
});
