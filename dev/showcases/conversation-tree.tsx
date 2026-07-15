import type { Component } from "solid-js";
import {
  ConversationTree,
  type Participant,
  type ConversationMessage,
} from "../../src/components/ConversationTree";

const NOW = Date.now();
const m = (mins: number) => NOW - mins * 60_000;
const h = (hours: number) => NOW - hours * 3_600_000;
const d = (days: number) => NOW - days * 86_400_000;

const participants: Participant[] = [
  { id: "peter", name: "Peter Stradinger" },
  { id: "alex", name: "Alex Chen" },
  { id: "morgan", name: "Morgan Reyes" },
  { id: "sam", name: "Sam Patel" },
];

// Flat conversation
const flatMessages: ConversationMessage[] = [
  {
    id: "1",
    participantId: "peter",
    timestamp: d(2),
    text: "Kicking off the rendering pipeline review. The goal this week is to land the deferred-pass refactor and have the new heightfield LOD transitions verified across the four reference scenes. Please drop notes here as you find things.",
  },
  {
    id: "2",
    participantId: "alex",
    timestamp: h(20),
    text: "I have notes on the heightfield pass.",
  },
  {
    id: "3",
    participantId: "alex",
    timestamp: h(20) + 30_000,
    text: "Specifically the LOD transitions — the popping at the 64m boundary is back. I think it's the morph factor being clamped too early when the camera dolly is fast; we lose a frame or two of blend on quick approach.",
  },
  {
    id: "4",
    participantId: "morgan",
    timestamp: m(45),
    text: "Posting numbers from yesterday's run.",
  },
  {
    id: "5",
    participantId: "morgan",
    timestamp: m(45) + 60_000,
    text: "Frame time held at 4.2ms p99.",
  },
  {
    id: "6",
    participantId: "morgan",
    timestamp: m(44),
    text: "GPU bound on the second deferred pass — same as last week. The shadow cascade resolve looks like the next thing worth attacking; it's spending ~1.1ms on the medium scene and barely moves between low and high settings, which suggests we're fill-bound rather than vertex-bound.",
  },
  {
    id: "7",
    participantId: "peter",
    timestamp: m(8),
    text: "Nice. Can we re-run with the new tiling? Curious whether the L2 hit rate improvement we measured on the synthetic benchmark actually shows up in the cascade resolve, or if we're just getting lucky on the easy paths.",
  },
  {
    id: "8",
    participantId: "alex",
    timestamp: m(2),
    text: "Queued — should land tonight.",
  },
  {
    id: "9",
    participantId: "morgan",
    timestamp: m(1),
    text: [
      "Long-form retrospective on the cascade resolve work, dumping it here so we have one place to reference next sprint.",
      "",
      "1. Baseline: 1.12ms on the medium scene, 2.04ms on the heavy scene. p99 frame budget headroom went from 0.6ms to 0.1ms in the worst case, which is what triggered the regression alert two weeks ago.",
      "2. First attempt was the depth-prepass reorder. That bought us ~0.18ms on medium but actually regressed heavy by 0.05ms because the second prepass dispatch fell off a wave-occupancy cliff on the larger draw counts.",
      "3. Second attempt was tile-binning the resolve at 32×32. Won 0.34ms on medium, 0.41ms on heavy. The wave occupancy improved across the board.",
      "4. We then layered in the L2 prefetch hint that Alex prototyped — additional 0.09ms on medium, 0.14ms on heavy. Mostly a function of the cascade-1 access pattern aligning with the prefetcher window.",
      "5. The remaining cost is ~0.6ms which I traced to the variance-shadow filter pass; it's running unconditionally even when the cascade is fully resolved at full-res. That's a separate ticket.",
      "",
      "Net delta: 0.61ms / 0.55ms. We're back inside the budget on both scenes with margin. I'll attach the captures to the ticket.",
      "",
      "The thing I want to flag for next time: we kept hand-tuning until something worked. We should have a profiler-driven loop where we pick the largest single bucket each pass instead of guessing. I'll write this up properly.",
      "",
      "End of dump.",
    ].join("\n"),
  },
];

// Threaded conversation
const treeMessages: ConversationMessage[] = [
  {
    id: "r1",
    participantId: "peter",
    timestamp: h(3),
    text: "Should we ship the new heatstream rollup before the demo?",
  },
  {
    id: "r2",
    participantId: "alex",
    timestamp: h(3) + 5 * 60_000,
    text: "I'd hold — the partial-status edge case isn't covered.",
    replyToId: "r1",
  },
  {
    id: "r3",
    participantId: "morgan",
    timestamp: h(3) + 8 * 60_000,
    text: "Agreed with Alex. Demo path doesn't hit it but support will.",
    replyToId: "r2",
  },
  {
    id: "r4",
    participantId: "peter",
    timestamp: h(2) + 30 * 60_000,
    text: "Fine. What's the smallest scope that closes it?",
    replyToId: "r3",
  },
  {
    id: "r5",
    participantId: "alex",
    timestamp: h(2),
    text: "One predicate change in the rollup reducer + a fixture.",
    replyToId: "r4",
  },
  {
    id: "r6",
    participantId: "alex",
    timestamp: h(2) + 30_000,
    text: "I can have it up in an hour.",
    replyToId: "r4",
  },
  {
    id: "r7",
    participantId: "sam",
    timestamp: m(20),
    text: "Separately — the demo deck needs a new slide for this.",
    replyToId: "r1",
  },
  {
    id: "r8",
    participantId: "morgan",
    timestamp: m(15),
    text: "I'll take that.",
    replyToId: "r7",
  },
];

export const ConversationTreeShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ConversationTree — Pure Composite (Depth 1)</h2>
      <p class="text-meta">
        Multi-participant message thread with optional reply nesting. Groups
        consecutive same-author messages, inserts day/gap dividers, shows full
        timestamps on hover, and right-aligns the current user's bubbles.
      </p>

      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Flat — grouped consecutive messages</h3>
          <p class="text-meta">
            Morgan's three messages within a minute fold into one block; same
            for Alex's pair 30s apart. Day divider separates yesterday from
            today. Peter is the current user, so his bubbles render
            right-aligned.
          </p>
          <ConversationTree
            participants={participants}
            messages={flatMessages}
            threaded={false}
            currentUserId="peter"
          />

          <h3 class="showcase-heading-gap">Threaded — replies indent</h3>
          <p class="text-meta">
            Each reply nests under its parent. Left rail colored by the replying
            author for quick scanning at depth.
          </p>
          <ConversationTree
            participants={participants}
            messages={treeMessages}
            currentUserId="peter"
          />

          <h3 class="showcase-heading-gap">Tighter group window (1 min)</h3>
          <p class="text-meta">
            Reduce <code>groupWithinMs</code> to split bursts that you want to
            treat as separate utterances rather than one.
          </p>
          <ConversationTree
            participants={participants}
            messages={flatMessages}
            threaded={false}
            groupWithinMs={60_000}
          />
        </div>

        <div class="depth2-atoms">
          <h3>Composed from</h3>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Layout (Depth 1)</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Stack</div>
              <div class="text-meta">
                vertical group of message rows + bubble stack
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Row</div>
              <div class="text-meta">
                avatar + body row; reversed for current user
              </div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text (Depth 1)</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">TextLabel</div>
              <div class="text-meta">participant name, colored per author</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">TextSublabel</div>
              <div class="text-meta">
                relative time-since with full-timestamp tooltip
              </div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Duration (Depth 1)</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Duration</div>
              <div class="text-meta">
                relative age formatting (3s / 4m / 2h / …)
              </div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Internal pieces</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">ParticipantAvatar</div>
              <div class="text-meta">
                initials circle, image fallback via avatarUrl
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">MessageBubble</div>
              <div class="text-meta">
                tinted bubble, 5-line clamp + (more…), 20-line scroll cap
              </div>
            </div>
          </div>

          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Behavior</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">colorForId</div>
              <div class="text-meta">
                muted cool palette (HSL 185–260, S 32–45, L 60–67)
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">grouping</div>
              <div class="text-meta">
                same author + same depth + within groupWithinMs (5min default)
              </div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">dividers</div>
              <div class="text-meta">
                day change OR gap &gt; absoluteAfterMs (1h default)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
