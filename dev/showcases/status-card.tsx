/**
 * StatusCard — a dense 3-row status card (Depth 2):
 *   Row 1: name (ellipsised, hover-full title) + status badge slot
 *   Row 2: wrapped detail that fills to the bottom-pinned meta row, clamped
 *          with a "more" popover affordance
 *   Row 3: a left / center / right meta strip (claimed-by / progress / estimate)
 *
 * The card chrome (border + background) is delegated to Surface via the
 * --surface-bg / --surface-border custom properties, so the hover / active /
 * selected states below re-tint through the cascade. The active + clickable
 * cards exercise that re-tint mechanism directly.
 */
import { type Component, createSignal } from "solid-js";
import { StatusCard } from "../../src/components/Card";
import { SecondaryButton } from "../../src/components/Button";
import { SuccessTag } from "../../src/components/Text";

const Slot: Component<{ children: any }> = (props) => (
  <div class="status-card-demo__slot">{props.children}</div>
);

const Grid: Component<{ children: any }> = (props) => (
  <div class="status-card-demo__grid">{props.children}</div>
);

// A tiny status pill so the row-1 badge slot has realistic content.
const Pill: Component<{ text: string; tone?: string }> = (props) => (
  <span
    class="status-card-demo__pill"
    style={props.tone ? { "border-color": props.tone, color: props.tone } : undefined}
  >
    {props.text}
  </span>
);

const LOREM =
  "Salaries land uncategorized in the forecast. Add a category so the projection splits contractor costs from staff, then backfill the prior three months so the trend line is continuous rather than jumping at the boundary.";

export const StatusCardShowcase: Component = () => {
  const [selected, setSelected] = createSignal(true);
  return (
    <div class="component-section">
      <h2>StatusCard — 3-row status card (Depth 2)</h2>
      <p class="text-meta">
        Composes Surface (card chrome) + Text + Button. Row 2 fills the space
        between the title and the bottom-pinned meta row; the hover / active /
        selected states re-tint the card through Surface's --surface-bg /
        --surface-border custom properties.
      </p>

      <div class="example-group">
        <h3>States</h3>
        <Grid>
          <Slot>
            <StatusCard
              name="need category for salaries"
              status={<Pill text="TODO" />}
              description="Salaries land uncategorized in the forecast — add a category so it splits out."
              claimedBy={<span>Ryan</span>}
              estimate={<span>2d</span>}
            />
          </Slot>

          <Slot>
            <StatusCard
              name="active / selected (re-tint)"
              status={<Pill text="DOING" tone="var(--sui-accent)" />}
              description="This card is active — the accent border + wash come from --surface-* custom props set by .sui-status-card--active."
              active
              claimedBy={<span>Ana</span>}
              estimate={<span>1d</span>}
            />
          </Slot>

          <Slot>
            <StatusCard
              name="clickable (hover to re-tint border)"
              status={<Pill text="TODO" />}
              description="Hovering a clickable card lights the border via --surface-border. Click toggles the selected wash."
              active={selected()}
              onSelect={() => setSelected((v) => !v)}
              claimedBy={<span>Ryan</span>}
            />
          </Slot>

          <Slot>
            <StatusCard
              name="with a drawing (children)"
              status={<Pill text="REVIEW" tone="var(--sui-warning)" />}
              description="A drawing sits under the description, above the actions, at full card width."
              actions={
                <SecondaryButton type="button">
                  Use the 15th <SuccessTag>Recommended</SuccessTag>
                </SecondaryButton>
              }
            >
              <svg width="100%" height="14" viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true" class="status-card-demo__drawing">
                <rect x="0" y="4" width="120" height="6" rx="3" fill="var(--sui-border)" />
                <rect x="0" y="4" width="78" height="6" rx="3" fill="var(--sui-success)" />
              </svg>
            </StatusCard>
          </Slot>

          <Slot>
            <StatusCard
              name="long description with a more affordance and an ellipsised, very long, overflowing title"
              status={<Pill text="TODO" />}
              description={LOREM}
              claimedBy={<span>Sam</span>}
              progress={<span>40%</span>}
              estimate={<span>5d</span>}
            />
          </Slot>

          <Slot>
            <StatusCard
              name="with detail-area actions"
              status={<Pill text="BLOCKED" tone="var(--sui-danger)" />}
              description="Actions sit at the bottom of the detail area, above the meta row."
              actions={
                <>
                  <Pill text="claim" />
                  <Pill text="snooze" />
                </>
              }
              claimedBy={<span>Ryan</span>}
            />
          </Slot>

          <Slot>
            <StatusCard name="minimal — name only" />
          </Slot>
        </Grid>
      </div>
    </div>
  );
};
