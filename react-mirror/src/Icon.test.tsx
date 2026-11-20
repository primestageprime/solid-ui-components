import { describe, expect, it } from "vitest";
import { iconClasses, iconMarkup } from "./Icon.tsx";

describe("iconClasses", () => {
  it("defaults to md", () => {
    expect(iconClasses({ name: "plus" })).toBe("jtf-icon jtf-icon--md");
  });
  it("spins the spinner and turns only when flipped is given", () => {
    expect(iconClasses({ name: "spinner", size: "xs" })).toBe(
      "jtf-icon jtf-icon--xs jtf-icon--spinning",
    );
    expect(iconClasses({ name: "plus", flipped: false })).toBe(
      "jtf-icon jtf-icon--md jtf-icon--turnable",
    );
    expect(iconClasses({ name: "plus", flipped: true, class: "c" })).toBe(
      "jtf-icon jtf-icon--md jtf-icon--turnable jtf-icon--flipped c",
    );
  });
});

describe("iconMarkup", () => {
  it("wraps the variant's paths in SUI's 16×16 svg", () => {
    expect(iconMarkup({ outline: "<o/>", solid: "<s/>" }, undefined)).toBe(
      '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><o/></svg>',
    );
    expect(iconMarkup({ outline: "<o/>", solid: "<s/>" }, "solid")).toContain(
      "<s/>",
    );
  });
});
