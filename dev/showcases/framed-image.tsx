import { type Component, createSignal } from "solid-js";
import {
  FramedImage,
  SmallSquareThumbnail,
  MediumSquareThumbnail,
  ContainedPhoto,
  ContainedPhotoOnDark,
} from "../../src/components/FramedImage";
import { Row } from "../../src/components/Layout/Row";
import { Stack } from "../../src/components/Layout/Stack";

// Inline SVG data URIs rather than real files: a showcase should not depend on
// the network or on binary assets in the repo, and what these examples are
// demonstrating is the FRAME (fit, backdrop, letterboxing), which only needs
// images whose aspect ratios clearly differ from their container's.
const wide = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120"><rect width="320" height="120" fill="#4a7fb5"/><text x="160" y="66" font-family="sans-serif" font-size="18" fill="white" text-anchor="middle">320 x 120</text></svg>`,
)}`;
const tall = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="320"><rect width="120" height="320" fill="#b5734a"/><text x="60" y="166" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">120 x 320</text></svg>`,
)}`;

// The rotate-preview lifecycle, end to end: press rotate (preview only, and
// it animates), then commit (new bytes + rotation back to 0 together, and it
// must NOT animate). Kept as its own component so the demo owns its state.
const RotationCommitDemo: Component = () => {
  const [rotation, setRotation] = createSignal(0);
  const [src, setSrc] = createSignal(tall);
  const commit = () => {
    // Stands in for "the backend returned rotated bytes": a different image,
    // arriving at the same moment the preview rotation is dropped.
    setSrc(rotation() % 180 === 0 ? tall : wide);
    setRotation(0);
  };
  return (
    <Stack gap="sm">
      <Row gap="md" align="stretch" class="framed-image-demo">
        <ContainedPhoto src={src()} alt="Rotation preview" rotationDegrees={rotation()} />
      </Row>
      <Row gap="sm" align="center">
        <button type="button" id="demo-rotate" onClick={() => setRotation((r: number) => r + 90)}>
          Rotate 90°
        </button>
        <button type="button" id="demo-commit" onClick={commit}>
          Commit
        </button>
        <span class="text-meta">rotationDegrees = {rotation()}</span>
      </Row>
    </Stack>
  );
};

/**
 * FramedImage showcase — the frame around real photographic content: which
 * fit mode, which backdrop shows through the letterbox bars, and the curried
 * variants that bake those choices.
 */
export const FramedImageShowcase: Component = () => (
  <div class="component-section">
    <h2>FramedImage — Atomic (Depth 1)</h2>
    <p class="text-meta">
      A CSS-owned frame around a plain &lt;img&gt;: fixed-size and cropped
      ("cover") for thumbnails, or filling its container and letterboxed
      ("contain") for a detail view. Pick a shape via the curried variants
      rather than passing `fit` at a call site.
    </p>

    <div class="example-group">
      <h3>Square thumbnails (cover — cropped to fill)</h3>
      <Row gap="sm" align="center">
        <SmallSquareThumbnail src={wide} alt="Wide image in a 56px frame" />
        <MediumSquareThumbnail src={tall} alt="Tall image in a 120px frame" />
      </Row>
    </div>

    <div class="example-group">
      <h3>ContainedPhoto vs ContainedPhotoOnDark (contain — whole image, letterboxed)</h3>
      <p class="text-meta">
        Both fill their container and show the whole image. The difference is
        what fills the bars either side of it: the themed surface
        (--sui-bg-tertiary) by default, or a fixed near-black stage with
        backdrop="dark" — for a photo viewer, where the photo should be the
        only thing on screen with colour in it.
      </p>
      <Row gap="md" align="stretch" class="framed-image-demo">
        <Stack gap="xs">
          <span class="text-meta">ContainedPhoto</span>
          <ContainedPhoto src={tall} alt="Tall image on the themed surface" />
        </Stack>
        <Stack gap="xs">
          <span class="text-meta">ContainedPhotoOnDark</span>
          <ContainedPhotoOnDark src={tall} alt="Tall image on a dark stage" />
        </Stack>
      </Row>
    </div>

    <div class="example-group">
      <h3>Rotation preview</h3>
      <p class="text-meta">
        rotationDegrees previews an accumulated, not-yet-applied rotate edit —
        threaded as a custom property the component's own CSS consumes, never a
        call-site style prop.
      </p>
      <Row gap="sm" align="center">
        <SmallSquareThumbnail src={wide} alt="Unrotated" />
        <SmallSquareThumbnail src={wide} alt="Rotated 90 degrees" rotationDegrees={90} />
      </Row>
    </div>

    <div class="example-group">
      <h3>Committing a rotation</h3>
      <p class="text-meta">
        The case rotationDegrees exists to serve: a preview being written to
        disk. "Commit" swaps in new bytes (already rotated) and drops the
        preview rotation to 0 in one go — the frame holds the old orientation
        until the new bytes load, then applies the change with no transition,
        so the photo never rotates a second time.
      </p>
      <RotationCommitDemo />
    </div>

    <div class="example-group">
      <h3>Overlay slot</h3>
      <p class="text-meta">
        Arbitrary content stacked over the image, filling the frame (the frame
        is position:relative for exactly this) — e.g. CropRectOverlay.
      </p>
      <Row gap="sm" align="center">
        <FramedImage
          src={wide}
          alt="With an overlay badge"
          fit="cover"
          squareSize={120}
          overlay={<span class="text-meta">overlay</span>}
        />
      </Row>
    </div>
  </div>
);
