import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { TitledTimeRangeHeader } from "./TitledTimeRangeHeader";

const START = "2026-01-01T00:00:00.000Z";
const END = "2026-01-01T02:30:00.000Z";

describe("TitledTimeRangeHeader", () => {
  it("renders the title and computed duration between start and end", () => {
    const { container } = render(() => (
      <TitledTimeRangeHeader title="Session" start={START} end={END} />
    ));
    const root = container.querySelector(".sui-titled-time-range-header")!;
    expect(
      root.querySelector(".sui-titled-time-range-header__title")!.textContent,
    ).toBe("Session");
    expect(
      root.querySelector(".sui-titled-time-range-header__duration")!.textContent,
    ).toBe("(2h 30m)");
  });

  it("renders a badge and asset chip when provided", () => {
    const { container, getByText } = render(() => (
      <TitledTimeRangeHeader
        title="Run"
        start={START}
        end={END}
        badge={<span>ACTIVE</span>}
        assetLabel="pump-3"
      />
    ));
    expect(getByText("ACTIVE")).toBeTruthy();
    expect(
      container.querySelector(".sui-titled-time-range-header__asset")!
        .textContent,
    ).toBe("pump-3");
  });

  it("wraps content in a link when href is set, otherwise a div", () => {
    const { container: linked } = render(() => (
      <TitledTimeRangeHeader title="L" start={START} href="/run/1" />
    ));
    const a = linked.querySelector("a.sui-titled-time-range-header__link")!;
    expect(a.getAttribute("href")).toBe("/run/1");

    const { container: plain } = render(() => (
      <TitledTimeRangeHeader title="P" start={START} />
    ));
    expect(
      plain.querySelector("a.sui-titled-time-range-header__link"),
    ).toBeNull();
    expect(
      plain.querySelector("div.sui-titled-time-range-header__main"),
    ).toBeTruthy();
  });

  it("renders an action slot when provided", () => {
    const { container, getByText } = render(() => (
      <TitledTimeRangeHeader
        title="A"
        start={START}
        action={<button>Stop</button>}
      />
    ));
    expect(
      container.querySelector(".sui-titled-time-range-header__action"),
    ).toBeTruthy();
    expect(getByText("Stop")).toBeTruthy();
  });

  it("formats multi-day spans as `Nd Nh`", () => {
    const { container } = render(() => (
      <TitledTimeRangeHeader
        title="Long"
        start="2026-01-01T00:00:00.000Z"
        end="2026-01-03T05:00:00.000Z"
      />
    ));
    expect(
      container.querySelector(".sui-titled-time-range-header__duration")!
        .textContent,
    ).toBe("(2d 5h)");
  });
});
