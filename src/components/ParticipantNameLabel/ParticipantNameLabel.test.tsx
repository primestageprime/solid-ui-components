import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  ParticipantNameLabel,
  createParticipantNameLabel,
} from "./ParticipantNameLabel";

describe("ParticipantNameLabel", () => {
  it("renders the name in a span with the base class", () => {
    const { container } = render(() => (
      <ParticipantNameLabel>Ada</ParticipantNameLabel>
    ));
    const el = container.querySelector("span.sui-participant-name-label")!;
    expect(el.textContent).toBe("Ada");
  });

  it("applies the per-participant color as inline style", () => {
    const { container } = render(() => (
      <ParticipantNameLabel color="rgb(1, 2, 3)">Ada</ParticipantNameLabel>
    ));
    const el = container.querySelector(
      ".sui-participant-name-label",
    ) as HTMLElement;
    expect(el.style.color).toBe("rgb(1, 2, 3)");
  });

  it("omits inline color when no color is given", () => {
    const { container } = render(() => (
      <ParticipantNameLabel>Ada</ParticipantNameLabel>
    ));
    const el = container.querySelector(
      ".sui-participant-name-label",
    ) as HTMLElement;
    expect(el.style.color).toBe("");
  });

  it("merges a caller class", () => {
    const { container } = render(() => (
      <ParticipantNameLabel class="highlight">Ada</ParticipantNameLabel>
    ));
    expect(
      container
        .querySelector(".sui-participant-name-label")!
        .classList.contains("highlight"),
    ).toBe(true);
  });

  it("createParticipantNameLabel bakes a default color", () => {
    const Green = createParticipantNameLabel({ color: "rgb(0, 128, 0)" });
    const { container } = render(() => <Green>Bob</Green>);
    const el = container.querySelector(
      ".sui-participant-name-label",
    ) as HTMLElement;
    expect(el.style.color).toBe("rgb(0, 128, 0)");
  });
});
