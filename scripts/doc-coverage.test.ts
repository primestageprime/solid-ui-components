import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  run,
  undocumented,
  mentionedNames,
  // @ts-expect-error — plain .mjs module without type declarations
} from "./doc-coverage.mjs";

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

type Export = { name: string; kind: string; file: string; line: number };

// The rule itself is pure, so most of this file needs no Program at all. Only
// the last block pays the ~1.7s to check the rule against the real manifest.
const exp = (name: string, kind = "component", file = "src/x.ts"): Export => ({
  name,
  kind,
  file,
  line: 1,
});

describe("doc coverage — the rule", () => {
  it("reports an export the manifest never names", () => {
    expect(undocumented([exp("ClipFillColumnFlush")], "# Manifest\n")).toEqual([
      "ClipFillColumnFlush (src/x.ts:1)",
    ]);
  });

  it("accepts a name that appears anywhere, prose or code fence", () => {
    const doc =
      "## Layout\n- **ScrollBox** — a box.\n\n```tsx\n<PaddedStack />\n```\n";
    expect(undocumented([exp("ScrollBox"), exp("PaddedStack")], doc)).toEqual(
      [],
    );
  });

  // THE REGRESSION PIN. `undocumentedComponents` asked whether the component
  // DIRECTORY name appeared in the file, so every one of Chart/'s 40 exports
  // passed on the single word "Chart". That is the defect this metric exists to
  // remove — if this ever passes again, the metric has reverted to vacuous.
  it("does not count an export as documented because its directory is mentioned", () => {
    const doc = "## Chart\nA chart family. See `Chart` for the container.\n";
    expect(
      undocumented(
        [exp("WarningGhostPin", "component", "src/components/Chart/v.ts")],
        doc,
      ),
    ).toEqual(["WarningGhostPin (src/components/Chart/v.ts:1)"]);
  });

  it("asks only about components and factories", () => {
    const kinds = [
      "component",
      "factory",
      "type",
      "const",
      "function",
      "namespace",
    ];
    const missing = undocumented(
      kinds.map((k) => exp(`Undocumented_${k}`, k)),
      "# nothing here\n",
    );
    expect(missing.map((m: string) => m.split(" ")[0])).toEqual([
      "Undocumented_component",
      "Undocumented_factory",
    ]);
  });

  it("sorts, so a diff of the backlog means the backlog moved", () => {
    const missing = undocumented(
      [exp("Zebra"), exp("Apple"), exp("Mango")],
      "# empty\n",
    );
    expect(missing).toEqual([...missing].sort());
  });

  it("extracts identifiers from markdown without splitting on underscores", () => {
    const names = mentionedNames(
      "`ICON_PATHS`, **createButton**, and Foo.bar()",
    );
    expect(names.has("ICON_PATHS")).toBe(true);
    expect(names.has("createButton")).toBe(true);
    expect(names.has("Foo")).toBe(true);
    expect(names.has("bar")).toBe(true);
  });

  it("does not match a name that is only a substring of a longer identifier", () => {
    // `Stack` is a real export and `SmallTightStack` is a different one; the
    // token split is what keeps the second from riding on the first.
    expect(undocumented([exp("Stack")], "See `SmallTightStack`.\n")).toEqual([
      "Stack (src/x.ts:1)",
    ]);
  });
});

describe("doc coverage — against the real manifest", () => {
  let result: { total: number; missing: string[] };
  let doc: string;

  beforeAll(() => {
    result = run() as { total: number; missing: string[] };
    doc = readFileSync(path.join(REPO_ROOT, "COMPONENTS.md"), "utf8");
  }, 60_000);

  it("measures the whole exported component and factory surface", () => {
    // Not pinned to an exact number — that is the baseline's job, and pinning
    // it here would fail every PR that adds a variant.
    expect(result.total).toBeGreaterThan(500);
    expect(result.missing.length).toBeLessThan(result.total);
  });

  // Holds at any backlog size, including 0 — so burning the backlog down does
  // not require touching this test.
  it("reports only names that genuinely do not appear in COMPONENTS.md", () => {
    const stillPresent = result.missing.filter((m) =>
      new RegExp(`\\b${m.split(" ")[0]}\\b`).test(doc),
    );
    expect(stillPresent).toEqual([]);
  });

  it("does not report a name the manifest documents", () => {
    const names = result.missing.map((m) => m.split(" ")[0]);
    expect(names).not.toContain("PrimaryButton");
    expect(names).not.toContain("Combobox");
    expect(names).not.toContain("createButton");
  });
});
