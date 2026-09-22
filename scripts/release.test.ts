import { describe, it, expect } from "vitest";
import {
  parseVersion,
  bumpMinor,
  unreleasedBody,
  hasUnreleasedContent,
  rollChangelog,
  isoDate,
  isShippablePath,
  depsChanged,
  decideRelease,
} from "./release.mjs";

const changelogWith = (unreleased: string) =>
  `# Changelog\n\n## Unreleased\n${unreleased}\n## 0.178.0 — 2026-09-22\n\n### Added\n\n- The previous release.\n`;

describe("parseVersion / bumpMinor", () => {
  it("bumps the minor and zeroes the patch", () => {
    expect(bumpMinor("0.178.0")).toBe("0.179.0");
    expect(bumpMinor("0.170.1")).toBe("0.171.0");
    expect(bumpMinor("1.9.3")).toBe("1.10.0");
  });

  it("refuses anything that is not three plain integers", () => {
    // A prerelease has no defined minor bump here, and guessing one is how a
    // bad version reaches the registry.
    expect(() => bumpMinor("0.178.0-rc.1")).toThrow(/Unparseable/);
    expect(() => bumpMinor("0.178")).toThrow(/Unparseable/);
    expect(() => bumpMinor("v0.178.0")).toThrow(/Unparseable/);
  });

  it("parses into parts", () => {
    expect(parseVersion(" 0.178.0 ")).toEqual({ major: 0, minor: 178, patch: 0 });
  });
});

describe("unreleasedBody", () => {
  it("is empty when the section has nothing in it", () => {
    expect(unreleasedBody(changelogWith("\n"))).toBe("");
    expect(hasUnreleasedContent(changelogWith("\n"))).toBe(false);
  });

  it("stops at the next version heading", () => {
    const body = unreleasedBody(changelogWith("\n### Added\n\n- A thing.\n\n"));
    expect(body).toBe("### Added\n\n- A thing.");
    expect(body).not.toContain("0.178.0");
  });

  it("reads the bracketed Keep-a-Changelog spelling too", () => {
    // The detector is tolerant of both; the emitter only ever writes the bare
    // form this file actually uses.
    const bracketed = "# Changelog\n\n## [Unreleased]\n\n- A thing.\n\n## 0.178.0 — 2026-09-22\n";
    expect(hasUnreleasedContent(bracketed)).toBe(true);
    expect(unreleasedBody(bracketed)).toBe("- A thing.");
  });

  it("is empty when there is no Unreleased heading at all", () => {
    expect(unreleasedBody("# Changelog\n\n## 0.178.0 — 2026-09-22\n")).toBe("");
  });
});

describe("rollChangelog", () => {
  const source = changelogWith("\n### Added\n\n- A new component.\n\n");
  const rolled = rollChangelog(source, { version: "0.179.0", date: "2026-09-23" });

  it("writes the repo's own heading shape: bare version, em dash, ISO date", () => {
    expect(rolled).toContain("## 0.179.0 — 2026-09-23");
    expect(rolled).not.toContain("## [0.179.0]");
  });

  it("leaves Unreleased in place and empty", () => {
    expect(rolled).toContain("## Unreleased\n\n## 0.179.0");
    expect(hasUnreleasedContent(rolled)).toBe(false);
  });

  it("moves the body under the new heading and keeps the previous release", () => {
    expect(unreleasedBody(rolled)).toBe("");
    const newSection = rolled.slice(rolled.indexOf("## 0.179.0"), rolled.indexOf("## 0.178.0"));
    expect(newSection).toContain("- A new component.");
    expect(rolled).toContain("## 0.178.0 — 2026-09-22");
    expect(rolled).toContain("- The previous release.");
  });

  it("keeps the file's own preamble", () => {
    expect(rolled.startsWith("# Changelog\n")).toBe(true);
  });

  it("is idempotent in the sense that rolling twice is refused", () => {
    // This is the self-retrigger guard expressed as a function: once rolled,
    // there is nothing left to roll.
    expect(() => rollChangelog(rolled, { version: "0.180.0", date: "2026-09-24" })).toThrow(/empty/);
  });

  it("refuses a changelog with no Unreleased heading", () => {
    expect(() => rollChangelog("# Changelog\n\n## 0.178.0 — 2026-09-22\n", { version: "0.179.0", date: "2026-09-23" })).toThrow(
      /no `## Unreleased` heading/,
    );
  });
});

describe("isoDate", () => {
  it("is UTC, YYYY-MM-DD", () => {
    expect(isoDate(new Date("2026-09-23T23:59:00Z"))).toBe("2026-09-23");
    expect(/^\d{4}-\d{2}-\d{2}$/.test(isoDate())).toBe(true);
  });
});

describe("isShippablePath", () => {
  it("counts src and the manifest", () => {
    expect(isShippablePath("src/components/Foo/Foo.tsx")).toBe(true);
    expect(isShippablePath("package.json")).toBe(true);
  });

  it("does not count docs, dev, scripts or workflows", () => {
    expect(isShippablePath("README.md")).toBe(false);
    expect(isShippablePath("dev/gallery/App.tsx")).toBe(false);
    expect(isShippablePath("scripts/health.mjs")).toBe(false);
    expect(isShippablePath(".github/workflows/ci.yml")).toBe(false);
    expect(isShippablePath("docs/adr/0008-deliberately-unfixed.md")).toBe(false);
  });
});

describe("depsChanged", () => {
  const base = {
    dependencies: { katex: "^0.17.0" },
    peerDependencies: { "solid-js": "^1.9.0" },
    devDependencies: { vitest: "^4.1.9" },
  };

  it("sees a runtime dependency move", () => {
    expect(depsChanged(base, { ...base, dependencies: { katex: "^0.18.0" } })).toBe(true);
  });

  it("sees a peer range move", () => {
    expect(depsChanged(base, { ...base, peerDependencies: { "solid-js": "^1.10.0" } })).toBe(true);
  });

  it("ignores devDependencies — they never leave this repo", () => {
    expect(depsChanged(base, { ...base, devDependencies: { vitest: "^5.0.0" } })).toBe(false);
  });

  it("ignores everything else in the manifest", () => {
    expect(depsChanged(base, { ...base, description: "changed" })).toBe(false);
    expect(depsChanged(base, base)).toBe(false);
  });

  it("treats a missing block as empty rather than throwing", () => {
    expect(depsChanged({}, {})).toBe(false);
    expect(depsChanged({}, { dependencies: { katex: "^0.17.0" } })).toBe(true);
  });
});

describe("decideRelease", () => {
  const withContent = changelogWith("\n### Added\n\n- A thing.\n\n");
  const empty = changelogWith("\n");
  const pkg = { dependencies: { katex: "^0.17.0" } };

  it("releases on a src change with Unreleased content", () => {
    const d = decideRelease({
      changedFiles: ["src/components/Foo/Foo.tsx", "README.md"],
      changelog: withContent,
      basePkg: pkg,
      headPkg: pkg,
    });
    expect(d.release).toBe(true);
    expect(d.reason).toMatch(/src\//);
  });

  it("does NOT release on a docs-only merge", () => {
    const d = decideRelease({ changedFiles: ["README.md", "docs/adr/0009.md"], changelog: withContent, basePkg: pkg, headPkg: pkg });
    expect(d.release).toBe(false);
    expect(d.reason).toMatch(/identical/);
  });

  it("does NOT release on a dev-only or scripts-only merge", () => {
    const d = decideRelease({
      changedFiles: ["dev/workshop/bench.tsx", "scripts/health.mjs", ".github/workflows/ci.yml"],
      changelog: withContent,
      basePkg: pkg,
      headPkg: pkg,
    });
    expect(d.release).toBe(false);
  });

  it("does NOT release when Unreleased is empty, however much src moved", () => {
    // This is the guard that stops the release commit re-triggering itself:
    // cutting a release empties Unreleased.
    const d = decideRelease({ changedFiles: ["src/index.ts"], changelog: empty, basePkg: pkg, headPkg: pkg });
    expect(d.release).toBe(false);
    expect(d.reason).toMatch(/Unreleased/);
  });

  it("releases when only a dependency block moved", () => {
    const d = decideRelease({
      changedFiles: ["package.json", "package-lock.json"],
      changelog: withContent,
      basePkg: pkg,
      headPkg: { dependencies: { katex: "^0.18.0" } },
    });
    expect(d.release).toBe(true);
    expect(d.reason).toMatch(/dependency block/);
  });

  it("does NOT release when package.json moved but no dependency did", () => {
    const d = decideRelease({
      changedFiles: ["package.json"],
      changelog: withContent,
      basePkg: pkg,
      headPkg: { ...pkg, scripts: { added: "one" } },
    });
    expect(d.release).toBe(false);
  });

  it("does NOT release on an empty change set — the base==head case", () => {
    const d = decideRelease({ changedFiles: [], changelog: withContent, basePkg: pkg, headPkg: pkg });
    expect(d.release).toBe(false);
  });
});
