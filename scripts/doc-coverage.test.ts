import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  run,
  undocumented,
  mentionedNames,
  brokenImports,
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

describe("doc coverage — broken import examples", () => {
  const surface = [exp("PrimaryButton"), exp("LooseWrapRow")];

  it("flags an import specifier the library does not export", () => {
    const doc = '```tsx\nimport { Row } from "solid-ui-components";\n```\n';
    expect(brokenImports(surface, doc)).toEqual(["Row (COMPONENTS.md:2)"]);
  });

  it("accepts an example that imports only real exports", () => {
    const doc =
      '```tsx\nimport { PrimaryButton, LooseWrapRow } from "solid-ui-components";\n```\n';
    expect(brokenImports(surface, doc)).toEqual([]);
  });

  // Explaining that a base component exists and is deliberately unexported is
  // the manifest's job. Only the import statement is a claim about the API.
  it("does not flag a base component merely NAMED in prose", () => {
    const doc =
      "The base `Row` is deliberately not exported — use a variant.\n";
    expect(brokenImports(surface, doc)).toEqual([]);
  });

  it("handles type specifiers, renames, and subpath imports", () => {
    const doc =
      'import { type Ghost, PrimaryButton as Btn } from "solid-ui-components/Duration";\n';
    expect(brokenImports(surface, doc)).toEqual(["Ghost (COMPONENTS.md:1)"]);
  });

  it("reports every bad specifier in one statement, not just the first", () => {
    const doc =
      'import { Row, Stack, PrimaryButton } from "solid-ui-components";\n';
    expect(
      brokenImports(surface, doc).map((b: string) => b.split(" ")[0]),
    ).toEqual(["Row", "Stack"]);
  });
});

describe("doc coverage — against the real manifest", () => {
  let result: { total: number; missing: string[]; broken: string[] };
  let doc: string;

  beforeAll(() => {
    result = run() as { total: number; missing: string[]; broken: string[] };
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

  // Ratcheted at 0, so unlike the backlog this one is safe to pin outright.
  it("has no import example naming a non-export", () => {
    expect(result.broken).toEqual([]);
  });

  // The founding cases. Both were exported from src/components/DateAxis/
  // index.ts but missing from src/index.ts's explicit re-export list, so they
  // shipped in the tarball while no consumer could import them.
  it("reaches the DateAxis names the root barrel used to strand", () => {
    const names = result.missing.map((m) => m.split(" ")[0]);
    expect(names).not.toContain("DailyDateAxis");
  });

  it("does not report a name the manifest documents", () => {
    const names = result.missing.map((m) => m.split(" ")[0]);
    expect(names).not.toContain("PrimaryButton");
    expect(names).not.toContain("Combobox");
    expect(names).not.toContain("createButton");
  });
});
