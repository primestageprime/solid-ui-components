// Curried FramedImage variants — the correct call-site form (fit/size baked
// in, matching the same currying rule as Placeholder's Small/Medium/Large).
import type { Component } from "solid-js";
import { FramedImage, type FramedImageProps } from "./FramedImage";

export type FramedImageDataProps = Pick<
  FramedImageProps,
  "src" | "alt" | "class" | "rotationDegrees" | "overlay" | "crossfade" | "crossfadeDurationMs"
>;

function createFramedImage(
  defaults: Pick<FramedImageProps, "fit" | "squareSize" | "backdrop">,
): Component<FramedImageDataProps> {
  return (props) => <FramedImage {...defaults} {...props} />;
}

/** 56px square, cropped to fill — a compact list-row thumbnail (matches
 *  MediaCard's own thumbnail frame size). */
export const SmallSquareThumbnail = createFramedImage({ fit: "cover", squareSize: 56 });

/** 120px square, cropped to fill — a larger thumbnail slot. */
export const MediumSquareThumbnail = createFramedImage({ fit: "cover", squareSize: 120 });

/** Fills its container, showing the whole image (letterboxed if the aspect
 *  ratio doesn't match) — a primary/detail photo view where nothing should
 *  be cropped away. */
export const ContainedPhoto = createFramedImage({ fit: "contain" });

/** ContainedPhoto on a fixed near-black stage — the letterbox bars either
 *  side of a photo whose aspect ratio doesn't match the frame stay neutral
 *  instead of taking the theme's surface colour. For a photo viewer /
 *  lightbox / detail pane, where the photo should be the only thing on
 *  screen with colour in it. */
export const ContainedPhotoOnDark = createFramedImage({ fit: "contain", backdrop: "dark" });
