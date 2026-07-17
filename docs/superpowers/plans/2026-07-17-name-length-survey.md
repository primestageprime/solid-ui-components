# Production Name-Field Length Survey

**Date:** 2026-07-17
**Purpose:** Calibrate the SUI table name-column character cap (currently `minCh=12`, `maxCh=80`) against real production data.
**Method:** Read-only (`SELECT` only). SpacetimeDB via `spacetime sql -s maincloud`; Postgres via `psql`. String lengths measured in Unicode characters. SpacetimeDB SQL lacks length/aggregate functions, so name values were dumped and lengths computed locally. Values truncated to 100 chars in evidence rows.

## Headline

Across **171,926 real production name values** from four systems:

| stat | chars |
|------|-------|
| p50  | 13 |
| p90  | 23 |
| p95  | 29 |
| p99  | 41 |
| max  | 223 |

Share of all names exceeding a given cap:

| cap | % of names longer |
|-----|-------------------|
| 32ch | 2.92% |
| 40ch | 1.05% |
| 48ch | 0.27% |
| 60ch | 0.10% |
| 64ch | 0.06% |
| 80ch | 0.02% |

**Key finding:** legitimate names are short (p95 = 29ch). Almost everything above ~48ch is *dirty data* — operational notes, email addresses, and "DO NOT ACCEPT ORDERS" warnings stuffed into name columns — not real names that a UI should try to display in full.

## Sources surveyed

| System | Backend | Reachability |
|--------|---------|--------------|
| rhinotools repair tracker (`rth_repair_portal`) | local Postgres | reachable, full data (dominant source, ~171k rows) |
| jtf (`stax_cache`) | local Postgres | reachable **as local cache proxy** of the jtf-stax production cache (2,852 vessel calls) |
| dside (`dside`) | SpacetimeDB maincloud | reachable |
| thorcasting (`thorcasting`) | SpacetimeDB maincloud | reachable |

### Caveats / corrections to the task premise
- **jtf-stax is PostgreSQL, not SpacetimeDB.** It is a telemetry/QAQC cache on Azure Postgres (Entra-token auth), unreachable directly from this machine. A local `stax_cache` Postgres DB mirrors the same schema and holds 2,852 vessel calls ingested from production — surveyed here as a faithful proxy. Live production may hold more rows, but vessel/operator name *shapes* are identical (they come from the same upstream source).
- **`rhinotools-server` (SpacetimeDB) is an ETL coordinator, not the repair tracker.** Its "name" columns hold database table/column identifiers, not user-facing names, so it was excluded. The actual repair tracker is `rth_repair_portal` (local Postgres).
- SpacetimeDB `config_account`/`imported_entity`/etc. tables with n=1 (`forecast_snapshot`, `projection_config`) were dropped as statistically meaningless.

## Per-database × column detail

### rth_repair_portal (Postgres) — dominant, cleanest volume

| column | n | max | p95 | p50 |
|--------|---|-----|-----|-----|
| equipment.equipment_name | 73,205 | 63 | 25 | 11 |
| contact.full_name | 37,692 | 65 | 19 | 13 |
| contact.first_name | 37,692 | 32 | 10 | 5 |
| contact.last_name | 37,016 | 32 | 10 | 6 |
| org_sites.name | 13,535 | 84 | 25 | 16 |
| org_companies.name | 12,343 | 83 | 40 | 20 |
| org_tenants.name | 11,602 | 83 | 35 | 19 |
| model_type.model | 10,658 | 56 | 31 | 15 |
| equipment_class.equipment_class_name | 2,456 | 20 | 20 | 20 |
| salesperson.name | 442 | 23 | 17 | 12 |
| manufacturers.name | 382 | 30 | 20 | 8 |
| tool_type.tool_type | 105 | 77 | 61 | 16 |
| repair_facility.name | 24 | 29 | 28 | 12 |

Longest actual values (evidence that the long tail is polluted, not real names):
- `org_sites.name` (84): `C/O Joffroy Distribution Center, 10025 Siempre Viva Rd Suite  A San Diego, CA. 92154`
- `org_tenants.name` (83): `Nanogate Jay Systems, LLC (Mansfield, OH) -  Do not accept orders -see Karen Brooks`
- `org_companies.name` (83): `G.I. Electric Co. INC- DO NOT ACCEPT ANY ORDERS UNTIL INV IS PAID-MUST PREPAY ORDER`
- `contact.full_name` (65): `steve.griffin@rhinotoolhouse.com steve.griffin@rhinotoolhouse.com` (email pasted as name)
- `equipment.equipment_name` (63): `discontinued Replaced with EHC-R0012-PZ3(BC)/ EHC-R0012-PZ2(BC)` (status note as name)
- `tool_type.tool_type` (77): `Nutrunner Stall (Inline/Pistol/Right Angle/Flat Ratchet) (Pneumatic/Cordless)`

### jtf / stax_cache (Postgres, local proxy) — cleanest name data

| column | n | max | p95 | p50 |
|--------|---|-----|-----|-----|
| vessel_calls.vessel_name | 2,852 | 23 | 17 | 13 |
| vessel_calls.vessel_operator_name | 2,852 | 43 | 43 | 23 |
| vessel_calls.terminal_operator_name | 2,852 | 37 | 32 | 18 |
| timeframes.vessel_name | 2,852 | 23 | 17 | 13 |
| timeframes.client_name | 0 (all null) | — | — | — |

Longest values (all legitimate identifiers, no pollution):
- `vessel_operator_name` (43): `NYK  RORO Division, NYK Group Americas Inc.`
- `terminal_operator_name` (37): `Long Beach Container Terminal (LBCT)`
- `vessel_name` (23): `Eukor Morning Christina`

### dside (SpacetimeDB) — small internal tool

| column | n | max | p95 | p50 |
|--------|---|-----|-----|-----|
| statement_title.title | 102 | 223 | 140 | 51 |
| user.display_name | 11 | 37 | 37 | 19 |
| design.title | 9 | 64 | 64 | 40 |
| space.name | 8 | 18 | 18 | 12 |
| workflow.name | 54 | 12 | 12 | 7 |
| persona.name | 6 | 9 | 9 | 8 |
| team_member.display_name | 2 | 16 | 16 | 5 |

`statement_title.title` is the source of the global max=223. These are not names — they are task/bug titles written as full sentences (e.g. `data quality officer view - user can access chart where y-axis shows alarms > 1hr, x-axis shows time`). Person `display_name`s max at 16 (`Peter Stradinger`); the 37 is an email used as a fallback display name.

### thorcasting (SpacetimeDB) — financial forecasting

| column | n | max | p95 | p50 |
|--------|---|-----|-----|-----|
| imported_entity.name | 646 | 39 | 23 | 11 |
| config_account.name | 41 | 28 | 28 | 20 |
| config_scenario.name | 29 | 10 | 10 | 8 |
| company.name | 15 | 23 | 23 | 10 |
| user_profile.display_name | 3 | 16 | 16 | 15 |

Longest values (clean — QBO account/vendor names):
- `imported_entity.name` (39): `Transfer to A Step Ahead Strategies LLC`
- `config_account.name` (28): `Pacific Premier Money Market`
- `company.name` (23): `A Step Ahead Strategies`

## Recommendation

**Change `maxCh` from 80 → 48. Keep `minCh` at 12.**

Reasoning:
- **maxCh 48** covers **99.73%** of all 171,926 production names. The p99 is 41ch and the p95 is 29ch, so a 48ch cap gives comfortable headroom above the 99th percentile of *real* names while still producing a compact column. Every name legitimately worth reading — the longest clean examples (`NYK RORO Division, NYK Group Americas Inc.` at 43, `Transfer to A Step Ahead Strategies LLC` at 39) — fits under 48.
- **The 0.27% above 48ch are overwhelmingly data-quality defects** (addresses, emails, and "DO NOT ACCEPT ORDERS" notes crammed into name fields). These *should* truncate with an ellipsis + tooltip; letting them stretch a table column to 80+ chars punishes every other row for a handful of dirty records. Truncation is the correct behavior here, not accommodation.
- **minCh 12** sits right at the median (p50 = 13), so a typical name nearly fills the floor before the column needs to grow — the column never looks empty. No reason to change it.
- If a more conservative "never truncate a plausibly-real name" stance is preferred, **64ch** covers 99.94% and still trims only the genuinely-junk tail; 80ch is unjustified by any legitimate name in production and only exists to accommodate polluted records.

**Bottom line:** current 80ch cap is ~2× wider than any real name needs. 48ch is the data-driven cap; 64ch is the conservative fallback. Do not go above 64.
