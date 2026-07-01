import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Stack } from "./Stack";
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
