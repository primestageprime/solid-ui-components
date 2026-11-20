import { describe, expect, it } from "vitest";
import { classNames } from "./classes.ts";

describe("classNames", () => {
  it("joins the truthy parts with one space", () => {
    expect(classNames("a", false, undefined, null, "", "b")).toBe("a b");
  });
  it("is empty for no parts", () => {
    expect(classNames()).toBe("");
  });
});
