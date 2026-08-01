import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error — plain .mjs module without type declarations
import { extractFromSource, buildManifest, manifestToJson } from "./usage-manifest.mjs";

const SPECIFIERS = ["@primestageprime/solid-ui-components", "solid-ui-components"];
const FIXTURE_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "usage-consumer",
);

type Hit = { name: string; line: number; kind: string };
type Extraction = { hits: Hit[]; specifiers: string[] };

const extract = (src: string, opts?: { isCss?: boolean }): Extraction =>
  extractFromSource(src, SPECIFIERS, opts);

describe("extractFromSource", () => {
  it("extracts named imports, recording the SUI-side name for renames", () => {
    const { hits, specifiers } = extract(
      'import { Button, Section as Panel } from "@primestageprime/solid-ui-components";\n',
    );
    expect(hits).toEqual([
      { name: "Button", line: 1, kind: "named" },
      { name: "Section", line: 1, kind: "named" },
    ]);
    expect(specifiers).toEqual(["@primestageprime/solid-ui-components"]);
  });

  it("extracts type imports, both statement-level and inline", () => {
    const { hits } = extract(
      'import type { ButtonProps } from "solid-ui-components";\n' +
        'import { type TableColumn, BaseTable } from "solid-ui-components";\n',
    );
    expect(hits).toEqual([
      { name: "ButtonProps", line: 1, kind: "type" },
      { name: "BaseTable", line: 2, kind: "named" },
      { name: "TableColumn", line: 2, kind: "type" },
    ]);
  });

  it("matches the bare alias specifier", () => {
    const { hits, specifiers } = extract('import { Toast } from "solid-ui-components";\n');
    expect(hits).toEqual([{ name: "Toast", line: 1, kind: "named" }]);
    expect(specifiers).toEqual(["solid-ui-components"]);
  });

  it("does not match lookalike package names", () => {
    const { hits } = extract(
      'import { X } from "not-solid-ui-components";\nimport { Y } from "solid-ui-components-extra";\n',
    );
    expect(hits).toEqual([]);
  });

  it("records subpath CSS imports as kind css with the subpath as name", () => {
    const { hits } = extract('import "solid-ui-components/themes/hud.css";\n');
    expect(hits).toEqual([{ name: "themes/hud.css", line: 1, kind: "css" }]);
  });

  it("records @import in CSS files", () => {
    const { hits } = extract('@import "solid-ui-components/themes/bronze.css";\n', {
      isCss: true,
    });
    expect(hits).toEqual([{ name: "themes/bronze.css", line: 1, kind: "css" }]);
  });

  it("flags imported createX factories that are called (kind factory-call), tracking renames", () => {
    const src =
      'import { createButton as makeButton } from "solid-ui-components";\n' +
      "\n" +
      'const A = makeButton({ size: "sm" });\n' +
      'const B = makeButton({ size: "lg" });\n';
    const { hits } = extract(src);
    expect(hits).toEqual([
      { name: "createButton", line: 1, kind: "named" },
      { name: "createButton", line: 3, kind: "factory-call" },
      { name: "createButton", line: 4, kind: "factory-call" },
    ]);
  });

  it("does not flag an imported factory that is never called", () => {
    const { hits } = extract('import { createButton } from "solid-ui-components";\n');
    expect(hits.map((h) => h.kind)).toEqual(["named"]);
  });

  it("extracts re-exports (named, renamed, and star)", () => {
    const { hits } = extract(
      'export { Toast, Toggle as Switch } from "@primestageprime/solid-ui-components";\n' +
        'export * from "solid-ui-components";\n',
    );
    expect(hits).toEqual([
      { name: "Toast", line: 1, kind: "reexport" },
      { name: "Toggle", line: 1, kind: "reexport" },
      { name: "*", line: 2, kind: "reexport" },
    ]);
  });

  it("extracts dynamic import() and require() forms", () => {
    const { hits } = extract(
      'const m = await import("solid-ui-components");\n' +
        'const d = require("@primestageprime/solid-ui-components/dist/index.js");\n',
    );
    expect(hits).toEqual([
      { name: "*", line: 1, kind: "dynamic" },
      { name: "dist/index.js", line: 2, kind: "dynamic" },
    ]);
  });

  it("quick-rejects files that never mention the package", () => {
    const { hits, specifiers } = extract('import { x } from "somewhere-else";\n');
    expect(hits).toEqual([]);
    expect(specifiers).toEqual([]);
  });
});

describe("buildManifest over the fixture consumer", () => {
  const cachePath = path.join(mkdtempSync(path.join(tmpdir(), "um-test-")), "cache.json");
  const config = { specifiers: SPECIFIERS, repos: { fixture: FIXTURE_ROOT } };
  let first: { manifest: Record<string, any>; stats: Record<string, any> };

  beforeAll(async () => {
    first = await buildManifest(config, { cachePath });
  });

  it("reports the fixture repo as ok and records every consumption form", () => {
    const repo = first.manifest.repos.fixture;
    expect(repo.status).toBe("ok");
    const kindsFor = (name: string) =>
      (repo.uses[name] ?? []).map((u: Hit & { file: string }) => u.kind);
    expect(kindsFor("Button")).toContain("named");
    expect(kindsFor("Section")).toContain("named"); // renamed import, SUI-side name
    expect(kindsFor("ButtonProps")).toContain("type");
    expect(kindsFor("createButton")).toEqual(
      expect.arrayContaining(["named", "factory-call"]),
    );
    expect(kindsFor("Toast")).toContain("reexport");
    expect(kindsFor("*")).toEqual(expect.arrayContaining(["reexport", "dynamic"]));
    expect(kindsFor("themes/hud.css")).toContain("css"); // JS subpath import
    expect(kindsFor("themes/bronze.css")).toContain("css"); // css @import
    expect(kindsFor("dist/index.js")).toContain("dynamic"); // require of /dist/ path
  });

  it("records observed specifiers including subpaths", () => {
    expect(first.manifest.repos.fixture.specifiers).toEqual(
      expect.arrayContaining([
        "@primestageprime/solid-ui-components",
        "solid-ui-components",
        "solid-ui-components/themes/hud.css",
        "solid-ui-components/themes/bronze.css",
        "@primestageprime/solid-ui-components/dist/index.js",
      ]),
    );
  });

  it("builds a summary keyed by export name", () => {
    expect(first.manifest.summary.Button).toEqual(["fixture"]);
    expect(first.manifest.summary.createButton).toEqual(["fixture"]);
  });

  it("is deterministic and incremental: warm rerun is byte-identical and reads 0 files", async () => {
    const second = await buildManifest(config, { cachePath });
    expect(manifestToJson(second.manifest)).toBe(manifestToJson(first.manifest));
    expect(second.stats.repos.fixture.read).toBe(0);
    expect(second.stats.repos.fixture.cached).toBeGreaterThan(0);
  });

  it("marks a nonexistent repo as missing without crashing", async () => {
    const { manifest } = await buildManifest(
      { specifiers: SPECIFIERS, repos: { ghost: "/nonexistent/path/xyz" } },
      { cachePath: `${cachePath}.ghost` },
    );
    expect(manifest.repos.ghost.status).toBe("missing");
    expect(manifest.repos.ghost.uses).toEqual({});
  });
});
