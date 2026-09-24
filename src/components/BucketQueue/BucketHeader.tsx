// BucketQueue — one bucket's header line. Internal to BucketQueue (Depth 1;
// EXEMPT-AS-LAYOUT with its parent, STYLE_GUIDE § Layout Purity — it renders
// into BucketQueue.css's header, which the JS water-fill measures). Extracted
// from BucketQueue.tsx (2026-07-31) when the collapsible bucket pushed that
// file past the repo's 500-line limit. Not exported from ./index.ts.
//
// A collapsible AND populated bucket renders its header as the disclosure
// button; every other bucket keeps the plain div it has always had, so nothing
// about a non-collapsible queue's markup changes. The chevron REPLACES the
// tone dot rather than joining it: the component allows exactly one
// role-coloured mark per bucket (chrome stays neutral — see types.ts), the
// chevron becomes that mark, and because it occupies the dot's exact 8px slot
// every bucket's label stays on the same left edge either way.
import { Show, type JSX } from "solid-js";
import type { Bucket } from "./types";

// A function, not a shared element: a single JSX expression evaluates to ONE
// DOM node, which rendering in several headers would move rather than copy.
const Chevron = (): JSX.Element => (
  <svg width="7" height="9" viewBox="0 0 7 9" fill="none" aria-hidden="true">
    <path
      d="M1 1l4 3.5L1 8"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export interface BucketHeaderProps {
  bucket: Bucket;
  count: number;
  /** The bucket can be toggled RIGHT NOW — declared `collapsible` AND
   *  populated. An empty bucket has nothing to expand into, so it renders as
   *  a plain header even when it declares `collapsible`. */
  toggleable: boolean;
  collapsed: boolean;
  /** id of the body this header discloses, for `aria-controls`. */
  bodyId: string;
  onToggle: () => void;
  ref: (el: HTMLElement) => void;
}

export function BucketHeader(props: BucketHeaderProps): JSX.Element {
  const Contents = (): JSX.Element => (
    <>
      <span class="bucket-queue__title">
        <Show
          when={props.toggleable}
          fallback={
            <span
              class={`bucket-queue__dot bucket-queue__dot--${props.bucket.tone}`}
            />
          }
        >
          <span
            class={`bucket-queue__chevron bucket-queue__chevron--${props.bucket.tone}`}
            classList={{ "bucket-queue__chevron--expanded": !props.collapsed }}
            aria-hidden="true"
          >
            <Chevron />
          </span>
        </Show>
        {props.bucket.label}
      </span>
      <span class="bucket-queue__count">{props.count}</span>
    </>
  );

  // The header proper (div or toggle button) — identical markup either way to
  // before `headerAction` existed. `headRef` goes straight on this element
  // UNLESS an action is present, in which case the wrapping row below takes
  // the ref instead (see there for why that's still safe to measure).
  const Header = (headRef?: (el: HTMLElement) => void): JSX.Element => (
    <Show
      when={props.toggleable}
      fallback={
        <div class="bucket-queue__header" ref={headRef}>
          <Contents />
        </div>
      }
    >
      {/* `aria-controls` deliberately names an element that does not exist
          while collapsed: the body is UNMOUNTED, not hidden, because the
          sizing model measures live elements and a display:none body would
          still be found by revealRow's and the FLIP sweep's [data-bq-key]
          queries. A dangling aria-controls is well tolerated; rows lingering
          in the DOM is not. */}
      <button
        type="button"
        class="bucket-queue__header bucket-queue__header--toggle"
        aria-expanded={!props.collapsed}
        aria-controls={props.bodyId}
        onClick={() => props.onToggle()}
        ref={headRef}
      >
        <Contents />
      </button>
    </Show>
  );

  return (
    <Show when={props.bucket.headerAction != null} fallback={Header(props.ref)}>
      {/* The action is a DOM SIBLING of the header (div or button), never
          nested inside it, so a click on the action can never bubble into the
          toggle button's onClick. This wrapper carries no border/padding of
          its own, so its measured height is just the header's — `headerAction`
          is documented (types.ts) to stay within the header's own line box, so
          this never changes what bucket 0's header measures for every bucket's
          water-fill allocation (see BucketQueue.tsx / measurement.ts). */}
      <div class="bucket-queue__header-row" ref={props.ref}>
        {Header()}
        <span class="bucket-queue__header-action">{props.bucket.headerAction}</span>
      </div>
    </Show>
  );
}
