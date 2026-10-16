import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { EndClusterRow } from "./variants";

describe("EndClusterRow", () => {
  it("mounts with its baked override (justify=end, align=center, gap=xs)", () => {
    const { container } = render(() => <EndClusterRow>content</EndClusterRow>);
    expect(container.textContent).toContain("content");
  });
});
