import { createSignal, type Component } from "solid-js";
import { BottomSheet } from "../../src/components/BottomSheet";
import { TextBody, MutedBody } from "../../src/components/Text";
import { FillColumnFlush, NarrowStack } from "../../src/components/Layout";

export const BottomSheetShowcase: Component = () => {
  const [open, setOpen] = createSignal(false);

  return (
    <div class="component-section">
      <h2>BottomSheet — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (BottomSheet.css), no component imports. A controlled sheet
        that slides up from the bottom of its <em>parent container</em>. Unlike{" "}
        <code>Modal</code> (viewport portal + fixed overlay), the scrim and
        sheet are <code>position: absolute</code> inside a{" "}
        <code>position: relative</code> parent, so the sheet is bounded to that
        container and can never cover a sibling region above it. Open state is
        controlled via <code>open</code> + <code>onClose</code>.
      </p>

      <div class="example-group">
        <h3>Bounded container demo</h3>
        <p class="text-meta">
          The phone-frame box below is{" "}
          <code>{"position: relative; overflow: hidden"}</code>. The header
          strip at the top is a sibling in normal flow. Open the sheet and
          observe: the scrim and sheet stay inside the inner container and never
          reach the header strip — the sheet caps at 60% of the inner
          container's height.
        </p>

        {/*
          Phone-frame: stands in for a bounded app region.
          overflow: hidden hard-clips so nothing bleeds out visually.
        */}
        <div class="bottom-sheet-demo__frame">
          {/* ── Sibling header strip ABOVE the sheet region ──────────── */}
          <div class="bottom-sheet-demo__header">
            <TextBody>App header (sibling above)</TextBody>
            <MutedBody>never covered</MutedBody>
          </div>

          {/*
            The inner container hosts the BottomSheet. It is
            `position: relative` (REQUIRED) and `flex: 1` so it fills the
            remaining height below the header strip. The sheet's scrim fills
            `inset: 0` of THIS div — not the viewport, not the phone frame,
            not the header.
          */}
          <FillColumnFlush class="bottom-sheet-demo__body">
            {/* Page content — dimmed behind the scrim when sheet is open */}
            <NarrowStack>
              <TextBody>Page content area</TextBody>
              <MutedBody>
                The scrim dims this region when the sheet is open, but it stays
                within the inner container — it cannot reach the header above or
                the page outside the frame.
              </MutedBody>
              <button
                class="demo-btn"
                type="button"
                onClick={() => setOpen(true)}
              >
                Open sheet
              </button>
            </NarrowStack>

            <BottomSheet
              open={open()}
              onClose={() => setOpen(false)}
              label="Demo sheet"
            >
              <NarrowStack>
                <TextBody>Sheet contents</TextBody>
                <MutedBody>
                  Tap the grabber at the top or click the scrim (the dimmed area
                  behind this panel) to close. Clicking inside the sheet body
                  does not dismiss it. The sheet top cannot exceed 60% of the
                  inner container, so it never reaches the app header strip
                  above.
                </MutedBody>
                <button
                  class="demo-btn"
                  type="button"
                  onClick={() => setOpen(false)}
                >
                  Dismiss
                </button>
              </NarrowStack>
            </BottomSheet>
          </FillColumnFlush>
        </div>
        <div class="text-meta">
          Dismiss paths: grabber tap, or a direct click on the scrim. A click on
          the sheet body is ignored. Placement and bounding are the container's
          job — the parent must be <code>position: relative</code>.
        </div>
      </div>
    </div>
  );
};
