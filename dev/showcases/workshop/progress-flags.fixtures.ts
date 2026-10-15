/**
 * progress-flags bench fixtures: diddit topics farmed 2026-10-15 from the
 * local diddit SpacetimeDB (receipt, step, topic tables), trimmed to what the
 * chart reads, plus two SYNTHETIC traces (ids 901, 902) because real agents
 * finish 2-6x ahead of estimate and never go behind.
 *
 * Times are epoch ms. Minutes are minutes. A step with no `startedAt` has not
 * begun; no `doneAt` has not finished.
 */
export type ReceiptKind =
  | "Claimed"
  | "Released"
  | "Parked"
  | "Blocked"
  | "Unblocked"
  | "Milestone"
  | "Estimated"
  | "StepsSet"
  | "StepStarted"
  | "StepDone"
  | "Dismissed"
  | "Lapsed"
  | "ApprovalRequested"
  | "Approved";

export interface Receipt {
  readonly kind: ReceiptKind;
  readonly at: number;
  readonly detail: string;
}

export interface Step {
  readonly title: string;
  readonly estimateMin: number;
  readonly startedAt: number | undefined;
  readonly doneAt: number | undefined;
}

export interface TopicTrace {
  readonly id: number;
  readonly title: string;
  readonly estimateMin: number;
  readonly steps: readonly Step[];
  readonly receipts: readonly Receipt[];
}

const MIN = 60_000;

/**
 * A synthetic trace: each step is [estimate, actual] minutes, run back to back
 * after `idleMin` minutes of nothing following the claim.
 */
const synthetic = (
  id: number,
  title: string,
  durations: readonly (readonly [number, number])[],
  idleMin = 1,
): TopicTrace => {
  const t0 = 1_791_600_000_000;
  const total = durations.reduce((n, d) => n + d[0], 0);
  let cursor = t0 + idleMin * MIN;
  const steps: Step[] = durations.map(([estimateMin, actual], i) => {
    const startedAt = cursor;
    cursor += actual * MIN;
    return { title: `Step ${i + 1}`, estimateMin, startedAt, doneAt: cursor };
  });
  const named = (s: Step, i: number): string => `step ${i + 1} ${s.title} (${s.estimateMin}m)`;
  const receipts: Receipt[] = [
    { kind: "Claimed", at: t0, detail: "" },
    { kind: "StepsSet", at: t0 + 1, detail: `${steps.length} steps, ${total}m` },
    { kind: "Estimated", at: t0 + 2, detail: `none -> ${total}m` },
    ...steps.flatMap((s, i): Receipt[] => [
      { kind: "StepStarted", at: s.startedAt ?? t0, detail: named(s, i) },
      { kind: "StepDone", at: s.doneAt ?? t0, detail: named(s, i) },
    ]),
    { kind: "Milestone", at: cursor + 1, detail: "" },
  ];
  return { id, title, estimateMin: total, steps, receipts };
};

export const TOPICS: readonly TopicTrace[] = [
  {
    id: 18,
    title: "M15 rolling bars on SUI, plus three HUD data bugs",
    estimateMin: 100,
    steps: [
      { title: "Rolling bars on SUI, one track width", estimateMin: 10, startedAt: 1791500784505, doneAt: 1791500944525 },
      { title: "Usage age bug", estimateMin: 5, startedAt: 1791500945609, doneAt: 1791501070208 },
      { title: "Done-row elapsed bug", estimateMin: 10, startedAt: 1791501070913, doneAt: 1791501149996 },
      { title: "Active vs status liveness", estimateMin: 5, startedAt: 1791501150502, doneAt: 1791501249289 },
      { title: "Topic groups as titled surfaces", estimateMin: 10, startedAt: 1791501263009, doneAt: 1791501305426 },
      { title: "Status table scrolls internally", estimateMin: 10, startedAt: 1791501305852, doneAt: 1791501344249 },
      { title: "Two columns on large screens", estimateMin: 10, startedAt: 1791501344645, doneAt: 1791501397847 },
      { title: "Tick performance, one shared clock", estimateMin: 10, startedAt: 1791501398247, doneAt: 1791501577828 },
      { title: "DOING description under the card", estimateMin: 10, startedAt: 1791501578215, doneAt: 1791501762266 },
      { title: "Merge Active and rolling into collapsible cards", estimateMin: 10, startedAt: 1791501763853, doneAt: 1791501968153 },
      { title: "Column order and quiet empty sections", estimateMin: 10, startedAt: 1791501968549, doneAt: 1791501969513 },
    ],
    receipts: [
      { kind: "Claimed", at: 1791500728094, detail: "" },
      { kind: "Released", at: 1791500732098, detail: "" },
      { kind: "Claimed", at: 1791500755998, detail: "" },
      { kind: "StepsSet", at: 1791500767798, detail: "4 steps, 30m" },
      { kind: "Estimated", at: 1791500769415, detail: "none -> 30m" },
      { kind: "StepStarted", at: 1791500784505, detail: "step 1 Rolling bars on SUI, one track width (10m)" },
      { kind: "StepDone", at: 1791500944525, detail: "step 1 Rolling bars on SUI, one track width (10m)" },
      { kind: "StepStarted", at: 1791500945609, detail: "step 2 Usage age bug (5m)" },
      { kind: "StepDone", at: 1791501070208, detail: "step 2 Usage age bug (5m)" },
      { kind: "StepStarted", at: 1791501070913, detail: "step 3 Done-row elapsed bug (10m)" },
      { kind: "StepDone", at: 1791501149996, detail: "step 3 Done-row elapsed bug (10m)" },
      { kind: "StepStarted", at: 1791501150502, detail: "step 4 Active vs status liveness (5m)" },
      { kind: "StepDone", at: 1791501249289, detail: "step 4 Active vs status liveness (5m)" },
      { kind: "StepsSet", at: 1791501261326, detail: "5 steps, 50m" },
      { kind: "Estimated", at: 1791501261746, detail: "30m -> 80m" },
      { kind: "StepStarted", at: 1791501263009, detail: "step 5 Topic groups as titled surfaces (10m)" },
      { kind: "StepDone", at: 1791501305426, detail: "step 5 Topic groups as titled surfaces (10m)" },
      { kind: "StepStarted", at: 1791501305852, detail: "step 6 Status table scrolls internally (10m)" },
      { kind: "StepDone", at: 1791501344249, detail: "step 6 Status table scrolls internally (10m)" },
      { kind: "StepStarted", at: 1791501344645, detail: "step 7 Two columns on large screens (10m)" },
      { kind: "StepDone", at: 1791501397847, detail: "step 7 Two columns on large screens (10m)" },
      { kind: "StepStarted", at: 1791501398247, detail: "step 8 Tick performance, one shared clock (10m)" },
      { kind: "StepDone", at: 1791501577828, detail: "step 8 Tick performance, one shared clock (10m)" },
      { kind: "StepStarted", at: 1791501578215, detail: "step 9 DOING description under the card (10m)" },
      { kind: "StepDone", at: 1791501762266, detail: "step 9 DOING description under the card (10m)" },
      { kind: "StepsSet", at: 1791501762689, detail: "2 steps, 20m" },
      { kind: "Estimated", at: 1791501763066, detail: "80m -> 100m" },
      { kind: "StepStarted", at: 1791501763853, detail: "step 10 Merge Active and rolling into collapsible cards (10m)" },
      { kind: "StepDone", at: 1791501968153, detail: "step 10 Merge Active and rolling into collapsible cards (10m)" },
      { kind: "StepStarted", at: 1791501968549, detail: "step 11 Column order and quiet empty sections (10m)" },
      { kind: "StepDone", at: 1791501969513, detail: "step 11 Column order and quiet empty sections (10m)" },
      { kind: "Milestone", at: 1791501998649, detail: "" },
      { kind: "Released", at: 1791501998649, detail: "milestone" },
      { kind: "Claimed", at: 1791502033302, detail: "" },
      { kind: "Released", at: 1791502034134, detail: "" },
    ],
  },
  {
    id: 4,
    title: "Wiki",
    estimateMin: 50,
    steps: [
      { title: "Server: page, page_revision, create_page/save_page", estimateMin: 10, startedAt: 1791502331231, doneAt: 1791502333216 },
      { title: "Tools: CLI page show|save|history, MCP read/write", estimateMin: 10, startedAt: 1791502338186, doneAt: 1791502402220 },
      { title: "FE: /wiki list, view, edit, history with diffLines", estimateMin: 15, startedAt: 1791502404196, doneAt: 1791502502369 },
      { title: "Thread header page links, persona note", estimateMin: 8, startedAt: 1791502503009, doneAt: 1791502533559 },
      { title: "Prove end to end", estimateMin: 7, startedAt: 1791502533992, doneAt: 1791502631434 },
    ],
    receipts: [
      { kind: "Claimed", at: 1791502147681, detail: "" },
      { kind: "Estimated", at: 1791502149148, detail: "none -> 50m" },
      { kind: "Released", at: 1791502150056, detail: "" },
      { kind: "Claimed", at: 1791502268441, detail: "" },
      { kind: "StepsSet", at: 1791502282101, detail: "5 steps, 50m" },
      { kind: "Estimated", at: 1791502287671, detail: "50m -> 50m" },
      { kind: "StepStarted", at: 1791502331231, detail: "step 1 Server: page, page_revision, create_page/save_page (10m)" },
      { kind: "StepDone", at: 1791502333216, detail: "step 1 Server: page, page_revision, create_page/save_page (10m)" },
      { kind: "StepStarted", at: 1791502338186, detail: "step 2 Tools: CLI page show|save|history, MCP read/write (10m)" },
      { kind: "StepDone", at: 1791502402220, detail: "step 2 Tools: CLI page show|save|history, MCP read/write (10m)" },
      { kind: "StepStarted", at: 1791502404196, detail: "step 3 FE: /wiki list, view, edit, history with diffLines (15m)" },
      { kind: "StepDone", at: 1791502502369, detail: "step 3 FE: /wiki list, view, edit, history with diffLines (15m)" },
      { kind: "StepStarted", at: 1791502503009, detail: "step 4 Thread header page links, persona note (8m)" },
      { kind: "StepDone", at: 1791502533559, detail: "step 4 Thread header page links, persona note (8m)" },
      { kind: "StepStarted", at: 1791502533992, detail: "step 5 Prove end to end (7m)" },
      { kind: "StepDone", at: 1791502631434, detail: "step 5 Prove end to end (7m)" },
      { kind: "Milestone", at: 1791502639574, detail: "" },
      { kind: "Released", at: 1791502639574, detail: "milestone" },
    ],
  },
  {
    id: 11,
    title: "M12 progress bar on Active",
    estimateMin: 35,
    steps: [
    ],
    receipts: [
      { kind: "Claimed", at: 1791496937575, detail: "" },
      { kind: "Released", at: 1791496940192, detail: "" },
      { kind: "Claimed", at: 1791496961618, detail: "" },
      { kind: "Released", at: 1791496964676, detail: "" },
      { kind: "Claimed", at: 1791497561576, detail: "" },
      { kind: "Estimated", at: 1791497640079, detail: "none -> 35m" },
      { kind: "Estimated", at: 1791497760361, detail: "35m -> 2m" },
      { kind: "Estimated", at: 1791497779987, detail: "2m -> 35m" },
      { kind: "Milestone", at: 1791498177222, detail: "" },
      { kind: "Released", at: 1791498177222, detail: "milestone" },
      { kind: "Claimed", at: 1791498288243, detail: "" },
      { kind: "Released", at: 1791498290027, detail: "" },
      { kind: "Claimed", at: 1791498315364, detail: "" },
      { kind: "Released", at: 1791498316470, detail: "" },
    ],
  },
  {
    id: 7,
    title: "M8 SUI proof topic (ignore)",
    estimateMin: 2,
    steps: [
      { title: "Warm up", estimateMin: 1, startedAt: 1791498892804, doneAt: 1791498893330 },
      { title: "Overrun demo", estimateMin: 1, startedAt: 1791498893884, doneAt: 1791502031708 },
      { title: "Next thing", estimateMin: 10, startedAt: undefined, doneAt: undefined },
      { title: "After that", estimateMin: 10, startedAt: undefined, doneAt: undefined },
    ],
    receipts: [
      { kind: "Claimed", at: 1791495317964, detail: "" },
      { kind: "Parked", at: 1791495323330, detail: "proof blocked" },
      { kind: "Blocked", at: 1791495332350, detail: "" },
      { kind: "Claimed", at: 1791495368517, detail: "" },
      { kind: "Parked", at: 1791495370073, detail: "proof" },
      { kind: "Unblocked", at: 1791495423768, detail: "" },
      { kind: "Claimed", at: 1791495956018, detail: "" },
      { kind: "Released", at: 1791496697007, detail: "" },
      { kind: "Claimed", at: 1791497818669, detail: "" },
      { kind: "Lapsed", at: 1791498139850, detail: "heartbeat stopped" },
      { kind: "Claimed", at: 1791498139850, detail: "" },
      { kind: "Parked", at: 1791498150309, detail: "proof done" },
      { kind: "Claimed", at: 1791498883154, detail: "" },
      { kind: "StepsSet", at: 1791498883757, detail: "4 steps, 22m" },
      { kind: "StepStarted", at: 1791498892804, detail: "step 1 Warm up (1m)" },
      { kind: "StepDone", at: 1791498893330, detail: "step 1 Warm up (1m)" },
      { kind: "StepStarted", at: 1791498893884, detail: "step 2 Overrun demo (1m)" },
      { kind: "StepDone", at: 1791502031708, detail: "step 2 Overrun demo (1m)" },
      { kind: "Released", at: 1791502032093, detail: "" },
      { kind: "Claimed", at: 1791502155681, detail: "" },
      { kind: "Estimated", at: 1791502157048, detail: "none -> 2m" },
      { kind: "Released", at: 1791502158063, detail: "" },
      { kind: "Claimed", at: 1791502709767, detail: "" },
      { kind: "Released", at: 1791502712593, detail: "" },
      { kind: "Claimed", at: 1791502773893, detail: "" },
      { kind: "Milestone", at: 1791502786203, detail: "" },
      { kind: "Released", at: 1791502786203, detail: "milestone" },
    ],
  },
  {
    id: 21,
    title: "M18 approvals decided only by the project owner",
    estimateMin: 35,
    steps: [
      { title: "Server: project owner, claim_ownership, owner-only human reducers (tests first)", estimateMin: 10, startedAt: 1791503411696, doneAt: 1791503413342 },
      { title: "Tools and HUD: clear error, hide Grant/Refuse for non-owners", estimateMin: 10, startedAt: 1791503413758, doneAt: 1791503445077 },
      { title: "Prove: minted identity refused, principal 4 grants, sync writes owner-granted only", estimateMin: 10, startedAt: 1791503445579, doneAt: 1791503482299 },
      { title: "Close-out: post void M17 approval rows", estimateMin: 5, startedAt: 1791503482726, doneAt: 1791503501091 },
    ],
    receipts: [
      { kind: "Claimed", at: 1791503256577, detail: "" },
      { kind: "Estimated", at: 1791503256947, detail: "none -> 35m" },
      { kind: "Released", at: 1791503257683, detail: "" },
      { kind: "Claimed", at: 1791503304475, detail: "" },
      { kind: "StepsSet", at: 1791503319196, detail: "4 steps, 35m" },
      { kind: "StepStarted", at: 1791503411696, detail: "step 1 Server: project owner, claim_ownership, owner-only human reducers (tests first) (10m)" },
      { kind: "StepDone", at: 1791503413342, detail: "step 1 Server: project owner, claim_ownership, owner-only human reducers (tests first) (10m)" },
      { kind: "StepStarted", at: 1791503413758, detail: "step 2 Tools and HUD: clear error, hide Grant/Refuse for non-owners (10m)" },
      { kind: "StepDone", at: 1791503445077, detail: "step 2 Tools and HUD: clear error, hide Grant/Refuse for non-owners (10m)" },
      { kind: "StepStarted", at: 1791503445579, detail: "step 3 Prove: minted identity refused, principal 4 grants, sync writes owner-granted only (10m)" },
      { kind: "StepDone", at: 1791503482299, detail: "step 3 Prove: minted identity refused, principal 4 grants, sync writes owner-granted only (10m)" },
      { kind: "StepStarted", at: 1791503482726, detail: "step 4 Close-out: post void M17 approval rows (5m)" },
      { kind: "StepDone", at: 1791503501091, detail: "step 4 Close-out: post void M17 approval rows (5m)" },
      { kind: "Milestone", at: 1791503508242, detail: "" },
      { kind: "Released", at: 1791503508242, detail: "milestone" },
      { kind: "Claimed", at: 1791503685712, detail: "" },
      { kind: "ApprovalRequested", at: 1791503695087, detail: "Bash(npm run check)" },
      { kind: "Released", at: 1791503695476, detail: "" },
      { kind: "Approved", at: 1791558445748, detail: "Bash(npm run check)" },
    ],
  },
  // On target: every step lands near its estimate, so the whole area is blue.
  synthetic(903, "Synthetic: on target", [[10, 10], [10, 10], [10, 9], [10, 11], [10, 10]], 0),
  // Behind: every step takes 4 to 8 times its estimate, so the area goes red.
  synthetic(901, "Synthetic: steadily behind", [[10, 40], [10, 50], [10, 60], [10, 60], [10, 70], [10, 80]]),
  // Over and under: two fast steps (purple), then a long stall (red), then catching up (blue).
  synthetic(902, "Synthetic: ahead, then behind", [[10, 3], [10, 3], [10, 100], [10, 40], [10, 10], [10, 10]]),
  // Procrastinate: 50 idle minutes after the claim, then a burst of steps.
  synthetic(904, "Synthetic: procrastinate", [[10, 2], [10, 2], [10, 3], [10, 2], [10, 2], [10, 3]], 50),
];

const byId = (id: number): TopicTrace => TOPICS.find((t) => t.id === id) ?? (TOPICS[0] as TopicTrace);

export const TOPIC_18 = byId(18);

/** The bench's scenarios, in order: a name and the topic that shows it. */
export const SCENARIOS: readonly { readonly name: string; readonly topic: TopicTrace }[] = [
  { name: "On target", topic: byId(903) },
  { name: "Ahead", topic: TOPIC_18 },
  { name: "Behind", topic: byId(901) },
  { name: "Over and under", topic: byId(902) },
  { name: "Procrastinate", topic: byId(904) },
];
