// @vitest-environment node
//
// ============================================
// Pre-push pass receipt — when a push skips the push tier
// ============================================
import { describe, expect, it } from "vitest";
import {
  covered,
  passesOf,
  pushedShas,
  recordPass,
} from "./prepush-receipt.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const Z = "0".repeat(40);

describe("pushedShas", () => {
  it("reads the local sha of each pushed ref", () => {
    expect(
      pushedShas(
        `refs/heads/x ${A} refs/heads/x ${Z}\nrefs/heads/y ${B} refs/heads/y ${A}\n`,
      ),
    ).toEqual([A, B]);
  });
  it("leaves out a delete (all-zero local sha) and blank lines", () => {
    expect(pushedShas(`(delete) ${Z} refs/heads/x ${A}\n\n`)).toEqual([]);
  });
});

describe("covered", () => {
  const base = {
    shas: [A],
    head: A,
    parent: B,
    changed: ["src/x.ts"],
    passed: new Set<string>(),
    clean: true,
  };
  it("covers a push of a commit that already passed", () => {
    expect(covered({ ...base, passed: new Set([A]) })).toBe(true);
  });
  it("covers the catalog-only commit on top of a commit that passed", () => {
    expect(
      covered({ ...base, changed: ["catalog.json"], passed: new Set([B]) }),
    ).toBe(true);
  });
  it("does not cover any other change on top of a pass", () => {
    expect(
      covered({
        ...base,
        changed: ["catalog.json", "src/x.ts"],
        passed: new Set([B]),
      }),
    ).toBe(false);
    expect(covered({ ...base, passed: new Set([B]) })).toBe(false);
  });
  it("does not cover a commit that never passed", () =>
    expect(covered(base)).toBe(false));
  it("does not cover a dirty tree, even at a passed commit", () => {
    expect(covered({ ...base, clean: false, passed: new Set([A]) })).toBe(
      false,
    );
  });
  it("does not cover a push of a commit other than the checked-out one", () => {
    expect(covered({ ...base, shas: [B], passed: new Set([A, B]) })).toBe(
      false,
    );
  });
  it("covers a push that sends nothing (every ref already up to date)", () => {
    expect(covered({ ...base, shas: [] })).toBe(true);
    expect(covered({ ...base, shas: [], clean: false })).toBe(false);
  });
  it("does not use a missing parent (a root commit)", () => {
    expect(
      covered({
        ...base,
        parent: null,
        changed: ["catalog.json"],
        passed: new Set([B]),
      }),
    ).toBe(false);
  });
});

describe("recordPass", () => {
  it("adds the sha newest last, once", () => {
    expect(recordPass(`${B}\n${A}\n`, B)).toBe(`${A}\n${B}\n`);
    expect([...passesOf(recordPass("", A))]).toEqual([A]);
  });
  it("keeps at most `cap` lines", () => {
    const text = recordPass(`${A}\n${B}\n`, "c".repeat(40), 2);
    expect(text).toBe(`${B}\n${"c".repeat(40)}\n`);
  });
});
