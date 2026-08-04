// ============================================
// Grid — the prop→class/style mapping IS the component.
//
// Grid is a Depth 1 Primitive: everything it does is turn props into a class
// list and one inline custom property. `Layout.test.tsx` pins that mapping for
// Stack, Row and Box; Grid had none, so it surfaced as the first entry of the
// `componentsNeverRendered` metric this file exists to burn down.
//
// The interesting behaviour is the `style` prop's two shapes. An OBJECT merges
// with the `columns` base and wins on collision; a STRING replaces the whole
// thing and silently discards `grid-template-columns`. That asymmetry is easy
// to change by accident while "tidying" the ternary, and a caller who passed
// both would get a one-column grid with no error — so it is pinned, not
// assumed.
// ============================================
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { Grid, createGrid } from "./Grid";

afterEach(cleanup);

const mount = (ui: () => JSX.Element) =>
  render(ui).container.firstElementChild as HTMLElement;

describe("Grid", () => {
  it("defaults to the sm gap step", () => {
    const el = mount(() => <Grid>a</Grid>);
    expect(el.className).toBe("grid grid--gap-sm");
  });

  it("emits the gap and align modifiers it is given", () => {
    const el = mount(() => (
      <Grid gap="md" align="baseline">
        a
      </Grid>
    ));
    expect(el.className).toBe("grid grid--gap-md grid--align-baseline");
  });

  it("omits the align modifier entirely when no align is given", () => {
    const el = mount(() => <Grid>a</Grid>);
    expect(el.className).not.toMatch(/grid--align/);
  });

  it("appends a caller class after its own, rather than replacing them", () => {
    const el = mount(() => <Grid class="my-grid">a</Grid>);
    expect(el.className).toBe("grid grid--gap-sm my-grid");
  });

  it("puts `columns` on the element as grid-template-columns", () => {
    const el = mount(() => (
      <Grid columns="minmax(80px, max-content) 1fr">a</Grid>
    ));
    expect(el.style.gridTemplateColumns).toBe("minmax(80px, max-content) 1fr");
  });

  it("merges an object style with the columns it computed", () => {
    const el = mount(() => (
      <Grid columns="1fr 1fr" style={{ "padding-block": "4px" }}>
        a
      </Grid>
    ));
    expect(el.style.gridTemplateColumns).toBe("1fr 1fr");
    expect(el.style.paddingBlock).toBe("4px");
  });

  it("lets an object style win on a collision — the caller is more specific", () => {
    const el = mount(() => (
      <Grid columns="1fr 1fr" style={{ "grid-template-columns": "2fr" }}>
        a
      </Grid>
    ));
    expect(el.style.gridTemplateColumns).toBe("2fr");
  });

  it("DISCARDS columns when the style prop is a string (by design, and sharp)", () => {
    // A string style is passed through untouched, so the computed base is lost.
    // Documented here because the failure is silent: the grid renders in one
    // column and nothing warns. Prefer the object form when passing `columns`.
    const el = mount(() => (
      <Grid columns="1fr 1fr" style="padding-block: 4px">
        a
      </Grid>
    ));
    expect(el.style.gridTemplateColumns).toBe("");
    expect(el.style.paddingBlock).toBe("4px");
  });

  it("forwards unrecognised attributes to the element", () => {
    const el = mount(() => (
      <Grid id="cells" data-testid="grid" role="list">
        a
      </Grid>
    ));
    expect(el.id).toBe("cells");
    expect(el.getAttribute("data-testid")).toBe("grid");
    expect(el.getAttribute("role")).toBe("list");
  });

  it("renders its children", () => {
    const el = mount(() => <Grid>cell</Grid>);
    expect(el.textContent).toBe("cell");
  });
});

describe("createGrid — the Factory behind a Curried Variant", () => {
  it("bakes its defaults into every instance", () => {
    const LabelValueGrid = createGrid({
      columns: "max-content 1fr",
      gap: "xs",
      align: "baseline",
    });
    const el = mount(() => <LabelValueGrid>a</LabelValueGrid>);
    expect(el.className).toBe("grid grid--gap-xs grid--align-baseline");
    expect(el.style.gridTemplateColumns).toBe("max-content 1fr");
  });

  it("still takes Data Props at the call site", () => {
    const CardGrid = createGrid({ columns: "1fr 1fr" });
    const el = mount(() => <CardGrid class="deck">tiles</CardGrid>);
    expect(el.className).toBe("grid grid--gap-sm deck");
    expect(el.textContent).toBe("tiles");
  });

  it("falls back to Grid's own gap default when the variant locks none", () => {
    const Bare = createGrid({ columns: "1fr" });
    expect(mount(() => <Bare>a</Bare>).className).toBe("grid grid--gap-sm");
  });
});
