import { describe, expect, it } from "vitest";
import {
  emphasisClassName,
  emphasisStateFor,
  emphasisStates,
} from "./emphasis";

describe("emphasisStateFor", () => {
  it("returns null for every id while nothing is hovered", () => {
    expect(emphasisStateFor(null, "a")).toBeNull();
    expect(emphasisStateFor(null, null)).toBeNull();
  });

  it("highlights the hovered id", () => {
    expect(emphasisStateFor("a", "a")).toBe("highlighted");
  });

  it("mutes every other id", () => {
    expect(emphasisStateFor("a", "b")).toBe("muted");
  });

  it("mutes a null id — an unlabelled element can only step back", () => {
    expect(emphasisStateFor("a", null)).toBe("muted");
  });
});

describe("emphasisClassName", () => {
  it("returns the empty string while nothing is hovered", () => {
    expect(emphasisClassName("block", null, "a")).toBe("");
  });

  it("returns the highlighted modifier for the hovered id", () => {
    expect(emphasisClassName("block", "a", "a")).toBe(" block--highlighted");
  });

  it("returns the muted modifier for every other id", () => {
    expect(emphasisClassName("block", "a", "b")).toBe(" block--muted");
    expect(emphasisClassName("block", "a", null)).toBe(" block--muted");
  });
});

describe("emphasisStates", () => {
  it("classifies a whole id list in one pass", () => {
    const states = emphasisStates("b", ["a", "b", "c"]);
    expect(states.get("a")).toBe("muted");
    expect(states.get("b")).toBe("highlighted");
    expect(states.get("c")).toBe("muted");
  });

  it("classifies every id null while nothing is hovered", () => {
    const states = emphasisStates(null, ["a", "b"]);
    expect(states.get("a")).toBeNull();
    expect(states.get("b")).toBeNull();
  });
});
