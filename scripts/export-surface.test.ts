import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildExportSurface,
  // @ts-expect-error — plain .mjs module without type declarations
} from "./export-surface.mjs";
import {
  collectExportSurface,
  // @ts-expect-error — plain .mjs module without type declarations
} from "./export-usage-report.mjs";

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

type Prop = { name: string; optional: boolean; type: string; file: string };
type Export = {
  name: string;
  kind: string;
  file: string;
  line: number;
  dir: string | null;
  props?: Prop[];
  inherited?: number;
  members?: string[];
  signature?: string;
  type?: string;
};
type Surface = {
  entry: string;
  total: number;
  counts: Record<string, number>;
  exports: Export[];
};

// Building the Program costs ~1.7s over ~890 files, so it is built once for
// the whole file rather than per test. These all assert against the REAL
// src/index.ts on purpose: the value of this extractor is entirely in whether
// it tells the truth about this library's actual public API, and a fixture
// tree would only pin that the compiler API works, which is not in doubt.
let surface: Surface;
const byName = (name: string): Export => {
  const found = surface.exports.find((e) => e.name === name);
  if (!found) throw new Error(`${name} is not exported`);
  return found;
};

beforeAll(() => {
  surface = buildExportSurface() as Surface;
}, 60_000);

describe("export surface — classification", () => {
  it("classifies every exported name", () => {
    expect(surface.exports.filter((e) => e.kind === "unresolved")).toEqual([]);
    const summed = Object.values(surface.counts).reduce((a, b) => a + b, 0);
    expect(summed).toBe(surface.total);
    expect(surface.total).toBe(surface.exports.length);
  });

  // The pin referenced in export-surface.mjs's header. The cheap regex
  // extractor in export-usage-report.mjs stays the one used for name-level
  // work (the #12565 breakage gate); it is only trustworthy for that while it
  // agrees with the compiler. If this fails, the regex extractor has drifted —
  // fix it there, do not relax this.
  it("agrees exactly with the text-based extractor on WHICH names are exported", () => {
    const regex: Set<string> = collectExportSurface(
      path.join(REPO_ROOT, "src/index.ts"),
    ).allExports;
    const semantic = new Set(surface.exports.map((e) => e.name));
    expect([...semantic].filter((n) => !regex.has(n))).toEqual([]);
    expect([...regex].filter((n) => !semantic.has(n))).toEqual([]);
  });

  it("reads a component off the barrel and locates its declaration", () => {
    const combobox = byName("Combobox");
    expect(combobox.kind).toBe("component");
    expect(combobox.file).toBe("src/components/Combobox/Combobox.tsx");
    expect(combobox.dir).toBe("Combobox");
  });

  // REGRESSION. src/index.ts re-exports the DateAxis family by an EXPLICIT
  // list rather than `export *`, because that family's `Cell` type collides
  // with the `Cell` table component at the root surface. The list never grew
  // when DailyDateAxis / dayCellContent / dayCellContext were added to
  // src/components/DateAxis/index.ts, so all three shipped in the tarball
  // while no consumer could import them — and COMPONENTS.md documented
  // DailyDateAxis with a copyable example the whole time.
  //
  // The runtime half of this lives in DateAxis.export.test.tsx, which imports
  // the root barrel and asserts each name is callable. This is the static
  // half: that the barrel's export GRAPH resolves the name at all, without
  // executing anything. They fail for different reasons — a name deleted from
  // the family barrel breaks this one, a name that resolves but throws on
  // module init breaks that one — so both are worth having.
  it("reaches names behind an explicit re-export list, not just `export *`", () => {
    expect(byName("DailyDateAxis").file).toBe(
      "src/components/DateAxis/DailyDateAxis.tsx",
    );
    expect(byName("dayCellContent").kind).toBe("function");
    expect(byName("dayCellContext").kind).toBe("function");
    expect(byName("DailyDateAxisProps").kind).toBe("type");
  });

  it("classifies a namespace re-export and enumerates its members", () => {
    // `export * as fields from "./components/Table/fields"`. Consumers reach
    // these as `fields.text`, never as bare top-level names.
    const fields = byName("fields");
    expect(fields.kind).toBe("namespace");
    expect(fields.members?.length).toBeGreaterThan(0);
  });

  it("classifies a non-callable value as a const", () => {
    expect(byName("ICON_PATHS").kind).toBe("const");
  });

  it("classifies a type-only export as a type", () => {
    expect(byName("ComboboxOption").kind).toBe("type");
  });

  // Arity guard. Both of these return renderable content or take a single
  // argument, and an arity-only or return-only heuristic files them as
  // components with zero props — indistinguishable downstream from a real
  // component that genuinely has none.
  it("does not mistake a two-argument JSX-returning helper for a component", () => {
    const getCellValue = byName("getCellValue");
    expect(getCellValue.kind).toBe("function");
    expect(getCellValue.props).toBeUndefined();
  });

  it("does not mistake a one-argument formatter for a component", () => {
    expect(byName("formatCompactDuration").kind).toBe("function");
  });
});

describe("export surface — props", () => {
  it("separates a component's own props from its inherited DOM surface", () => {
    // The whole reason for the declaration-site filter: unfiltered, this
    // reports 474 properties because Solid folds in every HTML button
    // attribute, and a 474-row table documents nothing.
    const button = byName("PrimaryButton");
    expect(button.props?.map((p) => p.name).sort()).toEqual([
      "active",
      "loading",
      "tone",
    ]);
    expect(button.inherited).toBeGreaterThan(400);
    for (const prop of button.props ?? [])
      expect(prop.file.startsWith("src/")).toBe(true);
  });

  // Currying is visible in the types, which is what makes a generated table
  // worth more than the hand-written prose: `createButton` Omits `variant` and
  // `size` once they are baked, so a caller genuinely cannot pass them.
  // COMPONENTS.md states that policy in prose and cannot enforce it.
  it("omits props the curried variant has already baked in", () => {
    const names = byName("PrimaryButton").props?.map((p) => p.name) ?? [];
    expect(names).not.toContain("variant");
    expect(names).not.toContain("size");
  });

  it("reads a factory's props off the component it returns, not its defaults bag", () => {
    const factory = byName("createButton");
    expect(factory.kind).toBe("factory");
    // Identical to the variant above — same produced component. The defaults
    // parameter (`Partial<Omit<ButtonProps, "children">>`) is NOT what a
    // caller of the produced component passes, so it must not be reported.
    expect(factory.props?.map((p) => p.name).sort()).toEqual([
      "active",
      "loading",
      "tone",
    ]);
  });

  it("carries required-ness and the real declared type", () => {
    const props = byName("Combobox").props ?? [];
    const options = props.find((p) => p.name === "options");
    expect(options).toMatchObject({
      optional: false,
      type: "Accessor<ComboboxOption[]>",
    });
    expect(props.find((p) => p.name === "disabled")).toMatchObject({
      optional: true,
      type: "boolean",
    });
  });

  it("preserves a literal union in full rather than widening it", () => {
    // The prop-scale drift #12295 is about is only detectable if the real
    // scale survives extraction intact.
    const tone = byName("PrimaryButton").props?.find((p) => p.name === "tone");
    expect(tone?.type).toContain('"accent"');
    expect(tone?.type).toContain('"danger"');
  });

  it("strips the `| undefined` that strict mode adds to every optional prop", () => {
    // The `?` already carries it; repeating it in a rendered table is noise.
    const optional = surface.exports
      .flatMap((e) => e.props ?? [])
      .filter((p) => p.optional);
    expect(optional.length).toBeGreaterThan(100);
    expect(optional.filter((p) => /\|\s*undefined/.test(p.type))).toEqual([]);
  });

  it("orders props required-first so a diff of generated output means the API moved", () => {
    for (const e of surface.exports) {
      const optionality = (e.props ?? []).map((p) => p.optional);
      expect(optionality).toEqual([...optionality].sort((a, b) => +a - +b));
    }
  });
});
