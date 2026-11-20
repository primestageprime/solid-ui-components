import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as buttons from "sui:Button/variants";
import * as layout from "sui:Layout/variants";
import * as surfaces from "sui:Surface/variants";
import * as texts from "sui:Text/variants";
import * as dividers from "sui:Divider/variants";
import { Icon } from "../src/Icon.tsx";

describe("SUI's variant tables, flavored", () => {
  it("builds React buttons from SUI's own table", () => {
    expect(
      renderToStaticMarkup(<buttons.PrimaryButton>Go</buttons.PrimaryButton>),
    ).toBe(
      '<button type="button" class="sui-btn sui-btn--primary"><span class="sui-btn__content">Go</span></button>',
    );
  });
  it("loads every table", () => {
    const counts = [buttons, layout, surfaces, texts, dividers].map(
      (m) => Object.keys(m).length,
    );
    expect(counts.every((n) => n > 0)).toBe(true);
    expect(renderToStaticMarkup(<layout.FillStretchRow />)).toContain("row");
    expect(renderToStaticMarkup(<surfaces.CardSurface />)).toContain("surface");
    expect(renderToStaticMarkup(<Icon name="plus" />)).toContain("<svg");
  });
});
