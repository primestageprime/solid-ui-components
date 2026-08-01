import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { CountBadge } from "./index";

describe("CountBadge", () => {
  it("renders the count", () => {
    const { container } = render(() => <CountBadge count={3} />);
    const root = container.querySelector(".sui-count-badge");
    expect(root).toBeTruthy();
    expect(root?.textContent).toMatch(/3/);
  });
  it("forwards extra attributes (e.g. aria-hidden)", () => {
    const { container } = render(() => (
      <CountBadge count={1} aria-hidden="true" />
    ));
    expect(
      container.querySelector(".sui-count-badge")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });
});
