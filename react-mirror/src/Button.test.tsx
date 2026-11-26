import { describe, expect, it } from "vitest";
import { buttonClasses } from "./Button.tsx";

describe("buttonClasses", () => {
  it("is the bare base class with nothing set", () => {
    expect(buttonClasses({})).toBe("sui-btn");
  });

  it("adds each modifier in SUI's order, the caller's class last", () => {
    expect(
      buttonClasses({
        variant: "ghost",
        size: "sm",
        tone: "muted",
        loading: true,
        active: true,
        casing: "normal",
        class: "mine",
      }),
    ).toBe(
      "sui-btn sui-btn--ghost sui-btn--sm sui-btn--tone-muted sui-btn--loading sui-btn--active sui-btn--normal-case mine",
    );
  });

  it("adds no casing class for the theme's casing", () => {
    expect(buttonClasses({ casing: "theme" })).toBe("sui-btn");
  });
});
