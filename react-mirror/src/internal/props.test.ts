import { describe, expect, it } from "vitest";
import { domProps, mergeDefined, omit } from "./props.ts";

describe("mergeDefined", () => {
  it("lets a defined caller prop beat the variant's default", () => {
    expect(mergeDefined({ size: "sm", tone: "muted" }, { size: "lg" })).toEqual(
      {
        size: "lg",
        tone: "muted",
      },
    );
  });

  it("keeps the default when the caller passes undefined, as Solid's mergeProps does", () => {
    expect(mergeDefined({ size: "sm" }, { size: undefined })).toEqual({
      size: "sm",
    });
  });

  it("keeps a caller's false and null", () => {
    expect(mergeDefined({ a: true, b: 1 }, { a: false, b: null })).toEqual({
      a: false,
      b: null,
    });
  });
});

describe("omit", () => {
  it("drops the named keys and nothing else", () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ["a", "c"])).toEqual({ b: 2 });
  });
});

describe("domProps", () => {
  it("turns Solid's attribute names into React's", () => {
    expect(
      domProps({
        class: "x",
        tabindex: -1,
        for: "id",
        inputmode: "decimal",
        autocomplete: "off",
        readonly: true,
        spellcheck: false,
        "aria-label": "Roofer",
        "data-dial-name": "",
        title: "t",
      }),
    ).toEqual({
      className: "x",
      tabIndex: -1,
      htmlFor: "id",
      inputMode: "decimal",
      autoComplete: "off",
      readOnly: true,
      spellCheck: false,
      "aria-label": "Roofer",
      "data-dial-name": "",
      title: "t",
    });
  });

  it("converts style to React's camel-cased object", () => {
    expect(domProps({ style: { "min-width": "0px", "--x": 1 } })).toEqual({
      style: { minWidth: "0px", "--x": 1 },
    });
  });

  it("keeps a React className when no class is given", () => {
    expect(domProps({ className: "y" })).toEqual({ className: "y" });
  });

  it("drops undefined values so React writes no attribute", () => {
    expect(domProps({ title: undefined, style: undefined })).toEqual({});
  });
});
