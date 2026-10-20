// ============================================
// HatchedProgressBar — Atomic (Depth 1)
// Tags: shows:progress, shows:bar, does:view, data:scalar, role:inline
// Owns CSS (HatchedProgressBar.css), no component imports.
// A thin two-tone progress bar: the DONE share is solid accent, the ACTIVE
// (in-progress) share after it is hatched, the rest is the track. Reads as a
// pencil sketch's "solid = done, hatched = in progress" bar. Counts are
// whatever the caller measures (steps, minutes, bytes); the bar draws the
// fractions `done / total` and `active / total`.
//   <HatchedProgressBar done={2} active={1} total={4} />
// ============================================
import { type Component, type JSX, splitProps } from "solid-js";
import "./HatchedProgressBar.css";

export interface HatchedProgressBarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The finished share, in the same unit as `total`. */
  done: number;
  /** The in-progress share, drawn hatched after the done share. Default 0. */
  active?: number;
  /** The whole. A total of 0 draws an empty track. */
  total: number;
  /** Accessible name of the bar (it is a progressbar). */
  label?: string;
}

/** `part / total` as a percentage clamped to 0..100; 0 when total is 0. */
export const share = (part: number, total: number): number =>
  total > 0 ? Math.min(100, Math.max(0, (part / total) * 100)) : 0;

export const HatchedProgressBar: Component<HatchedProgressBarProps> = (props) => {
  const [local, others] = splitProps(props, ["done", "active", "total", "label", "class"]);
  const donePct = () => share(local.done, local.total);
  const activePct = () => Math.min(100 - donePct(), share(local.active ?? 0, local.total));
  return (
    <div
      class={local.class ? `sui-hatched-bar ${local.class}` : "sui-hatched-bar"}
      role="progressbar"
      aria-label={local.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(donePct())}
      {...others}
    >
      <div class="sui-hatched-bar__done" style={{ width: `${donePct()}%` }} />
      <div
        class="sui-hatched-bar__active"
        style={{ left: `${donePct()}%`, width: `${activePct()}%` }}
      />
    </div>
  );
};
