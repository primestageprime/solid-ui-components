# Three outcomes, 2026-10-20 (diddit #4163)

`scripts/find-outcomes-bench.json` (23 exact / 19 cousin / 17 none, frozen at f5f5cfbf before the classifier existed). Thresholds tuned on the odd items only; the even items are the held-out number.

| arm | tuning (30) | held-out (29) | all (59) | cousin → exact | exact hidden | tokens / lookup |
|---|---|---|---|---|---|---|
| zero-token (`find-outcome.mjs`, ranker v2 fast path, union walk for cousin / none) | 24 | 27 | 51 | 4 | 0 | 0 |
| zero-token + Sonnet reader on the 14 low-margin exacts (`readerGate`: shape coverage < 0.6 or lead over another family < 0.1) | 25 | 28 | 53 | 0 | 2 | ~975 for a gated call (14 of 59), 0 otherwise |

`reader-batch.json` is what the reader saw (need + the top 5 candidates' entries, ~900 chars each); `judge-sonnet.json` its raw answers. The reader was a foreground Sonnet subagent writing the file; as an agent session it cost ~70k tokens for the 14 items (tool calls and its own reasoning), against ~975 per item of content, which is what a direct API call would cost. Item 15 was judged a second time after the batch writer learnt to add a factory's family bullet (`createStatusFlowChart`'s own entry is a one-line stub); it stayed a cousin because the 900-char entry ends before the "Use for: kanban-style ... auto-summarize" sentence.

The two exacts the reader turned into cousins (`ActionList` for "a sortable, filterable task list with a slot for a card..."; `createStatusFlowChart` for the kanban-style status flow) keep the right component as the placeholder, so nothing is hidden; they cost a spurious gap record and a phase-2 item. The one remaining miss on the held-out half is "a QR code rendered from a string" read as a cousin of `CodeBlock`.
