import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { fireEvent, render } from "@solidjs/testing-library";
import { MdAvatar } from ".";

describe("ParticipantAvatar", () => {
  it("renders initials without an image and the image when imageSrc is set", () => {
    const { container: a } = render(() => <MdAvatar initials="PS" />);
    expect(a.textContent).toBe("PS");
    const { container: b } = render(() => (
      <MdAvatar initials="PS" imageSrc="https://x.test/p.jpg" />
    ));
    expect(b.querySelector("img")?.getAttribute("src")).toBe(
      "https://x.test/p.jpg",
    );
    expect(b.querySelector("img")?.hasAttribute("referrerpolicy")).toBe(false);
  });

  it("forwards referrerPolicy to the img", () => {
    const { container } = render(() => (
      <MdAvatar
        initials="PS"
        imageSrc="https://lh3.googleusercontent.com/a/x"
        referrerPolicy="no-referrer"
      />
    ));
    expect(container.querySelector("img")?.getAttribute("referrerpolicy")).toBe(
      "no-referrer",
    );
  });

  it("falls back to initials when the image fails, calls onImageError, and retries a new src", () => {
    const onImageError = vi.fn();
    const [src, setSrc] = createSignal("https://x.test/broken.jpg");
    const { container } = render(() => (
      <MdAvatar initials="PS" imageSrc={src()} onImageError={onImageError} />
    ));
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(onImageError).toHaveBeenCalledTimes(1);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("PS");
    setSrc("https://x.test/fixed.jpg");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://x.test/fixed.jpg",
    );
  });
});
