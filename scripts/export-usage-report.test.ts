import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectExportSurface,
  stripComments,
  // @ts-expect-error — plain .mjs module without type declarations
} from "./export-usage-report.mjs";

const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

type Surface = {
  valueExports: Set<string>;
  typeExports: Set<string>;
  allExports: Set<string>;
};

/** Write a throwaway module tree and resolve the surface of its entry file. */
const surfaceOf = (
  files: Record<string, string>,
  entry = "index.ts",
): Surface => {
  const dir = mkdtempSync(path.join(tmpdir(), "sui-export-surface-"));
  for (const [rel, contents] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, contents);
  }
  return collectExportSurface(path.join(dir, entry));
};

describe("collectExportSurface — namespace re-exports", () => {
  // The defect this file was added for. `export * as fields from "./x"` was
  // matched by no pattern at all, so `fields` was absent from the surface and
  // a consumer importing it was reported as a BROKEN import.
  it("adds the alias of `export * as ns from`", () => {
    const { allExports, valueExports } = surfaceOf({
      "index.ts": 'export * as fields from "./fields";\n',
      "fields/index.ts": "export const FieldTable = 1;\n",
    });
    expect(allExports.has("fields")).toBe(true);
    expect(valueExports.has("fields")).toBe(true);
  });

  it("does NOT hoist the namespace's members to top level", () => {
    // `fields.FieldTable` is the only way to reach it; a bare
    // `import { FieldTable }` genuinely would not resolve, so treating the
    // members as top-level exports would trade a false broken-import for a
    // false clean one.
    const { allExports } = surfaceOf({
      "index.ts": 'export * as fields from "./fields";\n',
      "fields/index.ts": "export const FieldTable = 1;\n",
    });
    expect(allExports.has("FieldTable")).toBe(false);
  });

  it("still recurses through a bare `export *`", () => {
    const { allExports } = surfaceOf({
      "index.ts": 'export * from "./button";\n',
      "button.ts": "export const PrimaryButton = 1;\n",
    });
    expect(allExports.has("PrimaryButton")).toBe(true);
  });

  it("handles both forms in one file without either shadowing the other", () => {
    const { allExports } = surfaceOf({
      "index.ts":
        'export * from "./button";\nexport * as fields from "./fields";\n',
      "button.ts": "export const PrimaryButton = 1;\n",
      "fields/index.ts": "export const FieldTable = 1;\n",
    });
    expect(allExports.has("PrimaryButton")).toBe(true);
    expect(allExports.has("fields")).toBe(true);
    expect(allExports.has("FieldTable")).toBe(false);
  });
});

describe("collectExportSurface — named and declared exports", () => {
  it("records the public alias of a rename, not the local name", () => {
    const { allExports } = surfaceOf({
      "index.ts": 'export { Section as Panel } from "./section";\n',
      "section.ts": "export const Section = 1;\n",
    });
    expect(allExports.has("Panel")).toBe(true);
    expect(allExports.has("Section")).toBe(false);
  });

  it("splits type exports from value exports", () => {
    const { valueExports, typeExports } = surfaceOf({
      "index.ts": [
        "export const Button = 1;",
        "export type ButtonProps = { a: string };",
        "export interface Themed { b: number }",
        "export enum Tone { Warm }",
        "",
      ].join("\n"),
    });
    expect([...valueExports].sort()).toEqual(["Button", "Tone"]);
    expect([...typeExports].sort()).toEqual(["ButtonProps", "Themed"]);
  });

  it("ignores commented-out re-exports", () => {
    const { allExports } = surfaceOf({
      "index.ts": [
        '// export * as ghost from "./ghost";',
        "/* export const Blocked = 1; */",
        "export const Real = 1;",
        "",
      ].join("\n"),
    });
    expect(allExports.has("ghost")).toBe(false);
    expect(allExports.has("Blocked")).toBe(false);
    expect(allExports.has("Real")).toBe(true);
  });

  it("terminates on a re-export cycle", () => {
    const { allExports } = surfaceOf({
      "index.ts": 'export * from "./a";\n',
      "a.ts": 'export * from "./b";\nexport const FromA = 1;\n',
      "b.ts": 'export * from "./a";\nexport const FromB = 1;\n',
    });
    expect(allExports.has("FromA")).toBe(true);
    expect(allExports.has("FromB")).toBe(true);
  });
});

describe("stripComments", () => {
  it("leaves a protocol-relative URL alone", () => {
    expect(stripComments('const u = "https://example.com";')).toContain(
      "https://example.com",
    );
  });
});

describe("the real surface", () => {
  let surface: Surface;
  beforeAll(() => {
    surface = collectExportSurface(path.join(REPO_ROOT, "src", "index.ts"));
  });

  it("includes `fields`, the namespace export from src/index.ts", () => {
    expect(surface.allExports.has("fields")).toBe(true);
  });

  it("resolves a name that only exists behind two barrel hops", () => {
    // index.ts -> components/Auth/index.ts -> ManagedListSection. Grepping
    // index.ts alone reports this absent; that unsound method is what the
    // correction on dside sui#12300 was about.
    expect(surface.allExports.has("ManagedListSection")).toBe(true);
  });
});
