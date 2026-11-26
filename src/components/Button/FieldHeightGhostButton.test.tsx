import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { FieldHeightGhostButton } from "./variants";

describe("FieldHeightGhostButton", () => {
  it("is a small ghost button pinned to the small field's 29px", () => {
    const { container } = render(() => <FieldHeightGhostButton>3</FieldHeightGhostButton>);
    const button = container.querySelector("button") as HTMLButtonElement;
    expect(button.textContent).toContain("3");
    expect(button.className).toContain("sui-btn--ghost");
    expect(button.className).toContain("sui-btn--sm");
    expect(button.style.height).toBe("29px");
  });
});
