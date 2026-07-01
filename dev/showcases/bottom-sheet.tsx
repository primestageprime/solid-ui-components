import { createSignal, type Component } from "solid-js";
import { BottomSheet } from "../../src/components/BottomSheet";

export const BottomSheetShowcase: Component = () => {
  const [open, setOpen] = createSignal(false);

  return (
    <div class="component-section">
      <h2>BottomSheet — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (BottomSheet.css), no component imports. A controlled sheet that
        slides up from the bottom of its <em>parent container</em>. Unlike{" "}
        <code>Modal</code> (viewport portal + fixed overlay), the scrim and sheet
        are <code>position: absolute</code> inside a <code>position: relative</code>{" "}
        parent, so the sheet is bounded to that container and can never cover a
        sibling region above it. Open state is controlled via <code>open</code> +{" "}
        <code>onClose</code>.
      </p>

      <div class="example-group">
        <h3>Bounded container demo</h3>
        <p class="text-meta">
          The phone-frame box below is{" "}
          <code>{"position: relative; overflow: hidden"}</code>. The header strip
          at the top is a sibling in normal flow. Open the sheet and observe: the
          scrim and sheet stay inside the inner container and never reach the
          header strip — the sheet caps at 60% of the inner container's height.
        </p>

        {/*
          Phone-frame: stands in for a bounded app region.
          overflow: hidden hard-clips so nothing bleeds out visually.
        */}
        <div
          style={{
            position: "relative",
            width: "360px",
            height: "480px",
            border: "1px solid var(--sui-border)",
            "border-radius": "var(--sui-radius-md)",
            background: "var(--sui-bg-elevated)",
            overflow: "hidden",
            display: "flex",
            "flex-direction": "column",
          }}
        >
          {/* ── Sibling header strip ABOVE the sheet region ──────────── */}
          <div
            style={{
              "flex-shrink": "0",
              height: "48px",
              "border-bottom": "1px solid var(--sui-border)",
              background: "var(--sui-bg-secondary)",
              display: "flex",
              "align-items": "center",
              padding: "0 16px",
              gap: "8px",
            }}
          >
            <span
              style={{
                "font-size": "12px",
                "font-weight": "600",
                color: "var(--sui-text-primary)",
              }}
            >
              App header (sibling above)
            </span>
            <span
              style={{
                "font-size": "11px",
                color: "var(--sui-text-muted)",
                "margin-left": "auto",
              }}
            >
              never covered
            </span>
          </div>

          {/*
            The inner container hosts the BottomSheet. It is
            `position: relative` (REQUIRED) and `flex: 1` so it fills the
            remaining height below the header strip. The sheet's scrim fills
            `inset: 0` of THIS div — not the viewport, not the phone frame,
            not the header.
          */}
          <div style={{ position: "relative", flex: "1", "min-height": "0" }}>
            {/* Page content — dimmed behind the scrim when sheet is open */}
            <div
              style={{
                padding: "20px 16px",
                display: "flex",
                "flex-direction": "column",
                gap: "10px",
              }}
            >
              <span style={{ "font-size": "13px", color: "var(--sui-text-primary)" }}>
                Page content area
              </span>
              <span style={{ "font-size": "11px", color: "var(--sui-text-muted)" }}>
                The scrim dims this region when the sheet is open, but it stays
                within the inner container — it cannot reach the header above or
                the page outside the frame.
              </span>
              <button
                type="button"
                onClick={() => setOpen(true)}
                style={{
                  "margin-top": "12px",
                  padding: "8px 16px",
                  background: "var(--sui-accent, #00a8cc)",
                  color: "#fff",
                  border: "none",
                  "border-radius": "var(--sui-radius-sm, 4px)",
                  cursor: "pointer",
                  "font-size": "13px",
                  "align-self": "flex-start",
                }}
              >
                Open sheet
              </button>
            </div>

            <BottomSheet open={open()} onClose={() => setOpen(false)} label="Demo sheet">
              <p
                style={{
                  margin: "0 0 12px",
                  "font-size": "14px",
                  color: "var(--sui-text-primary)",
                }}
              >
                Sheet contents
              </p>
              <p
                style={{
                  margin: "0 0 16px",
                  "font-size": "12px",
                  color: "var(--sui-text-secondary)",
                }}
              >
                Tap the grabber at the top or click the scrim (the dimmed area
                behind this panel) to close. Clicking inside the sheet body does
                not dismiss it. The sheet top cannot exceed 60% of the inner
                container, so it never reaches the app header strip above.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "var(--sui-text-secondary)",
                  border: "1px solid var(--sui-border)",
                  "border-radius": "var(--sui-radius-sm, 4px)",
                  cursor: "pointer",
                  "font-size": "12px",
                }}
              >
                Dismiss
              </button>
            </BottomSheet>
          </div>
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
