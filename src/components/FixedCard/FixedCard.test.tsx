import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { type FakeSizer, installFakeSizer } from "../../test-utils/fakeSizer";
import { FixedCard, createFixedCard } from ".";

// jsdom does no layout, so a clip is staged by giving the body element the
// scroll/client numbers a browser would report, then firing its observer.
const stageBody = (
  body: Element,
  scrollHeight: number,
  clientHeight: number,
) => {
  Object.defineProperty(body, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(body, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(body, "scrollWidth", {
    configurable: true,
    value: 288,
  });
  Object.defineProperty(body, "clientWidth", {
    configurable: true,
    value: 288,
  });
};
const bodyOf = (container: HTMLElement): Element => {
  const body = container.querySelector(".sui-fixed-card__body");
  if (!body) throw new Error("no body");
  return body;
};
const moreButton = () =>
  screen.queryByRole("button", { name: "More about Roofing" });

describe("FixedCard", () => {
  let sizer: FakeSizer;
  beforeEach(() => {
    sizer = installFakeSizer();
  });
  afterEach(() => sizer.restore());

  it("renders its summary inside a fixed-size card", () => {
    const { container } = render(() => (
      <FixedCard title="Roofing">summary</FixedCard>
    ));
    const card = container.querySelector(".sui-fixed-card");
    expect(card?.classList.contains("sui-fixed-card--md")).toBe(true);
    expect(card?.textContent).toBe("summary");
  });

  it("offers no More button when nothing is clipped and there is no detail", () => {
    render(() => <FixedCard title="Roofing">summary</FixedCard>);
    expect(moreButton()).toBeNull();
  });

  it("always offers More when a detail is given, and it opens the detail", () => {
    render(() => (
      <FixedCard title="Roofing" detail={<p>every job</p>}>
        summary
      </FixedCard>
    ));
    const button = moreButton();
    expect(button).not.toBeNull();
    expect(screen.queryByText("every job")).toBeNull();
    fireEvent.click(button as HTMLElement);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText("every job")).toBeTruthy();
  });

  it("offers More when the summary is clipped, and opens the summary in full", async () => {
    const { container } = render(() => (
      <FixedCard title="Roofing">long summary</FixedCard>
    ));
    const body = bodyOf(container);
    stageBody(body, 400, 180);
    await sizer.resize(body, { width: 288, height: 180 });
    expect(body.classList.contains("sui-fixed-card__body--clipped")).toBe(true);
    fireEvent.click(moreButton() as HTMLElement);
    expect(screen.getAllByText("long summary")).toHaveLength(2);
  });

  it("drops the More button again once the content fits", async () => {
    const { container } = render(() => (
      <FixedCard title="Roofing">summary</FixedCard>
    ));
    const body = bodyOf(container);
    stageBody(body, 400, 180);
    await sizer.resize(body, { width: 288, height: 180 });
    expect(moreButton()).not.toBeNull();
    stageBody(body, 120, 180);
    await sizer.resize(body, { width: 288, height: 200 });
    expect(moreButton()).toBeNull();
  });

  it("opening the modal does not also fire the card's own click", () => {
    let clicks = 0;
    const { container } = render(() => (
      <FixedCard title="Roofing" detail="more" onClick={() => clicks++}>
        summary
      </FixedCard>
    ));
    fireEvent.click(moreButton() as HTMLElement);
    expect(clicks).toBe(0);
    fireEvent.click(container.querySelector(".sui-fixed-card") as HTMLElement);
    expect(clicks).toBe(1);
  });

  it("marks a clickable card, and an active one through Surface", () => {
    const { container } = render(() => (
      <FixedCard title="Roofing" active onClick={() => {}}>
        summary
      </FixedCard>
    ));
    const card = container.querySelector(".sui-fixed-card");
    expect(card?.classList.contains("sui-fixed-card--clickable")).toBe(true);
    expect(card?.classList.contains("surface--active")).toBe(true);
  });

  it("closes the modal from its close button", () => {
    render(() => (
      <FixedCard title="Roofing" detail="every job">
        summary
      </FixedCard>
    ));
    fireEvent.click(moreButton() as HTMLElement);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("createFixedCard produces a curried component with the size baked in", () => {
    const Curried = createFixedCard({ size: "md" });
    const { container } = render(() => (
      <Curried title="Roofing">content</Curried>
    ));
    expect(container.textContent).toBe("content");
  });
});
