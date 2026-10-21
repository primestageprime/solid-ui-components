# Search comparison, 2026-10-20 (diddit #4161)

Every arm scored once on the 44 quoted held-out needs (`scripts/find-bench-real.json`, frozen at 6f378f68). Picker outputs are the raw JSON the Haiku / Sonnet subagents returned (`picks-*.json`, ids are 1-based positions in the held-out file); `recall.json` holds recall@k, the cascade at three thresholds and the union recalls; `emb-cands.json` the MiniLM top-20 per need.

| arm | top-1 | top-3 | @5 | @10 | @20 | tokens / lookup | time / lookup |
|---|---|---|---|---|---|---|---|
| legacy prose ranker | 7 | 11 | 13 | 19 | 23 | 0 | 2 ms |
| B BM25 | 12 | 18 | 18 | 26 | 35 | 0 | 1 ms |
| B MiniLM (local) | 18 | 25 | 30 | 33 | 38 | 0 | 17 ms (+8 s model load) |
| E ranker v2 (tags) | 22 | 26 | 31 | 34 | 36 | 0 | 14 ms |
| F composition walk | 8 | 18 | 23 | 23 | 23 | 0 | 16 ms |
| ranker v2 top-10 + Haiku | 29 | 32 | — | — | — | ~300 | ~5 s |
| D catalog-index.md + Haiku | 35 | 41 | — | — | — | ~1.5k batched / 15k single | ~4 s |
| A exhaustive COMPONENTS.md + Haiku | 35 | 42 | — | — | — | ~26k batched / 140k single | ~8 s |
| A exhaustive COMPONENTS.md + Sonnet | 35 | 44 | — | — | — | ~26k batched / 140k single | ~5 s |

Cascade (Haiku rates each of ranker v2's top-15 in order; stop at the first ≥ t): t=0.5 hit 22, stopped on 30, 5.6 read on average; t=0.7 hit 18 / 20 / 9.0; t=0.9 hit 8 / 8 / 12.1.

Union recall (any arm's top-k): ranker v2 ∪ MiniLM reaches 44/44 at k=20 with zero tokens; index+Haiku ∪ ranker v2 ∪ MiniLM 43 at 10, 44 at 20; index+Haiku ∪ exhaustive-Haiku 43 at 3.

## Recall-first pipeline (the final claim), fresh held-out set `scripts/find-bench-fresh.json` (20 needs from the mark03–15, databrowser/baseline and sketch-ref gaps.json; frozen at d2844916 before scoring)

| arm | @1 | @3 | @5 | @10 | @20 |
|---|---|---|---|---|---|
| legacy | 1 | 1 | 3 | 3 | 5 |
| BM25 | 10 | 10 | 10 | 11 | 13 |
| MiniLM | 13 | 13 | 15 | 15 | 18 |
| ranker v2 | 12 | 14 | 15 | 16 | 17 |
| union (ranker v2 ∪ BM25 ∪ MiniLM, k=20, ~45 candidates) | | | | | 19 |
| union + Sonnet reader | 17 | 19 | | | |
| exhaustive COMPONENTS.md + Sonnet | 17 | 20 | | | |
| **pipeline: union + Sonnet reader, exhaustive fallback under 0.5 confidence (9 of 20 fall back)** | **17** | **20** | | | |

The one need the union missed ("InlineRenameHotkey: autoEdit only opens on mount, so an edit verb cannot open the editor on the selected task") names no component shape at all; the reader rated it 0.3 and the fallback found EditableTitle. On the first 44-need set the same pipeline is 36 / 44 with 24 of 44 falling back; 44/44 at 3.

## Retired (2026-10-20, round 3)

The doc fixes of 133c5c92 (GroupedSelector, StatusCard, EntityCard, ScrollRegion) and the promotion run on the first set's 24 fallbacks retire both `find-bench-real.json` and `find-bench-fresh.json` as honest scores. They stay as regression sets (`npm run find:bench`); a future claim needs a new frozen set from unused sources. One label was widened: `FramedCashflowScrubChart` (a curried `CashflowScrubChart`) counted for "Dragging a range zooms all visible charts" — reverted on diddit #4163 (Peter: "keep the cashflow expectation strict"); the need is answered by `ScrubChart` since `CashflowScrubChart`'s bullet says to reach for `ScrubChart` first and curried variants inherit that edge.
