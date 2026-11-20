import { describe, expect, it } from "vitest";
import { shape } from "./normalize.ts";

const html = (markup: string): Element => {
  const host = document.createElement("div");
  host.innerHTML = markup;
  return host;
};

describe("shape", () => {
  it("keeps tags, attributes and text", () => {
    expect(shape(html('<span class="a" title="t">hi</span>'))).toEqual({
      tag: "div",
      attrs: [],
      children: [
        {
          tag: "span",
          attrs: [
            ["class", "a"],
            ["title", "t"],
          ],
          children: ["hi"],
        },
      ],
    });
  });

  it("ignores attribute order, generated ids and where references point", () => {
    expect(
      shape(
        html('<i id="cl-3" name="cl-3" title="t" aria-labelledby="cl-3"></i>'),
      ),
    ).toEqual(shape(html('<i aria-labelledby="x" title="t"></i>')));
  });

  it("compares styles as the browser reads them", () => {
    expect(shape(html('<i style="min-width:0px;height: 24px"></i>'))).toEqual(
      shape(html('<i style="height: 24px; min-width: 0px;"></i>')),
    );
  });

  it("joins adjacent text and drops empty text", () => {
    const host = document.createElement("div");
    host.append("a", "b", "");
    expect(shape(host)).toEqual({ tag: "div", attrs: [], children: ["ab"] });
  });
});
