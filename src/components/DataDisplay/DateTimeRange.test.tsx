import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { DateTimeRange } from "./DateTimeRange";
import { formatDateTimeRange } from "./formatDateTimeRange";

// The formatting RULE is `formatDateTimeRange`'s, and it has its own test file
// — deliberately, so other Primitives can reuse the rule without composing
// this Composite. What is untested until here is the wiring: that the
// Composite actually delegates, that `mode` reaches the formatter, and that
// `splitProps` consumes exactly the three data props and forwards the rest.
// Those assert against the formatter's own output rather than a literal
// string, so a change to the formatting rule updates in one place.
describe("DateTimeRange — delegation to the formatter", () => {
  const start = "2026-03-02T09:00:00Z";
  const end = "2026-03-04T17:30:00Z";

  it("renders exactly what the formatter returns for a range", () => {
    const { container } = render(() => (
      <DateTimeRange start={start} end={end} />
    ));
    expect(container.textContent).toBe(formatDateTimeRange(start, end));
  });

  it("renders the open-ended form when there is no end", () => {
    const { container } = render(() => <DateTimeRange start={start} />);
    expect(container.textContent).toBe(formatDateTimeRange(start, undefined));
  });

  // `end` is typed `string | null | undefined`; null is the shape an API row
  // actually carries, and it must take the same path as undefined.
  it("treats a null end the same as an absent one", () => {
    const { container } = render(() => (
      <DateTimeRange start={start} end={null} />
    ));
    expect(container.textContent).toBe(formatDateTimeRange(start, null));
  });

  it("passes mode through to the formatter", () => {
    const { container } = render(() => (
      <DateTimeRange start={start} end={end} mode="date" />
    ));
    expect(container.textContent).toBe(formatDateTimeRange(start, end, "date"));
  });
});

describe("DateTimeRange — prop forwarding", () => {
  // splitProps consumes start/end/mode; everything else has to reach the
  // NowrapBody underneath, or a consumer cannot label or target the node.
  it("forwards unconsumed attributes to the rendered element", () => {
    const { container } = render(() => (
      <DateTimeRange
        start="2026-03-02T09:00:00Z"
        id="window"
        data-testid="range"
      />
    ));
    const el = container.querySelector<HTMLElement>("#window");
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-testid")).toBe("range");
  });

  it("does not leak the consumed data props onto the DOM node", () => {
    const { container } = render(() => (
      <DateTimeRange start="2026-03-02T09:00:00Z" id="window" mode="date" />
    ));
    const el = container.querySelector<HTMLElement>("#window");
    expect(el?.getAttribute("start")).toBeNull();
    expect(el?.getAttribute("mode")).toBeNull();
  });
});
