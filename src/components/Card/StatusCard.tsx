// ============================================
// StatusCard — Depth 2
// Owns CSS (StatusCard.css).
// A 3-row status card:
//   Row 1: name (ellipsised, hover-full title) + status badge (slot)
//   Row 2: 2-3 lines of wrapped detail, lighter/smaller, line-clamped with a
//          "more" affordance that opens a popover with the full text
//   Row 3: a left / center / right meta strip — e.g. claimed-by / progress /
//          estimate (each a slot)
// Slots are JSX so consumers wire their own badge, assignee chips, progress,
// and estimate/actual element. Curried export `createStatusCard` follows the
// curried-only convention.
// ============================================
import {
  Component,
  JSX,
  Show,
  splitProps,
  mergeProps,
  createSignal,
  createEffect,
  onCleanup,
} from "solid-js";
import "./StatusCard.css";

export interface StatusCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Row 1, left — short name (tends to be < 10 words). Ellipsised; the full
   *  text is available on hover via the title attribute. */
  name: string;
  /** Row 1, right — status, generally a badge element. */
  status?: JSX.Element;
  /** Row 2 — longer detail. Clamped to ~3 lines; "more" opens a popover with
   *  the full text. Omit to hide row 2. */
  description?: string;
  /** Row 3, left — e.g. claimed-by / assignee chips. */
  claimedBy?: JSX.Element;
  /** Row 3, center — e.g. a progress indicator. */
  progress?: JSX.Element;
  /** Row 3, right — e.g. estimated (todo/doing) or actual (done). */
  estimate?: JSX.Element;
  /** Selected / active styling. */
  active?: boolean;
  /** Whole-card click. */
  onSelect?: () => void;
  /** Max lines for the description clamp (default 3). */
  descriptionLines?: number;
}

export const StatusCard: Component<StatusCardProps> = (props) => {
  const merged = mergeProps({ descriptionLines: 3 }, props);
  const [local, others] = splitProps(merged, [
    "name",
    "status",
    "description",
    "claimedBy",
    "progress",
    "estimate",
    "active",
    "onSelect",
    "descriptionLines",
    "class",
    "children",
  ]);
  const [moreOpen, setMoreOpen] = createSignal(false);
  // "more" is only offered when the description is actually clipped — i.e. the
  // text overflows the fixed-height detail area. Measured live (the area grows
  // to fill the card, so its height isn't known until laid out).
  const [overflowing, setOverflowing] = createSignal(false);
  let descRef: HTMLSpanElement | undefined;
  const measure = () => {
    const el = descRef;
    if (!el) return;
    setOverflowing(el.scrollHeight - el.clientHeight > 1);
  };
  createEffect(() => {
    // re-measure when the text changes
    local.description;
    queueMicrotask(measure);
  });
  const attachRef = (el: HTMLSpanElement) => {
    descRef = el;
    queueMicrotask(measure);
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    onCleanup(() => ro.disconnect());
  };

  const classes = () => {
    const cl = ["sui-status-card"];
    if (local.active) cl.push("sui-status-card--active");
    if (local.onSelect) cl.push("sui-status-card--clickable");
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  const hasMeta = () =>
    local.claimedBy != null || local.progress != null || local.estimate != null;

  return (
    <div
      class={classes()}
      onClick={() => local.onSelect?.()}
      {...others}
    >
      {/* Row 1 — name + status */}
      <div class="sui-status-card__row1">
        <span class="sui-status-card__name" title={local.name}>
          {local.name}
        </span>
        <Show when={local.status != null}>
          <span class="sui-status-card__status">{local.status}</span>
        </Show>
      </div>

      {/* Row 2 — description fills the space between the title and the
          bottom-pinned meta row; overflow is clipped with a "more" popover. */}
      <Show when={local.description && local.description.trim().length > 0}>
        <div class="sui-status-card__row2">
          <span class="sui-status-card__desc" ref={attachRef}>
            {local.description}
          </span>
          <Show when={overflowing()}>
            <button
              type="button"
              class="sui-status-card__more"
              onClick={(e) => {
                e.stopPropagation();
                setMoreOpen((v) => !v);
              }}
            >
              more
            </button>
          </Show>
          <Show when={moreOpen()}>
            <div
              class="sui-status-card__popover"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="sui-status-card__popover-name">{local.name}</div>
              <div class="sui-status-card__popover-body">
                {local.description}
              </div>
              <button
                type="button"
                class="sui-status-card__popover-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoreOpen(false);
                }}
              >
                close
              </button>
            </div>
          </Show>
        </div>
      </Show>

      {/* Row 3 — claimed-by / progress / estimate */}
      <Show when={hasMeta()}>
        <div class="sui-status-card__row3">
          <span class="sui-status-card__meta-left">{local.claimedBy}</span>
          <span class="sui-status-card__meta-center">{local.progress}</span>
          <span class="sui-status-card__meta-right">{local.estimate}</span>
        </div>
      </Show>

      {local.children}
    </div>
  );
};

/** Curried StatusCard — bind common defaults (e.g. descriptionLines) once. */
export function createStatusCard(
  defaults: Partial<Omit<StatusCardProps, "children">>,
): Component<StatusCardProps> {
  return (props) => <StatusCard {...mergeProps(defaults, props)} />;
}
