import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { SignedAreaChart } from "./SignedAreaChart";

const data = [2, 1, -1, -2, 1, 3].map((y, x) => ({ x, y }));

describe("SignedAreaChart", () => {
  it("mounts four areas, two lines and a NOW rule", () => {
    const { container } = render(() => (
      <SignedAreaChart data={data} now={2.5} xDomain={[-0.5, 5.5]} size={{ width: 400, height: 200 }} />
    ));
    expect(container.querySelectorAll("path.sui-chart__area").length).toBe(4);
    expect(container.textContent).toContain("now");
  });
  it("omits the NOW rule when NOW is outside the drawn extent", () => {
    const { container } = render(() => (
      <SignedAreaChart data={data} now={50} xDomain={[-0.5, 5.5]} size={{ width: 400, height: 200 }} />
    ));
    expect(container.textContent).not.toContain("now");
  });
});
