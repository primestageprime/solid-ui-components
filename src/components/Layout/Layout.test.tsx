import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import layoutCss from "./Layout.css?raw";
import { Stack, type StackProps } from "./Stack";
import { Row } from "./Row";
import { Box } from "./Box";
import {
  ProportionalStack,
  ProportionalItem,
  TightStack,
  ClusterRow,
  DelineatedSidebar,
  PageCanvas,
  ScrollPanel,
  PaddedStack,
  WrapItemStack,
  GrowTightStack,
  WrapRow,
  LooseWrapRow,
  CardGrid,
  LooseCardGrid,
  WrappedClusterRow,
} from "./index";

describe("Layout primitives", () => {
  it("Stack applies gap class", () => {
    const { container } = render(() => <Stack gap="sm">a</Stack>);
    expect(container.firstElementChild!.className).toMatch(/stack--gap-sm/);
  });

  it("Row applies align/justify classes", () => {
    const { container } = render(() => (
      <Row align="center" justify="between">
        x
      </Row>
    ));
    const cls = container.firstElementChild!.className;
    expect(cls).toMatch(/row--align-center/);
    expect(cls).toMatch(/row--justify-between/);
  });

  it("Box applies grow modifier", () => {
    const { container } = render(() => <Box grow>x</Box>);
    expect(container.firstElementChild!.className).toMatch(/box--grow/);
  });
});

describe("Layout curried variants", () => {
  it("TightStack uses gap-xs", () => {
    const { container } = render(() => <TightStack>x</TightStack>);
    expect(container.firstElementChild!.className).toMatch(/stack--gap-xs/);
  });

  it("ClusterRow uses gap-sm + align-center", () => {
    const { container } = render(() => <ClusterRow>x</ClusterRow>);
    const cls = container.firstElementChild!.className;
    expect(cls).toMatch(/row--gap-sm/);
    expect(cls).toMatch(/row--align-center/);
  });

  it("WrapItemStack carries both wrap-item guards at gap-xs", () => {
    const { container } = render(() => <WrapItemStack>x</WrapItemStack>);
    const el = container.firstElementChild!;
    const style = el.getAttribute("style") ?? "";
    expect(el.className).toMatch(/stack--gap-xs/);
    // min-width:0 lets an inner `fit` table scroll instead of overflowing.
    expect(style).toMatch(/min-width: ?0/);
    // max-width:100% caps it at the row so it can't blow out the page.
    expect(style).toMatch(/max-width: ?100%/);
  });

  it("WrapItemStack does NOT grow — that is what separates it from GrowTightStack", () => {
    // flex:1 would equalise items in a wrap row, destroying the natural-width
    // packing the wrap row exists for. This is the whole reason the variant
    // exists rather than reusing GrowTightStack.
    const { container } = render(() => <WrapItemStack>x</WrapItemStack>);
    expect(container.firstElementChild!.getAttribute("style") ?? "").not.toMatch(
      /flex: ?1/,
    );
    const grow = render(() => <GrowTightStack>x</GrowTightStack>);
    expect(grow.container.firstElementChild!.getAttribute("style") ?? "").toMatch(
      /flex: ?1/,
    );
  });

  it("LooseWrapRow is WrapRow at the sm step — gap is the ONLY difference", () => {
    const loose = render(() => <LooseWrapRow>x</LooseWrapRow>);
    const tight = render(() => <WrapRow>x</WrapRow>);
    const lc = loose.container.firstElementChild!.className;
    const tc = tight.container.firstElementChild!.className;
    expect(lc).toMatch(/row--gap-sm/);
    expect(tc).toMatch(/row--gap-xs/);
    // Same wrap, and everything else about the two must agree.
    expect(lc).toMatch(/row--wrap/);
    expect(lc.replace(/row--gap-sm/, "GAP")).toBe(tc.replace(/row--gap-xs/, "GAP"));
  });

  it("LooseWrapRow sets NO align — tiles on a line stretch to equal height", () => {
    // The load-bearing detail: an explicit align would change the look beyond
    // the gap. WrappedClusterRow is the sm wrap row that DOES centre, and is
    // exactly what this variant exists to avoid.
    const { container } = render(() => <LooseWrapRow>x</LooseWrapRow>);
    expect(container.firstElementChild!.className).not.toMatch(/row--align-/);
    const centred = render(() => <WrappedClusterRow>x</WrappedClusterRow>);
    expect(centred.container.firstElementChild!.className).toMatch(
      /row--align-center/,
    );
  });

  it("LooseCardGrid is CardGrid at the sm step — same tracks, looser gutter", () => {
    const loose = render(() => <LooseCardGrid>x</LooseCardGrid>);
    const base = render(() => <CardGrid>x</CardGrid>);
    expect(loose.container.firstElementChild!.className).toMatch(/grid--gap-sm/);
    expect(base.container.firstElementChild!.className).toMatch(/grid--gap-xs/);
    // Track sizing must be untouched — only the gutter differs.
    const tracks = (el: Element) =>
      (el.getAttribute("style") ?? "").match(/repeat\(auto-fit[^;]*/)?.[0];
    expect(tracks(loose.container.firstElementChild!)).toBe(
      tracks(base.container.firstElementChild!),
    );
  });

  it("DelineatedSidebar produces a stack with min-width 400", () => {
    const { container } = render(() => (
      <DelineatedSidebar>x</DelineatedSidebar>
    ));
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toMatch(/min-width: ?400px/);
  });

  it("PageCanvas fills 100% with no padding", () => {
    const { container } = render(() => <PageCanvas>x</PageCanvas>);
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toMatch(/width: ?100%/);
    expect(style).toMatch(/height: ?100%/);
  });

  it("ScrollPanel sets overflow auto + max-height", () => {
    const { container } = render(() => <ScrollPanel>x</ScrollPanel>);
    const style = container.firstElementChild!.getAttribute("style") ?? "";
    expect(style).toMatch(/overflow: ?auto/);
    expect(style).toMatch(/max-height/);
  });

  it("PaddedStack applies gap-sm and inline padding", () => {
    const { container } = render(() => <PaddedStack>x</PaddedStack>);
    const el = container.firstElementChild!;
    expect(el.className).toMatch(/stack--gap-sm/);
    const style = el.getAttribute("style") ?? "";
    expect(style).toMatch(/padding/);
  });
});

describe("ProportionalStack / ProportionalItem", () => {
  it("ProportionalStack applies direction + gap class", () => {
    const { container } = render(() => (
      <ProportionalStack direction="column" gap="sm">
        <ProportionalItem weight={1}>a</ProportionalItem>
      </ProportionalStack>
    ));
    const root = container.firstElementChild!;
    expect(root.className).toMatch(/proportional-stack--column/);
    expect(root.className).toMatch(/proportional-stack--gap-sm/);
  });

  it("ProportionalItem with weight=0 is fixed-content", () => {
    const { container } = render(() => (
      <ProportionalStack>
        <ProportionalItem weight={0}>head</ProportionalItem>
      </ProportionalStack>
    ));
    const item = container.querySelector(".proportional-item") as HTMLElement;
    expect(item.style.flex).toBe("0 0 auto");
  });

  it("ProportionalItem with weight=N grows by N", () => {
    const { container } = render(() => (
      <ProportionalStack>
        <ProportionalItem weight={3}>body</ProportionalItem>
      </ProportionalStack>
    ));
    const item = container.querySelector(".proportional-item") as HTMLElement;
    expect(item.style.flex).toBe("3 1 0px");
  });
});

// Stack/Row build their gap class by string template, so a step with no CSS
// rule renders as no gap at all rather than erroring — see
// `internal/dom/assertModifierClass.ts`. Asserting the class name alone would
// pass for a step that does not exist, so assert against the stylesheet.
describe("Stack/Row gap scale", () => {
  const STEPS: ReadonlyArray<readonly [NonNullable<StackProps["gap"]>, string]> =
    [
      ["xs", "4px"],
      ["sm", "8px"],
      ["md", "12px"],
      ["lg", "16px"],
    ];

  for (const [step, px] of STEPS) {
    it(`.stack--gap-${step} and .row--gap-${step} are defined at ${px}`, () => {
      expect(layoutCss).toMatch(
        new RegExp(`\\.stack--gap-${step}\\s*\\{\\s*gap:\\s*${px};`),
      );
      expect(layoutCss).toMatch(
        new RegExp(`\\.row--gap-${step}\\s*\\{\\s*gap:\\s*${px};`),
      );
    });

    it(`Stack and Row emit the ${step} gap class`, () => {
      const stack = render(() => <Stack gap={step}>a</Stack>);
      const row = render(() => <Row gap={step}>a</Row>);
      expect(stack.container.firstElementChild!.className).toMatch(
        new RegExp(`stack--gap-${step}`),
      );
      expect(row.container.firstElementChild!.className).toMatch(
        new RegExp(`row--gap-${step}`),
      );
    });
  }
});
