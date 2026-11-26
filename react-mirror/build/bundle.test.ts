// @vitest-environment node
// bundle.js run the way a design-system page runs it: a classic script, with
// React and ReactDOM already on window.
import { runInNewContext } from "node:vm";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBundle } from "./bundle.ts";

type Namespace = Readonly<
  Record<string, (props: object) => React.ReactElement>
>;

describe("bundle.js", () => {
  let bundle: { readonly js: string; readonly css: string };
  let sui: Namespace;

  beforeAll(async () => {
    bundle = await buildBundle();
    const window: { React: unknown; ReactDOM: unknown; Sui?: Namespace } = {
      React,
      ReactDOM,
    };
    runInNewContext(bundle.js, {
      window,
      navigator: { language: "en-US" },
      Intl,
    });
    sui = window.Sui ?? {};
  }, 60_000);

  it("can be inlined in a page", () => {
    expect(bundle.js).not.toMatch(/<\/script|<!--/i);
    expect(bundle.css).not.toMatch(/<\/style/i);
  });

  it("puts SUI's variants and the dials on window.Sui", () => {
    for (const name of [
      "PrimaryButton",
      "CardSurface",
      "DialStack",
      "GroupDial",
      "MutationDial",
    ]) {
      expect(typeof sui[name]).toBe("function");
    }
  });

  it("renders through the page's React", () => {
    const PrimaryButton = sui.PrimaryButton;
    if (!PrimaryButton) throw new Error("no PrimaryButton");
    expect(
      renderToStaticMarkup(React.createElement(PrimaryButton, {}, "Save")),
    ).toBe(
      '<button type="button" class="sui-btn sui-btn--primary"><span class="sui-btn__content">Save</span></button>',
    );
  });

  it("carries the CSS of every component it draws", () => {
    for (const cls of [
      ".sui-btn",
      ".surface",
      ".sui-marked-slider",
      ".sui-slider__field",
      ".text--value",
    ]) {
      expect(bundle.css).toContain(cls);
    }
  });
});
