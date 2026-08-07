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
import { type Component, type JSX, For, Show, createEffect, createSignal, on, onCleanup, splitProps } from "solid-js";
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
  /** Opt-in per-instance: instead of hard-cutting to a new `src`, the
   *  incoming image fades in over the outgoing one (a dissolve/crossfade)
   *  — for a slideshow or any view where `src` changes while the frame
   *  stays mounted. Off by default; every existing single-`<img>` call
   *  site is unaffected. Respects `prefers-reduced-motion` (instant swap,
   *  no animation). */
  crossfade?: boolean;
  /** Crossfade duration in ms. Default 600. Ignored without `crossfade`. */
  crossfadeDurationMs?: number;
  /** What shows THROUGH a "contain" fit — the letterbox bars either side of
   *  an image whose aspect ratio doesn't match its frame.
   *    • "surface" (default) — `--sui-bg-tertiary`, i.e. the frame reads as
   *      part of the themed UI. Right for a thumbnail or an inline figure.
   *    • "dark" — a fixed near-black stage, deliberately theme-INDEPENDENT,
   *      for a photo-viewer/lightbox context where the point is that nothing
   *      but the photo has colour. Same reasoning every lightbox on the web
   *      goes near-black rather than following page chrome.
   *  Compile-time shape, like `fit` — pick it in a curried variant (see
   *  variants.tsx's ContainedPhotoOnDark), not per call site. */
  backdrop?: "surface" | "dark";
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
    "crossfade",
    "crossfadeDurationMs",
    "backdrop",
    "class",
  ]);

  const classes = () => {
    const c = ["sui-framed-image", `sui-framed-image--${local.fit}`];
    if (local.squareSize != null) c.push("sui-framed-image--square");
    if (local.backdrop === "dark") c.push("sui-framed-image--backdrop-dark");
    if (instant()) c.push("sui-framed-image--rotate-instant");
    if (local.crossfade) c.push("sui-framed-image--crossfade");
    if (local.class) c.push(local.class);
    return c.join(" ");
  };

  // ── Rotation: what's ON SCREEN vs what's been asked for ────────────────────
  // These diverge in exactly one situation, and it's the important one: a
  // rotate preview being COMMITTED. The consumer applies the edit, gets back
  // image bytes that are already rotated, and swaps `src` while dropping
  // `rotationDegrees` back to 0 — correct, but the browser goes on showing
  // the OLD (unrotated) bytes until the new ones decode, so the 0.15s
  // transform transition plays a second, backwards rotation over them.
  // Confirmed live in bestie: apply a 90° rotate and the photo visibly
  // rotates back before landing right way up.
  //
  // So: a rotation change that arrives WITH new bytes isn't an interaction to
  // animate, it's a replacement. Hold the current orientation until the
  // incoming image has loaded, then set the new one with the transition
  // suppressed for that frame. A rotation change on its own (pressing rotate)
  // still animates exactly as before.
  let frameRef: HTMLDivElement | undefined;
  const [appliedRotation, setAppliedRotation] = createSignal(local.rotationDegrees ?? 0);
  const [instant, setInstant] = createSignal(false);
  // Set the moment `src` changes, cleared when that image reports back.
  let awaitingBytes = false;

  // Declared BEFORE the rotation effect below so it runs first when both
  // change together — Solid runs effects in creation order, and this one has
  // to have raised the flag before the other decides whether to animate.
  createEffect(
    on(
      () => local.src,
      () => {
        awaitingBytes = true;
      },
      { defer: true },
    ),
  );

  createEffect(
    on(
      () => local.rotationDegrees ?? 0,
      (deg) => {
        if (awaitingBytes) return; // held until the new bytes land
        setInstant(false);
        setAppliedRotation(deg);
      },
      { defer: true },
    ),
  );

  // Both load and error settle it: an image that never arrives must not
  // freeze the frame at an orientation its consumer has already moved on from.
  const onBytesSettled = () => {
    if (!awaitingBytes) return;
    awaitingBytes = false;
    const deg = local.rotationDegrees ?? 0;
    if (deg === appliedRotation()) return;
    setInstant(true);
    setAppliedRotation(deg);
    // Forced reflow between disabling the transition and re-enabling it, and
    // NOT a requestAnimationFrame. rAF callbacks run before the frame's style
    // recalc, so re-enabling there means the browser never recalculates
    // anything while the transition is off — it just sees transform go 90deg
    // -> 0deg with the transition back on, and animates exactly what this is
    // here to prevent (observed live in bestie: the rotate-and-write flow
    // still played the backwards spin). Reading offsetWidth forces that
    // recalc synchronously, which commits the new transform as the baseline;
    // re-enabling afterwards then has nothing left to animate, and the next
    // plain rotate press still animates normally. Solid applies both signal
    // writes above to the DOM synchronously, so by this line the element
    // really is carrying the class and the new value.
    void frameRef?.offsetWidth;
    setInstant(false);
  };

  // The only per-instance geometry: which fixed px size, when squared, and
  // which preview rotation, when set. Single custom properties, not a style
  // override of anything the component itself owns — the component's own
  // CSS still owns every other rule (overflow, border-radius, background,
  // object-fit).
  const cssVars = (): JSX.CSSProperties => {
    const vars: Record<string, string> = {};
    if (local.squareSize != null) vars["--sui-framed-image-size"] = `${local.squareSize}px`;
    if (appliedRotation()) vars["--sui-framed-image-rotation"] = `${appliedRotation()}deg`;
    if (local.crossfadeDurationMs != null) {
      vars["--sui-framed-image-crossfade-duration"] = `${local.crossfadeDurationMs}ms`;
    }
    return vars as JSX.CSSProperties;
  };

  // Crossfade keeps up to two stacked <img> layers (position:absolute via
  // the --crossfade modifier class, see FramedImage.css): the outgoing src
  // sits underneath at full opacity, the incoming one plays a one-shot
  // fade-in over it, then the old layer is dropped once the fade's done —
  // never accumulates beyond two. Seeded with the initial src so the FIRST
  // render never fades against nothing.
  const [layers, setLayers] = createSignal<{ src: string; alt: string; key: number }[]>(
    local.crossfade ? [{ src: local.src, alt: local.alt, key: 0 }] : [],
  );
  let nextLayerKey = 1;
  createEffect(() => {
    const src = local.src;
    // Captured HERE, once, into the layer itself — not read live from
    // `local.alt` at render time. `local.alt` updates the INSTANT props
    // change, same tick as `src`, so a shared live read would relabel the
    // OUTGOING layer with the INCOMING photo's alt text for the whole
    // crossfade — its pixels are still the old photo, its accessible name
    // would already say the new one. Confirmed live: DOM inspection during
    // a crossfade showed both stacked <img> tags reporting the new alt
    // before this fix, despite the bottom layer's `src` still being the
    // old image.
    const alt = local.alt;
    if (!local.crossfade) return;
    setLayers((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].src === src) return prev;
      return [...prev, { src, alt, key: nextLayerKey++ }];
    });
    const duration = local.crossfadeDurationMs ?? 600;
    const timer = setTimeout(() => {
      setLayers((prev) => (prev.length > 1 ? prev.slice(-1) : prev));
    }, duration + 50);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <div ref={frameRef} class={classes()} style={cssVars()}>
      <Show
        when={local.crossfade}
        fallback={
          <img
            src={local.src}
            alt={local.alt}
            onLoad={onBytesSettled}
            onError={onBytesSettled}
          />
        }
      >
        <For each={layers()}>
          {(layer, i) => (
            <img
              src={layer.src}
              alt={layer.alt}
              classList={{
                "sui-framed-image__layer--entering": i() === layers().length - 1 && layers().length > 1,
              }}
            />
          )}
        </For>
      </Show>
      {local.overlay}
    </div>
  );
};
