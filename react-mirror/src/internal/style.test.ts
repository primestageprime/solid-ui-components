import { describe, expect, it } from "vitest";
import { camelProperty, mergeStyle, parseStyle, reactStyle } from "./style.ts";

describe("camelProperty", () => {
  it("camel-cases a dashed property", () => {
    expect(camelProperty("font-variant-numeric")).toBe("fontVariantNumeric");
  });
  it("keeps a plain property", () => {
    expect(camelProperty("overflow")).toBe("overflow");
  });
  it("keeps a custom property exactly", () => {
    expect(camelProperty("--sui-accent")).toBe("--sui-accent");
  });
  it("capitalises a vendor prefix the way React expects", () => {
    expect(camelProperty("-webkit-line-clamp")).toBe("WebkitLineClamp");
  });
});

describe("parseStyle", () => {
  it("reads declarations, trimming space and empty pieces", () => {
    expect(parseStyle(" width: 88px ;; min-height:0 ")).toEqual({
      width: "88px",
      "min-height": "0",
    });
  });
  it("keeps a colon inside a value", () => {
    expect(parseStyle("background: url(a:b)")).toEqual({
      background: "url(a:b)",
    });
  });
});

describe("reactStyle", () => {
  it("is undefined for no style", () => {
    expect(reactStyle(undefined)).toBeUndefined();
  });
  it("camel-cases an object's keys and keeps its values", () => {
    expect(reactStyle({ "max-width": "100%", "--x": 1 })).toEqual({
      maxWidth: "100%",
      "--x": 1,
    });
  });
  it("drops an undefined value, as Solid does", () => {
    expect(reactStyle({ width: undefined, height: "1px" })).toEqual({
      height: "1px",
    });
  });
  it("parses a string style", () => {
    expect(reactStyle("flex: 0 0 auto")).toEqual({ flex: "0 0 auto" });
  });
});

describe("mergeStyle", () => {
  it("takes the override when there is no base", () => {
    expect(mergeStyle(undefined, { a: "1" })).toEqual({ a: "1" });
  });
  it("takes the base when there is no override", () => {
    expect(mergeStyle({ a: "1" }, undefined)).toEqual({ a: "1" });
  });
  it("lets a string on either side win as the override", () => {
    expect(mergeStyle({ a: "1" }, "b: 2")).toBe("b: 2");
    expect(mergeStyle("a: 1", { b: "2" })).toEqual({ b: "2" });
  });
  it("merges objects key by key, the override winning", () => {
    expect(mergeStyle({ a: "1", b: "1" }, { b: "2" })).toEqual({
      a: "1",
      b: "2",
    });
  });
});
