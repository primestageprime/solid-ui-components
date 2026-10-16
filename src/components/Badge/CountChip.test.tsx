import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { CountChip } from "./index";

afterEach(cleanup);

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
    const { container } = render(() => (
      <CountChip count={0} label="x" active />
    ));
    expect(container.firstElementChild!.className).toMatch(/--active/);
  });
});

describe("CountChip grouped", () => {
  it("groups in a stated locale and leaves the digits bare by default", () => {
    const de = render(() => <CountChip count={2594} label="" grouped locale="de-DE" />);
    expect(de.container.querySelector(".sui-count-chip__count")!.textContent).toBe("2.594");
    cleanup();
    const bare = render(() => <CountChip count={2594} label="" />);
    expect(bare.container.querySelector(".sui-count-chip__count")!.textContent).toBe("2594");
  });
});
