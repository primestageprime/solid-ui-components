import { render, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { FramedImage } from "./FramedImage";
import { ContainedPhoto, ContainedPhotoOnDark } from "./variants";

const frame = (container: HTMLElement) => container.querySelector(".sui-framed-image");
const rotationOf = (container: HTMLElement) =>
  (frame(container) as HTMLElement).style.getPropertyValue("--sui-framed-image-rotation");
const isInstant = (container: HTMLElement) =>
  frame(container)!.classList.contains("sui-framed-image--rotate-instant");

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

describe("FramedImage rotation", () => {
  it("applies a rotation change on its own, animated", () => {
    const [deg, setDeg] = createSignal(0);
    const { container } = render(() => (
      <FramedImage src="a.jpg" alt="a" fit="contain" rotationDegrees={deg()} />
    ));
    setDeg(90);
    expect(rotationOf(container)).toBe("90deg");
    expect(isInstant(container)).toBe(false);
  });

  it("holds the current orientation when a rotation arrives WITH new bytes", () => {
    // The commit case: the transformed file is already rotated, so the
    // consumer swaps src and drops the preview rotation in one go. Animating
    // that would rotate the OLD, still-displayed pixels back to 0 first.
    const [src, setSrc] = createSignal("before.jpg");
    const [deg, setDeg] = createSignal(90);
    const { container } = render(() => (
      <FramedImage src={src()} alt="a" fit="contain" rotationDegrees={deg()} />
    ));
    expect(rotationOf(container)).toBe("90deg");

    setSrc("after.jpg");
    setDeg(0);
    // Still rotated: the new bytes haven't decoded, so the old ones are what's
    // on screen and they still need the transform.
    expect(rotationOf(container)).toBe("90deg");

    fireEvent.load(container.querySelector("img")!);
    expect(rotationOf(container)).toBe("");
    // The suppression is released in the SAME tick, after a forced reflow —
    // deferring it to a rAF would re-enable the transition before the browser
    // ever recalculated style with it off, which animates the very change
    // this suppresses.
    expect(isInstant(container)).toBe(false);
  });

  it("settles on error too, rather than freezing at a stale orientation", () => {
    const [src, setSrc] = createSignal("before.jpg");
    const [deg, setDeg] = createSignal(90);
    const { container } = render(() => (
      <FramedImage src={src()} alt="a" fit="contain" rotationDegrees={deg()} />
    ));
    setSrc("missing.jpg");
    setDeg(0);
    fireEvent.error(container.querySelector("img")!);
    expect(rotationOf(container)).toBe("");
  });
});
