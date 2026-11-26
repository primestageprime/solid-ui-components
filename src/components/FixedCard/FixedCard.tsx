// ============================================
// FixedCard — Depth 2
// Tags: shows:card, shows:dialog, does:click, does:view, data:scalar, role:container
// Owns CSS (FixedCard.css): the fixed box and the clip fade only.
// Composes Surface (card chrome, column layout), ClipFillBox (the clipping
// body), EndWrapRow + Button (the "More" affordance) and Modal (the fuller
// view).
//
// ONE SIZE, NEVER GROWS (Peter, 2026-11-23): "For both the divisions and the
// CapEx, I want a card in a flex flow to have a fixed size. But that if there
// are things that make it so that you want to show more detail about a card
// than you can fit in the card itself, you don't expand the card. Instead,
// you show a modal with the larger amount of information about that card."
//
// So the card is a fixed width x height box that sits in a wrapping row
// (`WrapRow`) without ever pushing its neighbours. Its `children` are the
// summary, clipped (with a fade) when they overflow. A "More" button opens a
// Modal, by `moreOf` (fixedCardRules.ts):
//   - a `detail` slot given  -> the button always shows and opens the detail;
//   - no detail, but clipped -> the button opens the summary in full;
//   - neither                -> no button.
// The clip is measured live (`isClipped`), re-measured when the content or
// the box resizes, through observeSize.
//
// In "summary" mode the children render a second time inside the modal, so
// pass them as JSX (Solid re-creates it per mount), not a prebuilt node.
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import { Surface } from "../Surface/Surface";
import { ClipFillBox, EndWrapRow } from "../Layout/variants";
import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";
import { isClipped, moreOf } from "./fixedCardRules";
import "./FixedCard.css";

export interface FixedCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** The card's name: the modal's title and the "More" button's label. */
  title: string;
  /** The summary the card shows, clipped to its fixed box. */
  children?: JSX.Element;
  /** The fuller view the "More" button opens. Without it, the button only
   *  appears when the summary is clipped, and opens the summary in full. */
  detail?: JSX.Element;
  /** Draws the card selected (an accent border), e.g. the focused division. */
  active?: boolean;
  /** The card's one size. Only `md` (320 x 240) has a consumer so far. */
  size?: "md";
}

export const FixedCardBase: Component<FixedCardProps> = (rawProps) => {
  const props = mergeProps({ size: "md" as const }, rawProps);
  const [local, others] = splitProps(props, [
    "title",
    "children",
    "detail",
    "active",
    "size",
    "class",
    "onClick",
  ]);
  const [open, setOpen] = createSignal(false);
  const [clipped, setClipped] = createSignal(false);
  let bodyEl: HTMLDivElement | undefined;

  const measure = (): void => {
    if (bodyEl) setClipped(isClipped(bodyEl));
  };
  // The body has a fixed box, so its own size only changes with the card's;
  // the content inside is what grows. Watch both, measure the body.
  const attachBody = (el: HTMLDivElement): void => {
    bodyEl = el;
    queueMicrotask(measure);
    onCleanup(observeSize(el, measure));
  };
  const attachContent = (el: HTMLDivElement): void => {
    onCleanup(observeSize(el, measure));
  };

  const more = () => moreOf(local.detail != null, clipped());

  const classes = (): string => {
    const cl = ["sui-fixed-card", `sui-fixed-card--${local.size}`];
    if (local.onClick) cl.push("sui-fixed-card--clickable");
    if (local.class) cl.push(local.class);
    return cl.join(" ");
  };

  return (
    <>
      <Surface
        direction="column"
        gap="sm"
        padding="md"
        radius="md"
        active={local.active}
        class={classes()}
        onClick={local.onClick}
        {...others}
      >
        <ClipFillBox
          ref={attachBody}
          class={
            clipped()
              ? "sui-fixed-card__body sui-fixed-card__body--clipped"
              : "sui-fixed-card__body"
          }
        >
          <div ref={attachContent}>{local.children}</div>
        </ClipFillBox>
        <Show when={more() !== "none"}>
          <EndWrapRow>
            <Button
              variant="text"
              type="button"
              aria-label={`More about ${local.title}`}
              onClick={(e: MouseEvent) => {
                // The card's own click (focus, select) must not fire too.
                e.stopPropagation();
                setOpen(true);
              }}
            >
              More
            </Button>
          </EndWrapRow>
        </Show>
      </Surface>
      <Modal open={open()} onClose={() => setOpen(false)} title={local.title}>
        <Show when={more() === "detail"} fallback={local.children}>
          {local.detail}
        </Show>
      </Modal>
    </>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type FixedCardOverrides = Pick<FixedCardProps, "size">;

/** Props that remain available to consumers of a curried FixedCard variant. */
export type FixedCardDataProps = Omit<FixedCardProps, keyof FixedCardOverrides>;

export function createFixedCard(
  defaults: Partial<FixedCardOverrides>,
): Component<FixedCardDataProps> {
  return (props) => <FixedCardBase {...mergeProps(defaults, props)} />;
}
