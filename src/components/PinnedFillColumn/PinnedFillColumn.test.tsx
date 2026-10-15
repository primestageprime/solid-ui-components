import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { PinnedFillColumn } from "./PinnedFillColumn";

afterEach(cleanup);

describe("PinnedFillColumn", () => {
  it("renders header, middle and footer in that order", () => {
    const { container } = render(() => (
      <PinnedFillColumn header={<span>top</span>} footer={<span>bottom</span>}>
        <span>middle</span>
      </PinnedFillColumn>
    ));
    expect(container.textContent).toBe("topmiddlebottom");
  });

  it("pins the header and footer on a 1px divider that does not shrink", () => {
    const { container } = render(() => (
      <PinnedFillColumn header={<span>top</span>} footer={<span>bottom</span>}>
        <span>middle</span>
      </PinnedFillColumn>
    ));
    const header = container.querySelector<HTMLElement>('[data-pinned="header"]')!;
    const footer = container.querySelector<HTMLElement>('[data-pinned="footer"]')!;
    expect(header.style.borderBottom).toBe("1px solid var(--sui-border)");
    expect(footer.style.borderTop).toBe("1px solid var(--sui-border)");
    expect(header.className).toContain("box--no-shrink");
    expect(footer.className).toContain("box--no-shrink");
  });

  it("scrolls the middle: it fills the leftover height and may shrink", () => {
    const { container } = render(() => (
      <PinnedFillColumn>
        <span>middle</span>
      </PinnedFillColumn>
    ));
    const middle = container.querySelector<HTMLElement>(".stack > .stack")!;
    expect(middle.style.overflow).toBe("auto");
    expect(middle.style.minHeight).toBe("0px");
  });

  it("draws no bar and no divider for an omitted slot", () => {
    const { container } = render(() => (
      <PinnedFillColumn>
        <span>middle</span>
      </PinnedFillColumn>
    ));
    expect(container.querySelector("[data-pinned]")).toBeNull();
  });
});
