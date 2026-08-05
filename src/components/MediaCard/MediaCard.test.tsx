import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { MediaCard } from "./index";

describe("MediaCard", () => {
  it("renders the required thumbnail and identifier regions", () => {
    const { container, getByText } = render(() => (
      <MediaCard thumbnail={<img src="x.jpg" alt="" />} identifier="sunset-beach-04.jpg" />
    ));
    expect(getByText("sunset-beach-04.jpg")).toBeTruthy();
    expect(container.querySelector(".sui-media-card__thumbnail img")).toBeTruthy();
  });

  it("sets filename as a title tooltip on the identifier region when given", () => {
    const { container } = render(() => (
      <MediaCard
        thumbnail={<img src="x.jpg" alt="" />}
        identifier="Sunset at the pier"
        filename="sunset-beach-04.jpg"
      />
    ));
    const id = container.querySelector(".sui-media-card__id") as HTMLElement;
    expect(id.getAttribute("title")).toBe("sunset-beach-04.jpg");
  });

  it("omits the title attribute when filename is absent", () => {
    const { container } = render(() => (
      <MediaCard thumbnail={<img src="x.jpg" alt="" />} identifier="x.jpg" />
    ));
    const id = container.querySelector(".sui-media-card__id") as HTMLElement;
    expect(id.hasAttribute("title")).toBe(false);
  });

  it("omits the tags row when tags is absent or empty", () => {
    const { container } = render(() => (
      <MediaCard thumbnail={<img src="x.jpg" alt="" />} identifier="x" tags={[]} />
    ));
    expect(container.querySelector(".sui-media-card__tags")).toBeNull();
  });

  it("renders each tag as a real TagPill", () => {
    const { container, getByText } = render(() => (
      <MediaCard
        thumbnail={<img src="x.jpg" alt="" />}
        identifier="x"
        tags={[{ label: "sunset" }, { label: "beach" }]}
      />
    ));
    expect(getByText("sunset")).toBeTruthy();
    expect(getByText("beach")).toBeTruthy();
    expect(container.querySelectorAll(".sui-media-card__tags .sui-tag-pill").length).toBe(2);
  });

  it("wraps tags as clickable buttons only when onTagClick is given, and stops propagation", () => {
    let tagClicks = 0;
    let cardClicks = 0;
    const { container } = render(() => (
      <MediaCard
        thumbnail={<img src="x.jpg" alt="" />}
        identifier="x"
        tags={[{ label: "sunset" }]}
        onClick={() => (cardClicks += 1)}
        onTagClick={() => (tagClicks += 1)}
      />
    ));
    const tagButton = container.querySelector(".sui-media-card__tag") as HTMLElement;
    expect(tagButton).toBeTruthy();
    fireEvent.click(tagButton);
    expect(tagClicks).toBe(1);
    expect(cardClicks).toBe(0);
  });

  it("omits the timing region when timing is absent or empty", () => {
    const { container } = render(() => (
      <MediaCard thumbnail={<img src="x.jpg" alt="" />} identifier="x" timing="" />
    ));
    expect(container.querySelector(".sui-media-card__timing")).toBeNull();
  });

  it("renders timing when present", () => {
    const { container, getByText } = render(() => (
      <MediaCard thumbnail={<img src="x.jpg" alt="" />} identifier="x" timing="2026-08-04 14:32" />
    ));
    expect(container.querySelector(".sui-media-card__timing")).toBeTruthy();
    expect(getByText("2026-08-04 14:32")).toBeTruthy();
  });

  it("exposes button semantics and pressed state only when clickable", () => {
    const { container } = render(() => (
      <MediaCard thumbnail={<img src="x.jpg" alt="" />} identifier="x" selected onClick={() => {}} />
    ));
    const card = container.querySelector(".sui-media-card") as HTMLElement;
    expect(card.getAttribute("role")).toBe("button");
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(card.classList.contains("sui-media-card--selected")).toBe(true);
  });

  it("fires onClick via keyboard (Enter) when interactive", () => {
    let clicks = 0;
    const { container } = render(() => (
      <MediaCard thumbnail={<img src="x.jpg" alt="" />} identifier="x" onClick={() => (clicks += 1)} />
    ));
    const card = container.querySelector(".sui-media-card") as HTMLElement;
    fireEvent.keyDown(card, { key: "Enter" });
    expect(clicks).toBe(1);
  });

  it("renders the remove control and stops propagation to onClick", () => {
    let clicks = 0;
    let removed = 0;
    const { container } = render(() => (
      <MediaCard
        thumbnail={<img src="x.jpg" alt="" />}
        identifier="x"
        onClick={() => (clicks += 1)}
        onRemove={() => (removed += 1)}
      />
    ));
    const remove = container.querySelector(".sui-media-card__remove") as HTMLElement;
    expect(remove).toBeTruthy();
    fireEvent.click(remove);
    expect(removed).toBe(1);
    expect(clicks).toBe(0);
  });
});
