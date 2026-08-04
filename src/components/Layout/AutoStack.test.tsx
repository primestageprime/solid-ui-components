// ============================================
// AutoStackRow / AutoStackItem — the breakpoint is a CSS custom property.
//
// The whole "holy albatross" arrangement hangs off one inline value:
// `--auto-stack-break` on the row, which each item's flex-basis calc reads. If
// that variable stops being emitted the row does not fail loudly — it just
// stops ever stacking, at every width, and only a browser at a narrow viewport
// would show it. jsdom computes no layout, so these tests assert the variable
// and the modifier classes rather than the resulting geometry; that is the
// whole of what the component decides.
//
// Note the same string-vs-object `style` asymmetry Grid has: a string style
// replaces the computed base, taking `--auto-stack-break` with it. Pinned
// below, because here it silently disables the responsive behaviour entirely.
// ============================================
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { AutoStackRow, AutoStackItem } from "./AutoStack";

afterEach(cleanup);

const mount = (ui: () => JSX.Element) =>
  render(ui).container.firstElementChild as HTMLElement;

describe("AutoStackRow", () => {
  it("publishes the default 38rem breakpoint as the CSS variable items read", () => {
    const el = mount(() => <AutoStackRow>a</AutoStackRow>);
    expect(el.style.getPropertyValue("--auto-stack-break")).toBe("38rem");
  });

  it("publishes a caller breakpoint verbatim — any CSS length is allowed", () => {
    const el = mount(() => <AutoStackRow breakWidth="52ch">a</AutoStackRow>);
    expect(el.style.getPropertyValue("--auto-stack-break")).toBe("52ch");
  });

  it("defaults to the md gap step", () => {
    expect(mount(() => <AutoStackRow>a</AutoStackRow>).className).toBe(
      "auto-stack-row auto-stack-row--gap-md",
    );
  });

  it("emits the gap step it is given", () => {
    expect(mount(() => <AutoStackRow gap="xs">a</AutoStackRow>).className).toBe(
      "auto-stack-row auto-stack-row--gap-xs",
    );
  });

  it("adds the stacked modifier, and keeps the breakpoint variable alongside it", () => {
    // `stacked` forces the arrangement in CSS; the variable stays published so
    // removing the prop restores the responsive behaviour with no other change.
    const el = mount(() => <AutoStackRow stacked>a</AutoStackRow>);
    expect(el.className).toMatch(/auto-stack-row--stacked/);
    expect(el.style.getPropertyValue("--auto-stack-break")).toBe("38rem");
  });

  it("appends a caller class after its own", () => {
    expect(
      mount(() => <AutoStackRow class="form-row">a</AutoStackRow>).className,
    ).toBe("auto-stack-row auto-stack-row--gap-md form-row");
  });

  it("merges an object style with the breakpoint variable", () => {
    const el = mount(() => (
      <AutoStackRow breakWidth="20rem" style={{ "margin-block": "8px" }}>
        a
      </AutoStackRow>
    ));
    expect(el.style.getPropertyValue("--auto-stack-break")).toBe("20rem");
    expect(el.style.marginBlock).toBe("8px");
  });

  it("DROPS the breakpoint variable when the style prop is a string", () => {
    // Silently disables stacking at every width — there is no fallback for
    // `--auto-stack-break` in the flex-basis calc. Use the object form.
    const el = mount(() => (
      <AutoStackRow breakWidth="20rem" style="margin-block: 8px">
        a
      </AutoStackRow>
    ));
    expect(el.style.getPropertyValue("--auto-stack-break")).toBe("");
  });

  it("forwards unrecognised attributes and renders its children", () => {
    const el = mount(() => (
      <AutoStackRow data-testid="row">fields</AutoStackRow>
    ));
    expect(el.getAttribute("data-testid")).toBe("row");
    expect(el.textContent).toBe("fields");
  });
});

describe("AutoStackItem", () => {
  it("defaults to the sm gap step — it is a column of its own children", () => {
    expect(mount(() => <AutoStackItem>a</AutoStackItem>).className).toBe(
      "auto-stack-item auto-stack-item--gap-sm",
    );
  });

  it("emits the gap step it is given", () => {
    expect(
      mount(() => <AutoStackItem gap="xs">a</AutoStackItem>).className,
    ).toBe("auto-stack-item auto-stack-item--gap-xs");
  });

  it("appends a caller class and forwards attributes", () => {
    const el = mount(() => (
      <AutoStackItem class="pair" data-testid="item">
        a
      </AutoStackItem>
    ));
    expect(el.className).toBe("auto-stack-item auto-stack-item--gap-sm pair");
    expect(el.getAttribute("data-testid")).toBe("item");
  });

  it("takes no style of its own — an item is positioned entirely by CSS", () => {
    // AutoStackItem does not split `style` out, so a caller style lands on the
    // element through the attribute spread rather than being merged.
    const el = mount(() => (
      <AutoStackItem style={{ "min-width": "10rem" }}>a</AutoStackItem>
    ));
    expect(el.style.minWidth).toBe("10rem");
  });
});

describe("AutoStackRow composed with AutoStackItem", () => {
  it("nests items inside the row that publishes their breakpoint", () => {
    const { container } = render(() => (
      <AutoStackRow breakWidth="30rem">
        <AutoStackItem>one</AutoStackItem>
        <AutoStackItem>two</AutoStackItem>
      </AutoStackRow>
    ));
    const row = container.firstElementChild as HTMLElement;
    const items = row.querySelectorAll(".auto-stack-item");
    expect(items).toHaveLength(2);
    expect(row.style.getPropertyValue("--auto-stack-break")).toBe("30rem");
  });
});
