import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  ParticipantTimeLabel,
  createParticipantTimeLabel,
} from "./ParticipantTimeLabel";

describe("ParticipantTimeLabel", () => {
  it("renders the relative-time caption in a span with the base class", () => {
    const { container } = render(() => (
      <ParticipantTimeLabel>2m ago</ParticipantTimeLabel>
    ));
    const el = container.querySelector("span.sui-participant-time-label")!;
    expect(el.textContent).toBe("2m ago");
  });

  it("exposes the full timestamp via the title attribute", () => {
    const { container } = render(() => (
      <ParticipantTimeLabel title="2026-07-14 10:00">
        2m ago
      </ParticipantTimeLabel>
    ));
    expect(
      container
        .querySelector(".sui-participant-time-label")!
        .getAttribute("title"),
    ).toBe("2026-07-14 10:00");
  });

  it("merges a caller class", () => {
    const { container } = render(() => (
      <ParticipantTimeLabel class="muted">now</ParticipantTimeLabel>
    ));
    expect(
      container
        .querySelector(".sui-participant-time-label")!
        .classList.contains("muted"),
    ).toBe(true);
  });

  it("createParticipantTimeLabel bakes a default class", () => {
    const Stamp = createParticipantTimeLabel({ class: "stamp" });
    const { container } = render(() => <Stamp>1h</Stamp>);
    expect(
      container
        .querySelector(".sui-participant-time-label")!
        .classList.contains("stamp"),
    ).toBe(true);
  });
});
