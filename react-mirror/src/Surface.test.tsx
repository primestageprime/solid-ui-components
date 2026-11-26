import { describe, expect, it } from "vitest";
import { surfaceClasses, surfaceStyle } from "./Surface.tsx";

describe("surfaceClasses", () => {
  it("defaults padding md and radius sm", () => {
    expect(surfaceClasses({})).toBe(
      "surface surface--padding-md surface--radius-sm",
    );
  });
  it("adds every modifier in SUI's order", () => {
    expect(
      surfaceClasses({
        padding: "none",
        radius: "md",
        direction: "row",
        align: "center",
        gap: "sm",
        interactive: true,
        active: true,
        shadow: true,
        class: "c",
      }),
    ).toBe(
      "surface surface--padding-none surface--radius-md surface--dir-row surface--align-center surface--gap-sm surface--interactive surface--active surface--shadow c",
    );
  });
});

describe("surfaceStyle", () => {
  it("is the caller's style when nothing custom is set", () => {
    expect(surfaceStyle({ style: "color: red" })).toBe("color: red");
    expect(surfaceStyle({})).toBeUndefined();
  });
  it("lays bg, border and widths over an object style", () => {
    expect(
      surfaceStyle({
        bg: "#111",
        borderColor: "#222",
        minWidth: "1px",
        maxWidth: "2px",
        style: { color: "red" },
      }),
    ).toEqual({
      color: "red",
      background: "#111",
      "border-color": "#222",
      "min-width": "1px",
      "max-width": "2px",
    });
  });
  it("drops bg and border while active, and drops a string style once custom is set", () => {
    expect(surfaceStyle({ bg: "#111", active: true })).toBeUndefined();
    expect(surfaceStyle({ minWidth: "1px", style: "color: red" })).toEqual({
      "min-width": "1px",
    });
  });
});
