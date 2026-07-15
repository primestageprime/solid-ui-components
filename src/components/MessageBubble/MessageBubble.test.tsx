import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { createMessageBubble } from "./MessageBubble";
import { SelfBubble, OtherBubble } from "./variants";

describe("MessageBubble", () => {
  it("renders the message text inside the bubble", () => {
    const Bubble = createMessageBubble({});
    const { container } = render(() => <Bubble>hi there</Bubble>);
    const root = container.querySelector(".sui-message-bubble")!;
    expect(root.querySelector(".sui-message-bubble__text")!.textContent).toBe(
      "hi there",
    );
  });

  it("SelfBubble bakes the self variant; OtherBubble stays recessed", () => {
    const { container } = render(() => (
      <>
        <SelfBubble>me</SelfBubble>
        <OtherBubble>them</OtherBubble>
      </>
    ));
    const bubbles = container.querySelectorAll(".sui-message-bubble");
    expect(bubbles[0].classList.contains("sui-message-bubble--self")).toBe(true);
    expect(bubbles[1].classList.contains("sui-message-bubble--self")).toBe(
      false,
    );
  });

  it("applies bg and textColor as inline style overrides", () => {
    const Bubble = createMessageBubble({});
    const { container } = render(() => (
      <Bubble bg="rgb(10, 20, 30)" textColor="rgb(200, 200, 200)">
        x
      </Bubble>
    ));
    const root = container.querySelector(".sui-message-bubble") as HTMLElement;
    expect(root.style.backgroundColor).toBe("rgb(10, 20, 30)");
    expect(root.style.color).toBe("rgb(200, 200, 200)");
  });

  it("becomes a button role and fires onClick when interactive", () => {
    const onClick = vi.fn();
    const Bubble = createMessageBubble({});
    const { container } = render(() => <Bubble onClick={onClick}>tap</Bubble>);
    const root = container.querySelector(".sui-message-bubble") as HTMLElement;
    expect(root.getAttribute("role")).toBe("button");
    expect(root.getAttribute("tabindex")).toBe("0");
    fireEvent.click(root);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("Enter key activates a clickable bubble", () => {
    const onClick = vi.fn();
    const Bubble = createMessageBubble({});
    const { container } = render(() => <Bubble onClick={onClick}>tap</Bubble>);
    const root = container.querySelector(".sui-message-bubble") as HTMLElement;
    fireEvent.keyDown(root, { key: "Enter" });
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("stays non-interactive (no role/tabindex) without onClick", () => {
    const Bubble = createMessageBubble({});
    const { container } = render(() => <Bubble>plain</Bubble>);
    const root = container.querySelector(".sui-message-bubble")!;
    expect(root.getAttribute("role")).toBeNull();
    expect(root.getAttribute("tabindex")).toBeNull();
  });
});
