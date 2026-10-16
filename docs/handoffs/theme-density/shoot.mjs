// Evidence capture for the theme-density audit.
//   PW=<path to playwright/index.mjs> node shoot.mjs <before|after> <port>
// before: hud theme as shipped. after: same page + dense-overlay.css injected.
// Writes shots/<component>-<phase>.png and metrics-<phase>.json (headless numbers).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.PW ?? "playwright");
const here = dirname(fileURLToPath(import.meta.url));
const [phase = "before", port = "2305"] = process.argv.slice(2);
const overlay = phase === "after" ? readFileSync(join(here, "dense-overlay.css"), "utf8") : null;

// component -> [route, heading text to scroll to, optional click selector, optional anchor selector (centred), optional row selector to select]
const TARGETS = {
  BucketQueue: ["bucket-queue", "Row cards", null, ".bucket-queue"],
  CompactBucketQueue: ["bucket-queue", "CompactBucketQueue", null, ".bucket-queue--compact"],
  ActionList: ["action-list", "Working list", null, null, ".sui-action-list-item--selectable"],
  GroupedBucketQueue: ["grouped-bucket-queue", "Click a row"],
  CollapsiblePanel: ["app-shell", "CollapsiblePanel"],
  ThreePanelLayout: ["three-panel-layout", "Default — all four slots"],
  Modal: ["hud-modal", "Composed", ".demo-btn"],
  DataTable: ["base-table", "Composed — Default"],
};
// selector -> properties to record from the first match (headless observation)
const PROBES = {
  ".bucket-queue": ["rowGap"],
  ".bucket-queue__bucket": ["borderTopWidth", "borderLeftWidth", "borderTopLeftRadius", "marginTop"],
  ".bucket-queue__header": ["paddingTop", "paddingLeft"],
  ".bucket-queue__row": ["paddingTop", "paddingLeft", "borderTopWidth"],
  ".sui-sortable-list": ["rowGap"],
  ".sui-action-list-item": ["paddingTop", "paddingLeft", "borderTopLeftRadius", "borderBottomWidth"],
  ".sui-three-panel__top-bar": ["paddingLeft", "rowGap"],
  ".sui-three-panel__left": ["paddingTop", "rowGap"],
  ".sui-three-panel__center": ["paddingTop", "rowGap"],
  ".sui-modal__header": ["paddingTop", "paddingLeft"],
  ".sui-modal__body": ["paddingTop"],
  ".hud-table__header-cell": ["paddingTop", "paddingLeft"],
  ".hud-table__cell": ["paddingTop", "paddingLeft"],
};

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { try { localStorage.setItem("sui-theme", "hud"); } catch {} });
const p = await ctx.newPage();
const metrics = {};
for (const [name, [route, heading, click, anchor, selectRow]] of Object.entries(TARGETS)) {
  await p.goto(`http://localhost:${port}/#/${route}`);
  await p.waitForSelector("h2");
  await p.waitForTimeout(1200);
  if (overlay) await p.addStyleTag({ content: overlay });
  await p.evaluate(([h, a]) => {
    if (a) { document.querySelector(a)?.scrollIntoView({ block: "center" }); return; }
    const el = [...document.querySelectorAll("h2,h3")].find((e) => e.textContent.includes(h));
    el?.scrollIntoView({ block: "start" });
  }, [heading, anchor]);
  if (click) { await p.locator(click).first().click(); }
  if (selectRow) { await p.locator(selectRow).nth(2).click({ position: { x: 4, y: 4 } }); }
  await p.waitForTimeout(700);
  await p.screenshot({ path: join(here, "shots", `${name}-${phase}.png`) });
  const scoped = Object.fromEntries(Object.entries(PROBES).map(([sel, props]) => [
    name === "CompactBucketQueue" ? sel.replace(/^\.bucket-queue(?!--)(__\w+)?/, (m, tail) => `.bucket-queue--compact${tail ? " .bucket-queue" + tail : ""}`) : sel,
    props,
  ]));
  metrics[name] = await p.evaluate((probes) => {
    const out = {};
    for (const [sel, props] of Object.entries(probes)) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cs = getComputedStyle(el);
      out[sel] = { height: el.getBoundingClientRect().height };
      for (const k of props) out[sel][k] = cs[k];
    }
    return out;
  }, scoped);
  if (click) await p.keyboard.press("Escape");
}
writeFileSync(join(here, `metrics-${phase}.json`), JSON.stringify(metrics, null, 2));
await b.close();
console.log("done", phase);
