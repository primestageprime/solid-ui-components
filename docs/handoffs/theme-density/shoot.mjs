// Evidence capture for the theme-density work.
//   PW=<path to playwright/index.mjs> node shoot.mjs <before|after|overlay> <port>
// before: a dev gallery serving origin/main (SUI 0.222.0), hud theme as shipped.
// after:  a dev gallery serving feat/theme-density — the REAL code, no overlay.
// overlay: the audit's original "after": the before page + dense-overlay.css injected.
// Writes shots/<component>-<phase>.png and metrics-<phase>.json (headless numbers).
// SUI_THEME=<id> (default hud) shoots another theme; a non-hud theme suffixes
// its files `-<theme>` so the hud set stays the canonical one.
// Header pass (2026-10-16, no leading dot): the pre-change hud shots are kept as
// shots/*-before-header.png and metrics-before-header.json; `edges` below is
// the headless observation of the label/row left edges that pass is about.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = await import(process.env.PW ?? "playwright");
const here = dirname(fileURLToPath(import.meta.url));
const [phase = "before", port = "2305"] = process.argv.slice(2);
const theme = process.env.SUI_THEME ?? "hud";
const suffix = theme === "hud" ? "" : `-${theme}`;
const overlay = phase === "overlay" ? readFileSync(join(here, "dense-overlay.css"), "utf8") : null;

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
  ".bucket-queue__row--selected": ["boxShadow"],
  ".bucket-queue__count": ["display", "borderTopWidth", "fontSize"],
  ".sui-sortable-list": ["rowGap"],
  ".sui-action-list-item": ["paddingTop", "paddingLeft", "borderTopLeftRadius", "borderBottomWidth", "borderLeftWidth"],
  ".sui-action-list-item--selected": ["boxShadow", "borderColor", "backgroundColor"],
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
await ctx.addInitScript((t) => { try { localStorage.setItem("sui-theme", t); } catch {} }, theme);
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
  await p.screenshot({ path: join(here, "shots", `${name}-${phase}${suffix}.png`) });
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
  // Label/row left edges per bucket header (the no-leading-dot rule): the
  // label's first text node vs the first row's content box under that header.
  if (name === "BucketQueue" || name === "GroupedBucketQueue") {
    metrics[name].edges = await p.evaluate((grouped) => {
      const out = [];
      for (const h of document.querySelectorAll(".bucket-queue__header")) {
        const title = h.querySelector(".bucket-queue__title");
        if (!title) continue;
        const tn = [...title.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
        const r = document.createRange();
        if (tn) r.selectNodeContents(tn); else r.selectNodeContents(title);
        const labelLeft = r.getBoundingClientRect().left;
        const node = h.closest(grouped ? ".grouped-bucket-queue__node" : ".bucket-queue__bucket");
        const row = node?.querySelector(":scope > .bucket-queue__body .bucket-queue__row");
        const content = row?.querySelector(".bucket-queue__content") ?? row;
        const rowLeft = content?.getBoundingClientRect().left ?? null;
        out.push({
          label: title.textContent.trim(),
          depth: node?.style.getPropertyValue("--gbq-depth") || undefined,
          labelLeft: +labelLeft.toFixed(1),
          rowLeft: rowLeft == null ? null : +rowLeft.toFixed(1),
          delta: rowLeft == null ? null : +(rowLeft - labelLeft).toFixed(1),
          leadingGlyph: title.firstChild === title.firstElementChild ? title.firstElementChild?.className : null,
          dots: node?.querySelectorAll(".bucket-queue__dot").length ?? 0,
          chipBorder: h.querySelector(".bucket-queue__count") && getComputedStyle(h.querySelector(".bucket-queue__count")).borderColor,
        });
      }
      return out;
    }, name === "GroupedBucketQueue");
  }
  if (click) await p.keyboard.press("Escape");
}
writeFileSync(join(here, `metrics-${phase}${suffix}.json`), JSON.stringify(metrics, null, 2));
await b.close();
console.log("done", phase, theme);
