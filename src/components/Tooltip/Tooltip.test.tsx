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

  it("renders the trigger as a button by default", () => {
    const { container } = render(() => (
      <Tooltip content="c">
        <span>t</span>
      </Tooltip>
    ));
    expect(container.querySelector("button.sui-tooltip__trigger")).toBeTruthy();
  });

  /**
   * A link or a button nested inside a button is invalid HTML, and the inner
   * control stops answering clicks. `triggerAs` is how such content keeps its
   * own element and still gets hover text.
   */
  it("renders the trigger as the element the caller names", () => {
    const { container } = render(() => (
      <Tooltip content="c" triggerAs="span">
        <a href="/somewhere">t</a>
      </Tooltip>
    ));
    expect(container.querySelector("button")).toBeNull();
    const trigger = container.querySelector("span.sui-tooltip__trigger");
    expect(trigger).toBeTruthy();
    expect(trigger!.querySelector("a")).toBeTruthy();
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
