import { describe, expect, it } from "vitest";
import { textClasses, textStyle } from "./Text.tsx";

describe("textClasses", () => {
  it("adds the variant, a non-default tone and the caller's class", () => {
    expect(textClasses({})).toBe("text");
    expect(textClasses({ variant: "label", tone: "danger", class: "c" })).toBe(
      "text text--label sui-text-tone--danger c",
    );
  });
  it("adds no class for the default tone", () => {
    expect(textClasses({ tone: "default" })).toBe("text");
  });
});

describe("textStyle", () => {
  it("is the caller's style without a color", () => {
    expect(textStyle(undefined, "a: b")).toBe("a: b");
  });
  it("lays the color over an object style and drops a string one", () => {
    expect(textStyle("red", { "font-size": "1px" })).toEqual({
      "font-size": "1px",
      color: "red",
    });
    expect(textStyle("red", "a: b")).toEqual({ color: "red" });
  });
});
