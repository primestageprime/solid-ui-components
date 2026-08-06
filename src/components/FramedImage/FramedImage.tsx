// ============================================
// FramedImage — Atomic (Depth 1)
// Owns CSS (FramedImage.css), no component imports.
//
// Real photographic content needs a plain `<img>` — no design system should
// stylize the image bytes themselves — but the FRAME around it (size,
// overflow, fit) is a design decision like any other, and belongs in
// component-owned CSS, not a call-site `style` prop. This extracts the
// pattern `MediaCard` already uses internally (`.sui-media-card__thumbnail`:
// a fixed box, `overflow:hidden`, `object-fit:cover` on the child `<img>`)
// into a standalone primitive so any consumer gets it without depending on
// the whole card.
//
// Two fit modes:
//   • "cover" — fills the frame, cropping overflow. For a thumbnail/avatar
//     slot where the frame's aspect ratio is fixed and content may not match.
//   • "contain" — fits the whole image inside the frame, letterboxing if the
//     aspect ratios differ. For a primary/detail view where nothing about
//     the source image should be cropped away.
//
// NO curried size — unlike Placeholder's sm/md/lg tile presets, an image's
// frame size is answered by "does it need to be square (a thumbnail) or
// fill its container (a detail view)", not a fixed px scale. See variants.ts
// for the two shapes that answer that: SquareThumbnail (fixed, cover) and
// ContainedPhoto (fills container, contain).
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import "./FramedImage.css";

export type ImageFit = "cover" | "contain";

export interface FramedImageProps {
  src: string;
  alt: string;
  /** Compile-time shape — use the curried SquareThumbnail/ContainedPhoto
   *  variants at call sites, not this prop directly. */
  fit: ImageFit;
  /** Compile-time shape — locked square size in px (thumbnail use). Omit
   *  for a frame that fills its container instead (detail-view use). */
  squareSize?: number;
  /** Per-instance preview rotation in degrees — for showing an accumulated,
   *  not-yet-applied rotate edit before it's committed to real pixels.
   *  Threaded the same way as squareSize: a CSS custom property the
   *  component's own stylesheet consumes, never a call-site style prop. */
  rotationDegrees?: number;
  /** Arbitrary content stacked over the image, filling the frame — e.g. a
   *  CropRectOverlay. The frame is `position: relative` for exactly this;
   *  an overlay component positions itself `absolute; inset: 0` in its own
   *  CSS to fill it. */
  overlay?: JSX.Element;
  class?: string;
}

export const FramedImage: Component<FramedImageProps> = (props) => {
  const [local] = splitProps(props, [
    "src",
    "alt",
    "fit",
    "squareSize",
    "rotationDegrees",
    "overlay",
    "class",
  ]);

  const classes = () => {
    const c = ["sui-framed-image", `sui-framed-image--${local.fit}`];
    if (local.squareSize != null) c.push("sui-framed-image--square");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };

  // The only per-instance geometry: which fixed px size, when squared, and
  // which preview rotation, when set. Single custom properties, not a style
  // override of anything the component itself owns — the component's own
  // CSS still owns every other rule (overflow, border-radius, background,
  // object-fit).
  const cssVars = (): JSX.CSSProperties => {
    const vars: Record<string, string> = {};
    if (local.squareSize != null) vars["--sui-framed-image-size"] = `${local.squareSize}px`;
    if (local.rotationDegrees) vars["--sui-framed-image-rotation"] = `${local.rotationDegrees}deg`;
    return vars as JSX.CSSProperties;
  };

  return (
    <div class={classes()} style={cssVars()}>
      <img src={local.src} alt={local.alt} />
      {local.overlay}
    </div>
  );
};
