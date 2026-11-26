import { describe, expect, it } from "vitest";
import {
  appHeaderClasses,
  boxClasses,
  gridClasses,
  gridStyle,
  rowClasses,
  stackClasses,
} from "./Layout.tsx";

describe("stackClasses", () => {
  it("is the bare class with nothing set", () => {
    expect(stackClasses({})).toBe("stack");
  });
  it("adds every modifier in SUI's order", () => {
    expect(
      stackClasses({
        gap: "xs",
        align: "center",
        justify: "between",
        fill: true,
        sizeMotion: true,
        class: "c",
      }),
    ).toBe(
      "stack stack--gap-xs stack--align-center stack--justify-between stack--fill stack--size-motion c",
    );
  });
});

describe("rowClasses", () => {
  it("adds every modifier in SUI's order", () => {
    expect(
      rowClasses({
        gap: "xl",
        align: "baseline",
        justify: "end",
        wrap: true,
        fill: true,
        equal: true,
        class: "c",
      }),
    ).toBe(
      "row row--gap-xl row--align-baseline row--justify-end row--wrap row--fill row--equal c",
    );
  });
});

describe("boxClasses", () => {
  it("marks no-shrink only for an explicit false", () => {
    expect(boxClasses({})).toBe("box");
    expect(boxClasses({ shrink: true })).toBe("box");
    expect(boxClasses({ grow: true, shrink: false, class: "c" })).toBe(
      "box box--grow box--no-shrink c",
    );
  });
});

describe("gridClasses", () => {
  it("defaults the gap to sm", () => {
    expect(gridClasses({})).toBe("grid grid--gap-sm");
  });
  it("adds align and the caller's class", () => {
    expect(gridClasses({ gap: "md", align: "center", class: "c" })).toBe(
      "grid grid--gap-md grid--align-center c",
    );
  });
});

describe("gridStyle", () => {
  it("is empty with no columns and no style", () => {
    expect(gridStyle(undefined, undefined)).toEqual({});
  });
  it("puts columns under the caller's style", () => {
    expect(gridStyle("1fr 2fr", { gap: "1px" })).toEqual({
      "grid-template-columns": "1fr 2fr",
      gap: "1px",
    });
  });
  it("lets a string style replace the columns, as SUI does", () => {
    expect(gridStyle("1fr", "color: red")).toBe("color: red");
  });
});

describe("appHeaderClasses", () => {
  it("defaults to md and adds inline", () => {
    expect(appHeaderClasses({})).toBe("app-header app-header--md");
    expect(appHeaderClasses({ size: "sm", inline: true, class: "c" })).toBe(
      "app-header app-header--sm app-header--inline c",
    );
  });
});
