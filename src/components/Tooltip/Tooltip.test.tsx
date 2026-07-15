import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("renders the trigger wrapping its children with the trigger class", () => {
    const { container, getByText } = render(() => (
      <Tooltip content="help text">
        <span>hover me</span>
      </Tooltip>
    ));
    const trigger = container.querySelector(".sui-tooltip__trigger")!;
    expect(trigger).toBeTruthy();
    expect(getByText("hover me")).toBeTruthy();
  });

  it("merges a caller class onto the trigger", () => {
    const { container } = render(() => (
      <Tooltip content="x" class="extra">
        <span>t</span>
      </Tooltip>
    ));
    const trigger = container.querySelector(".sui-tooltip__trigger")!;
    expect(trigger.classList.contains("extra")).toBe(true);
  });

  it("keeps tooltip content out of the DOM while closed", () => {
    const { container } = render(() => (
      <Tooltip content="secret">
        <span>t</span>
      </Tooltip>
    ));
    expect(container.querySelector(".sui-tooltip__content")).toBeNull();
  });

  it("renders content when forced open via the controlled open prop", () => {
    render(() => (
      <Tooltip content="visible now" open>
        <span>t</span>
      </Tooltip>
    ));
    const content = document.querySelector(".sui-tooltip__content");
    expect(content).toBeTruthy();
    expect(content!.textContent).toContain("visible now");
  });

  it("resolves an accessor content function", () => {
    render(() => (
      <Tooltip content={() => "lazy"} open>
        <span>t</span>
      </Tooltip>
    ));
    expect(document.querySelector(".sui-tooltip__content")!.textContent).toContain(
      "lazy",
    );
  });
});
