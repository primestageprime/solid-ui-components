// @vitest-environment node
// Each design-system card's preview, run as the page runs it: React's UMD
// builds and bundle.js as classic scripts on a window, then the card's own
// script. A card that throws, logs an error or renders nothing fails here
// instead of showing blank on the page.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";
import { buildBundle } from "./bundle.ts";

const MODULES = fileURLToPath(new URL("../node_modules", import.meta.url));
const CARDS = fileURLToPath(
  new URL("../design-system/components", import.meta.url),
);
const cards = readdirSync(CARDS);
const LIBRARIES = [
  "react/umd/react.development.js",
  "react-dom/umd/react-dom.development.js",
].map((lib) => readFileSync(join(MODULES, lib), "utf8"));

const scriptOf = (html: string): string =>
  /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? "";

const settle = (window: {
  readonly setTimeout: (done: () => void, ms: number) => unknown;
}): Promise<void> => new Promise((done) => window.setTimeout(done, 100));

describe("design-system previews", () => {
  let bundle = "";
  beforeAll(async () => {
    bundle = (await buildBundle()).js;
  }, 60_000);

  it.each(cards)("%s renders without errors", async (card) => {
    const html = readFileSync(join(CARDS, card, "preview.html"), "utf8");
    expect(html.split("\n")[0]).toMatch(
      /^<!-- @dsCard (group="[^"]+" )?height=\d+/,
    );
    const errors: unknown[] = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("error", (...args) => errors.push(args));
    // jsdom has no canvas. A dial measures its names on one and, finding
    // none, shows them whole, which is what a browser without canvas gets;
    // jsdom saying so is the test's environment, not the page's error.
    virtualConsole.on("jsdomError", (e) => {
      if (!/^Not implemented: HTMLCanvasElement's getContext\(\)/.test(e.message))
        errors.push(e.message);
    });
    const dom = new JSDOM(
      `<!doctype html><html data-theme="hud"><body>${html.replace(/<script>[\s\S]*<\/script>/, "")}</body></html>`,
      { runScripts: "outside-only", virtualConsole, pretendToBeVisual: true },
    );
    for (const code of [...LIBRARIES, bundle, scriptOf(html)])
      dom.window.eval(code);
    await settle(dom.window);
    expect(errors).toEqual([]);
    const root =
      dom.window.document.getElementById("root") ?? dom.window.document.body;
    expect(root.childElementCount).toBeGreaterThan(0);
    dom.window.close();
  });
});
