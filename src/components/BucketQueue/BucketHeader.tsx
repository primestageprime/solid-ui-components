// BucketQueue — one bucket's header line. Extracted from BucketQueue.tsx
// (2026-07-31) when the collapsible bucket pushed that file past the repo's
// 500-line limit.
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

  return (
    <Show
      when={props.toggleable}
      fallback={
        <div class="bucket-queue__header" ref={props.ref}>
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
        ref={props.ref}
      >
        <Contents />
      </button>
    </Show>
  );
}
