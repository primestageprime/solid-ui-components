import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { FramedImage } from "./FramedImage";
import { ContainedPhoto, ContainedPhotoOnDark } from "./variants";

const frame = (container: HTMLElement) => container.querySelector(".sui-framed-image");

describe("FramedImage backdrop", () => {
  it("stays on the themed surface by default", () => {
    const { container } = render(() => <FramedImage src="a.jpg" alt="a" fit="contain" />);
    expect(frame(container)?.classList.contains("sui-framed-image--backdrop-dark")).toBe(false);
  });

  it("takes the dark stage when asked", () => {
    const { container } = render(() => (
      <FramedImage src="a.jpg" alt="a" fit="contain" backdrop="dark" />
    ));
    expect(frame(container)?.classList.contains("sui-framed-image--backdrop-dark")).toBe(true);
  });

  it("bakes the choice into the curried variants", () => {
    const { container: plain } = render(() => <ContainedPhoto src="a.jpg" alt="a" />);
    const { container: dark } = render(() => <ContainedPhotoOnDark src="a.jpg" alt="a" />);
    expect(frame(plain)?.classList.contains("sui-framed-image--backdrop-dark")).toBe(false);
    expect(frame(dark)?.classList.contains("sui-framed-image--backdrop-dark")).toBe(true);
  });
});
