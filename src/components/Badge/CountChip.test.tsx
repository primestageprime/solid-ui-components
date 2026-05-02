import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CountChip } from "./index";

describe("CountChip", () => {
  it("renders count + label", () => {
    const { container } = render(() => <CountChip count={3} label="active" />);
    const root = container.firstElementChild!;
    expect(root.textContent).toMatch(/3/);
    expect(root.textContent).toMatch(/active/);
  });

  it("count > 0 → active class", () => {
    const { container } = render(() => <CountChip count={3} label="active" />);
    expect(container.firstElementChild!.className).toMatch(/active/);
  });

  it("count = 0 → no active class", () => {
    const { container } = render(() => <CountChip count={0} label="empty" />);
    expect(container.firstElementChild!.className).not.toMatch(/--active/);
  });

  it("force active=true overrides count=0", () => {
    const { container } = render(() => <CountChip count={0} label="x" active />);
    expect(container.firstElementChild!.className).toMatch(/--active/);
  });
});
