import { describe, it, expect } from "vitest";
import {
  carriesNaN,
  installNaNDeclarationShim,
} from "./jsdomNaNDeclarationShim";

// The shim is already installed by src/test-setup.ts. These tests assert the
// predicate directly, and assert the installed behaviour through a real
// element, so the whole file stays honest if the setup import is ever dropped.

describe("carriesNaN", () => {
  it("answers true for the declaration Kobalte writes", () => {
    expect(carriesNaN("calc(NaN%)")).toBe(true);
  });

  it("answers false for a value that parses", () => {
    expect(carriesNaN("calc(50%)")).toBe(false);
    expect(carriesNaN("0")).toBe(false);
  });

  it("answers false for anything that is not a string", () => {
    expect(carriesNaN(undefined)).toBe(false);
    expect(carriesNaN(Number.NaN)).toBe(false);
    expect(carriesNaN(null)).toBe(false);
  });
});

describe("installNaNDeclarationShim", () => {
  const el = () => document.createElement("div");

  it("drops calc(NaN%) instead of throwing", () => {
    const node = el();
    expect(() => node.style.setProperty("left", "calc(NaN%)")).not.toThrow();
    expect(node.style.getPropertyValue("left")).toBe("");
  });

  it("still writes every value that parses", () => {
    const node = el();
    node.style.setProperty("left", "calc(50%)");
    expect(node.style.getPropertyValue("left")).toBe("calc(50%)");
  });

  it("keeps the priority argument", () => {
    const node = el();
    node.style.setProperty("color", "red", "important");
    expect(node.style.getPropertyPriority("color")).toBe("important");
  });

  it("hands every other declaration to the original, garbage included", () => {
    // The narrowness IS the design: only a NaN value is swallowed. Everything
    // else reaches jsdom, so a test that writes garbage CSS keeps whatever
    // verdict jsdom gives it. Recording the delegate is the only way to see
    // the difference, because jsdom drops garbage silently either way.
    const original = CSSStyleDeclaration.prototype.setProperty;
    const delegated: Array<readonly [string, string, string | undefined]> = [];
    CSSStyleDeclaration.prototype.setProperty = function record(
      name: string,
      value: string,
      priority?: string,
    ): void {
      delegated.push([name, value, priority] as const);
    };

    const restore = installNaNDeclarationShim();
    const node = el();
    node.style.setProperty("left", "calc(NaN%)");
    node.style.setProperty("left", "10px");
    node.style.setProperty("width", "!!! not css", "important");
    restore();
    CSSStyleDeclaration.prototype.setProperty = original;

    expect(delegated).toEqual([
      ["left", "10px", undefined],
      ["width", "!!! not css", "important"],
    ]);
  });

  it("restores whatever setProperty it replaced", () => {
    const before = CSSStyleDeclaration.prototype.setProperty;
    const restore = installNaNDeclarationShim();
    expect(CSSStyleDeclaration.prototype.setProperty).not.toBe(before);
    restore();
    expect(CSSStyleDeclaration.prototype.setProperty).toBe(before);
  });
});
