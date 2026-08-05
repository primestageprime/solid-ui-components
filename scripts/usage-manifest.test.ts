import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractFromSource,
  buildManifest,
  manifestToJson,
  dependsOnSui,
  repoNameFor,
  discoverRepos,
  mergeRepos,
  unseenRepos,
  summarize,
  // @ts-expect-error — plain .mjs module without type declarations
} from "./usage-manifest.mjs";

const SPECIFIERS = [
  "@primestageprime/solid-ui-components",
  "solid-ui-components",
];
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
    const { hits, specifiers } = extract(
      'import { Toast } from "solid-ui-components";\n',
    );
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
    const { hits } = extract(
      '@import "solid-ui-components/themes/bronze.css";\n',
      {
        isCss: true,
      },
    );
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
    const { hits } = extract(
      'import { createButton } from "solid-ui-components";\n',
    );
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
    const { hits, specifiers } = extract(
      'import { x } from "somewhere-else";\n',
    );
    expect(hits).toEqual([]);
    expect(specifiers).toEqual([]);
  });
});

describe("buildManifest over the fixture consumer", () => {
  const cachePath = path.join(
    mkdtempSync(path.join(tmpdir(), "um-test-")),
    "cache.json",
  );
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
    expect(kindsFor("*")).toEqual(
      expect.arrayContaining(["reexport", "dynamic"]),
    );
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
    expect(manifestToJson(second.manifest)).toBe(
      manifestToJson(first.manifest),
    );
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

// ============================================
// Discovery, merge, and the two defects they replace.
//
// Until 2026-08-04 the consumer list was a committed map of name -> ABSOLUTE
// PATH, every one of them under one developer's home directory. On any other
// machine each path resolved `missing`, the all-missing branch fired, and the
// pre-push gate returned having compared nothing — printing a line that read
// like a routine skip. It was inert on the second machine for its whole life.
//
// A local path override alone would NOT have fixed it: the emitted manifest
// recorded each repo's absolute `root`, so `--check`'s comparison against the
// committed file could never pass anywhere but the machine that wrote it. Both
// halves are pinned below.
// ============================================
describe("dependsOnSui", () => {
  const dep = (pkg: object) => dependsOnSui(JSON.stringify(pkg), SPECIFIERS);

  it("accepts a plain dependency on either specifier", () => {
    expect(dep({ dependencies: { "solid-ui-components": "0.1.0" } })).toBe(
      true,
    );
    expect(
      dep({
        dependencies: { "@primestageprime/solid-ui-components": "0.1.0" },
      }),
    ).toBe(true);
  });

  it("accepts an aliased install, where the specifier is in the VALUE", () => {
    // amygdala-ui, the largest consumer, declares exactly this form. Keying
    // only on the dependency name would have missed it entirely.
    expect(
      dep({
        dependencies: {
          "solid-ui-components":
            "npm:@primestageprime/solid-ui-components@0.135.0",
        },
      }),
    ).toBe(true);
  });

  it("accepts file:, link: and github: forms", () => {
    // Three real consumers use these, and the two `github:` ones track main
    // with no version gate — which makes them the most important to survey,
    // not the least.
    for (const v of [
      "file:../../../solid-ui-components",
      "link:../solid-ui-components",
      "github:primestageprime/solid-ui-components",
    ])
      expect(dep({ dependencies: { "solid-ui-components": v } })).toBe(true);
  });

  it("finds it in dev, peer and optional deps too", () => {
    expect(dep({ devDependencies: { "solid-ui-components": "*" } })).toBe(true);
    expect(dep({ peerDependencies: { "solid-ui-components": "*" } })).toBe(
      true,
    );
    expect(dep({ optionalDependencies: { "solid-ui-components": "*" } })).toBe(
      true,
    );
  });

  it("does NOT match a mere mention outside the dependency maps", () => {
    // The old scan quick-rejected on a raw substring of the whole file, which
    // would claim SUI's own checkout (it names itself in `name`) and any repo
    // whose description or scripts mention the package.
    expect(dep({ name: "solid-ui-components", version: "1.0.0" })).toBe(false);
    expect(dep({ description: "a theme for solid-ui-components" })).toBe(false);
    expect(
      dep({ scripts: { build: "cp -r ../solid-ui-components/dist ." } }),
    ).toBe(false);
  });

  it("does not match a lookalike package name", () => {
    expect(dep({ dependencies: { "solid-ui-components-extra": "1" } })).toBe(
      false,
    );
  });

  it("treats unparseable package.json as not a consumer", () => {
    expect(dependsOnSui("{ not json", SPECIFIERS)).toBe(false);
  });
});

describe("repoNameFor", () => {
  it("prefers the package name over the directory", () => {
    expect(repoNameFor('{"name":"migration-dashboard"}', "/w/x/ui")).toBe(
      "migration-dashboard",
    );
  });

  it("falls back to the directory basename when there is no name", () => {
    expect(repoNameFor("{}", "/w/x/thorcasting-ui")).toBe("thorcasting-ui");
    expect(repoNameFor("nonsense", "/w/x/thorcasting-ui")).toBe(
      "thorcasting-ui",
    );
  });

  // Why the package name is the primary key and not the directory: three real
  // consumers live in a directory called `ui` or `frontend`.
  it("distinguishes consumers whose directories share a basename", () => {
    const a = repoNameFor('{"name":"migration-dashboard"}', "/w/netsuite/ui");
    const b = repoNameFor('{"name":"taskmaster-v2-ui"}', "/w/taskmaster/ui");
    expect(a).not.toBe(b);
  });
});

describe("discoverRepos over a temp workspace", () => {
  let root: string;

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "sui-discover-"));
    const write = (rel: string, pkg: object) => {
      const dir = path.join(root, rel);
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg));
    };
    // The two layouts actually in use, side by side: depth 2 and depth 3.
    write("dside/dside-ui", {
      name: "dside-ui",
      dependencies: { "solid-ui-components": "^1" },
    });
    write("rhinotools/netsuite/ui", {
      name: "migration-dashboard",
      dependencies: { "solid-ui-components": "github:x/y" },
    });
    write("unrelated/thing", { name: "thing", dependencies: { lodash: "^4" } });
    // A sub-package INSIDE a consumer — part of that repo, not a consumer.
    write("dside/dside-ui/packages/inner", {
      name: "inner",
      dependencies: { "solid-ui-components": "^1" },
    });
    // Deeper than the depth limit.
    write("a/b/c/d/deep-ui", {
      name: "deep-ui",
      dependencies: { "solid-ui-components": "^1" },
    });
  });

  it("finds consumers at both real nesting depths", async () => {
    const found = await discoverRepos(root, { specifiers: SPECIFIERS });
    expect(Object.keys(found).sort()).toEqual([
      "dside-ui",
      "migration-dashboard",
    ]);
  });

  it("keys them by package name, and points at the right directory", async () => {
    const found = await discoverRepos(root, { specifiers: SPECIFIERS });
    expect(found["migration-dashboard"]).toBe(
      path.join(root, "rhinotools/netsuite/ui"),
    );
  });

  it("does not descend into a repo it has already claimed", async () => {
    // `inner` is a workspace package of dside-ui, not a separate consumer.
    const found = await discoverRepos(root, { specifiers: SPECIFIERS });
    expect(found).not.toHaveProperty("inner");
  });

  it("ignores a repo with no SUI dependency", async () => {
    const found = await discoverRepos(root, { specifiers: SPECIFIERS });
    expect(found).not.toHaveProperty("thing");
  });

  it("stops at the depth limit rather than walking the disk", async () => {
    const found = await discoverRepos(root, { specifiers: SPECIFIERS });
    expect(found).not.toHaveProperty("deep-ui");
    // ...and finds it when told to look further.
    const deeper = await discoverRepos(root, {
      specifiers: SPECIFIERS,
      maxDepth: 5,
    });
    expect(deeper).toHaveProperty("deep-ui");
  });

  it("skips the directory it is told to skip (SUI's own checkout)", async () => {
    const found = await discoverRepos(root, {
      specifiers: SPECIFIERS,
      skipDir: path.join(root, "dside"),
    });
    expect(found).not.toHaveProperty("dside-ui");
  });

  it("returns nothing for a root that does not exist, without throwing", async () => {
    await expect(
      discoverRepos(path.join(root, "nope"), { specifiers: SPECIFIERS }),
    ).resolves.toEqual({});
  });
});

describe("mergeRepos — one machine must not delete another's repos", () => {
  const committed = {
    "goose-ui": { status: "ok", uses: { Button: [] }, root: "/Users/peter/g" },
    "dside-ui": { status: "ok", uses: { Card: [] }, root: "/Users/peter/d" },
  };
  const fresh = {
    "dside-ui": { status: "ok", uses: { Card: [], Table: [] } },
    "taskmaster-v2-ui": { status: "ok", uses: { Modal: [] } },
  };

  it("carries forward a repo this machine cannot see", () => {
    // Without this the two developers take turns emptying the manifest and
    // --check fails forever in both directions.
    expect(mergeRepos(committed, fresh)).toHaveProperty("goose-ui");
  });

  it("lets the freshly scanned entry win where both have one", () => {
    const out = mergeRepos(committed, fresh) as any;
    expect(Object.keys(out["dside-ui"].uses).sort()).toEqual(["Card", "Table"]);
  });

  it("adds a repo only this machine can see", () => {
    expect(mergeRepos(committed, fresh)).toHaveProperty("taskmaster-v2-ui");
  });

  it("strips the stale absolute root from a carried entry", () => {
    // The machine that could refresh goose-ui is by definition not this one,
    // so a verbatim carry would keep another developer's home directory in the
    // committed file indefinitely.
    expect(mergeRepos(committed, fresh)["goose-ui"]).not.toHaveProperty("root");
  });

  it("emits keys in sorted order, so the file is stable across machines", () => {
    const keys = Object.keys(mergeRepos(committed, fresh));
    expect(keys).toEqual([...keys].sort());
  });

  it("--prune drops what this machine cannot see", () => {
    const out = mergeRepos(committed, fresh, { prune: true });
    expect(Object.keys(out).sort()).toEqual(["dside-ui", "taskmaster-v2-ui"]);
  });

  it("survives a missing committed manifest", () => {
    expect(mergeRepos(undefined, fresh)).toEqual(fresh);
  });
});

describe("unseenRepos", () => {
  it("names what was carried, so the run can say so out loud", () => {
    expect(unseenRepos({ a: {}, b: {}, c: {} }, { b: {} })).toEqual(["a", "c"]);
  });
});

describe("summarize", () => {
  it("is derived from the merged repos, not accumulated while scanning", () => {
    // It has to be recomputed after the merge, or a carried-forward repo's
    // exports would silently vanish from the summary.
    expect(
      summarize({
        "b-ui": { uses: { Button: [], Card: [] } },
        "a-ui": { uses: { Button: [] } },
      }),
    ).toEqual({ Button: ["a-ui", "b-ui"], Card: ["b-ui"] });
  });

  it("tolerates a repo entry with no uses", () => {
    expect(summarize({ "a-ui": { status: "no-sui-dep" } })).toEqual({});
  });
});
