import type { Component } from "solid-js";
import { SubsectionTitle } from "../../../src/components/Text";
import { BucketQueueDemo, renderRow, renderCard } from "./triage";
import { PipelineDemo } from "./pipeline";
import { FillDemo } from "./fill";
import { DiscardStagingDemo } from "./discard";

export const BucketQueueShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>BucketQueue — N-bucket progression bar</h2>
      <p class="text-meta">
        One queue component: N always-present buckets, one flat{" "}
        <code>items</code> list bucketed by <code>bucketOf</code>, controlled
        selection / roving-focus keyboard navigation / checking, and a transfer
        animation played whenever an item's bucket changes — there is no
        separate resolve/unresolve call. Supersedes{" "}
        <code>SplitQueueList</code>. Full usage guide:{" "}
        <code>src/components/BucketQueue/README.md</code>.
      </p>

      <SubsectionTitle>
        Row cards — select, move between buckets, and select mode
      </SubsectionTitle>
      <p class="text-meta">
        Click any row to select it, or use the buttons below to move the
        selection into a different bucket. Arrow keys / Home / End walk every
        interactive row across all three buckets with no wrap; Tab lands on one
        roving stop. <strong>In progress</strong> declares <code>capRows: 3</code>,
        so it holds at three rows tall and its own body scrolls once it has more
        than that — move an item into it to see the arrival scroll into view
        inside a capped, already-scrolling bucket.
      </p>
      <p class="text-meta">
        <strong>Multi-select across queues:</strong> all three buckets declare{" "}
        <code>selectable: true</code>, so entering select mode turns the whole
        bar into checkboxes and a batch can span buckets — check two{" "}
        <strong>Suggestions</strong> and one <strong>In progress</strong> and
        send all three somewhere in one move. <code>selectable</code> is
        per-bucket so this is a choice: set it on only the working queue and
        every other bucket's rows keep selecting on click while select mode is
        on. The cost of turning it on everywhere is that no row is left to
        single-select, so click-to-select is suspended until you leave the mode.
      </p>
      <p class="text-meta">
        <strong>Moving a batch:</strong> the Move buttons retarget to the whole
        check set (their labels say how many). It goes out as <em>one</em>{" "}
        mutation, so the queue diffs it as a single set of transfers — every row
        animates together in one FLIP pass rather than competing ones, even when
        they leave from different buckets.
      </p>
      <p class="text-meta">
        <strong>A bulk action is a detour, so it ends itself.</strong> Once the
        move lands, select mode switches off, the checks are spent, and the
        selection parks on the top row of <strong>Suggestions</strong> — the
        primary queue — so you drop straight back into the one-at-a-time loop
        instead of being stranded in select mode with nothing checked. This is
        showcase policy, not queue behavior: the component can&rsquo;t leave
        select mode (the mode <em>is</em> the presence of <code>checkedKeys</code>,
        which the consumer owns) and it never singles out a &ldquo;primary&rdquo;
        bucket. Where the bulk reset and the per-row advance disagree, the
        reset wins.
      </p>
      <p class="text-meta">
        <strong>Working the queue:</strong> press <em>Move to Categorized</em>{" "}
        repeatedly. Each move advances the selection to the next item still
        waiting in <strong>Suggestions</strong> rather than trailing the row
        into Categorized, so the whole queue can be processed from one button.
        The advance skips anything that left in the same batch and falls back{" "}
        <em>up</em> when the last item in a bucket is processed. Keep going to
        the end: emptying the bucket fires <code>onSelect(null)</code>, which
        is how a consumer knows to close its detail panel and show a
        &ldquo;nothing left&rdquo; state.
      </p>
      <BucketQueueDemo
        renderItem={renderRow}
        demoClass="bucket-queue-demo"
      />

      <SubsectionTitle>Large cards — the same queue, taller rows</SubsectionTitle>
      <p class="text-meta">
        Identical buckets, data and interactions; the only change is a{" "}
        <code>renderItem</code> that draws a two-line card (title over a muted
        meta line) instead of a one-line row — the shape the workshop{" "}
        <code>split-queue</code> bench uses. <strong>Row height is not a prop.</strong>{" "}
        The queue measures a real row and derives every bucket's natural height
        from that measurement, so the water-fill, the <code>capRows: 3</code>{" "}
        scroll cap on <strong>In progress</strong>, and the transfer animation
        all re-scale on their own. Worth pressure-testing here: the select-mode
        checkbox stays centered against a two-line card, and the arriving row's
        slot still opens from zero now that the padding collapses with the
        height.
      </p>
      <BucketQueueDemo
        renderItem={renderCard}
        demoClass="bucket-queue-cards-demo"
      />

      <SubsectionTitle>Five stages — N is not three</SubsectionTitle>
      <p class="text-meta">
        <strong>Nothing in the component is fixed at three buckets.</strong> The
        sizing, the render, the counts and the keyboard sequence are all maps and
        loops over <code>buckets</code>; direction and distance fall out of
        bucket order, so <em>Ship it</em> moves a ticket four stages in one hop
        with no special casing. This bar is five stages deep, and{" "}
        <strong>Blocked</strong> starts empty on purpose — an empty bucket
        <em>between</em> populated ones is the case where the water-fill has to
        collapse it to a summary line instead of handing it a share.{" "}
        <strong>In progress</strong> carries <code>weight: 2</code> for a double
        share of any overflow, and <strong>Blocked</strong> carries{" "}
        <code>capRows: 2</code> so a pile-up scrolls rather than squeezing its
        neighbours — block several tickets to see both rules bite at once.
      </p>
      <p class="text-meta">
        This demo also inverts the selection behavior, deliberately. Triage wants
        the selection to <em>stay put</em> and let items leave; a pipeline wants
        it to <em>follow</em> the item down the chain. The queue always does the
        former, so this demo re-asserts the selection after each move and gets
        the last word — a consumer that disagrees with the built-in advance
        overrides it, because it owns the selection outright. No prop, no mode.
      </p>
      <PipelineDemo />

      <SubsectionTitle>
        fill — reaching the bottom, and one row height per bucket
      </SubsectionTitle>
      <p class="text-meta">
        The base model <strong>shrink-wraps</strong>: populated buckets take
        their content and any leftover height simply goes unallocated. That is
        right for a bar floating in a page and wrong for a queue in a fixed
        column with a control pinned under it — the leftover shows up as a band
        of dead space above that control, and it grows the shorter the list is.{" "}
        <code>fill</code> is the opt-in that gives the remainder to a nominated
        bucket. It <em>overrides</em> <code>capRows</code> for that bucket: the
        cap exists to stop content-driven growth, not to refuse space nothing
        else wants. Only a populated bucket fills, so an empty one never
        stretches its &ldquo;nothing here&rdquo; strip over the pane.
      </p>
      <p class="text-meta">
        This bench also pins the sizing fix that shipped with it. The queue
        measures <strong>one row per bucket</strong>, not one row for the whole
        bar: here single-line <strong>Balances</strong> rows sit above two-line{" "}
        <strong>Configs</strong> rows, and sizing the second from the first left
        it roughly half as tall as its content while its body scrolled. A bucket
        with nothing to measure yet borrows the topmost measured sibling before
        falling back to a constant.
      </p>
      <FillDemo />

      <SubsectionTitle>
        collapsible — a populated bucket that starts as a summary line
      </SubsectionTitle>
      <p class="text-meta">
        An <strong>empty</strong> bucket has always collapsed to its summary
        line. <code>collapsible</code> lets the <em>user</em> collapse one while
        it still <strong>has items</strong> — a staging pile that must not
        dominate the queue but has to be openable, because the point of staging
        a discard is being able to look at what you staged and pull it back out
        before committing. The header becomes the toggle, and its disclosure
        chevron <strong>replaces</strong> the tone dot in the dot&rsquo;s own 8px
        slot: labels stay on one left edge, and the bucket still carries exactly
        one role-coloured mark.
      </p>
      <p class="text-meta">
        <strong>Discard a few, and watch the Suggestions gap close.</strong> The
        row has no slot to arrive into — Discard renders no rows — so the older
        behaviour was to animate <em>nothing at all</em>, dropping the source
        bucket&rsquo;s FLIP with it and making every row under the discarded one
        jump. Now the gap closes as usual and the pile&rsquo;s count pulses to
        show it was received.
      </p>
      <p class="text-meta">
        <strong>Then open the pile and empty it.</strong> Two rules are easiest
        to see here: an <em>empty</em> collapsible bucket renders exactly like
        any other empty bucket — no chevron, no toggle, its{" "}
        <code>emptyLabel</code> showing — because there is nothing to expand
        into; and the toggle is <strong>sticky</strong>, so once you have opened
        the pile it stays open across the drain and refills open.{" "}
        <code>collapsedByDefault</code> is only the state before you first touch
        the bucket, and it is <strong>ignored</strong> without{" "}
        <code>collapsible</code> — on its own it would start the bucket
        collapsed with no way to open it.
      </p>
      <DiscardStagingDemo />
    </div>
  );
};
