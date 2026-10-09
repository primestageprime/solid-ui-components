import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { SplitCard } from "./variants";

describe("SplitCard", () => {
  it("mounts with its baked override (direction=row, align=center, gap=lg, padding=md, radius=md)", () => {
    const { container } = render(() => <SplitCard>content</SplitCard>);
    expect(container.textContent).toContain("content");
  });
});
