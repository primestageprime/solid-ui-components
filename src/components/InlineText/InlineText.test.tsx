import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { InlineText } from "./index";

describe("InlineText", () => {
  it("renders a bare span with no class of its own (styleless → inherits typography)", () => {
    const { container } = render(() => <InlineText>42</InlineText>);
    const span = container.firstElementChild as HTMLElement;
    expect(span.tagName).toBe("SPAN");
    expect(span.getAttribute("class")).toBeNull();
    expect(span.textContent).toBe("42");
  });

  it("applies a data-driven color inline when provided", () => {
    const { container } = render(() => (
      <InlineText color="var(--sui-text-muted)">0</InlineText>
    ));
    expect((container.firstElementChild as HTMLElement).style.color).toBe(
      "var(--sui-text-muted)",
    );
  });

  it("sets no inline color when color is omitted (inherits)", () => {
    const { container } = render(() => <InlineText>123</InlineText>);
    expect((container.firstElementChild as HTMLElement).style.color).toBe("");
  });

  it("passes through standard span attributes", () => {
    const { container } = render(() => (
      <InlineText title="tip" data-testid="cell">
        x
      </InlineText>
    ));
    const span = container.firstElementChild as HTMLElement;
    expect(span.getAttribute("title")).toBe("tip");
    expect(span.getAttribute("data-testid")).toBe("cell");
  });
});
