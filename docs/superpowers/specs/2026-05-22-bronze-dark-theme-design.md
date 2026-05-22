# Bronze Dark Theme

## Summary
Add a dark companion to the Bronze theme. Same warm/serif/friendly identity, dark surfaces. Reads as Bronze's night mode.

## Motivation
Bronze (light) ships in v0.34.0. A dark variant was flagged as out-of-scope follow-up in the original Bronze spec. Users want the same Bronze identity for low-light environments.

## Palette — "Inverted Twin"

| Group | Token | Value |
|---|---|---|
| **Backgrounds** | `--sui-bg-deep` | `#0F0A06` |
| | `--sui-bg-primary` | `#1A120A` |
| | `--sui-bg-secondary` | `#221710` |
| | `--sui-bg-tertiary` | `#2D1F14` |
| | `--sui-bg-elevated` | `#382617` |
| **Text** | `--sui-text-primary` | `#F4ECD8` |
| | `--sui-text-secondary` | `#C8B89A` |
| | `--sui-text-muted` | `#8C7861` |
| **Accent** | `--sui-accent` | `#E07A4F` |
| | `--sui-accent-rgb` | `224, 122, 79` |
| | `--sui-accent-dim` | `#B85F38` |
| **Status** | `--sui-danger` (rgb `212, 88, 78`) | `#D4584E` |
| | `--sui-warning` (rgb `224, 160, 64`) | `#E0A040` |
| | `--sui-success` (rgb `123, 166, 123`) | `#7BA67B` |
| **Borders** | `--sui-border` | `#4A3625` |
| | `--sui-border-bright` | `#6B4F33` |
| | `--sui-border-focus` | `#E07A4F` (= accent) |
| **Chart status** | `--status-full` | `#7BA67B` (success) |
| | `--status-partial` | `#E0A040` (warning) |
| | `--status-sparse` | `#E07A4F` (accent) |
| | `--status-missing` | `#D4584E` (danger) |
| **Typography** | `--sui-font-family` | `'Lora', Georgia, serif` |
| | `--sui-font-utility` | `'Inter', system-ui, sans-serif` |
| | `--sui-font-mono` | `ui-monospace, 'SF Mono', Menlo, monospace` |

Radii, spacing, and clip sizes are identical to light Bronze (and to the rest of the SUI themes — these dimensions don't vary by theme).

### Identity decisions
- Surfaces inverted: bg goes from `#F6F2EB` → `#1A120A` (warm dark walnut).
- Text inverted: warm ink `#2B1D14` → warm bone `#F4ECD8`.
- Accent: rust `#C96442` lifted to `#E07A4F` so it pops on dark without losing identity.
- Typography unchanged from light Bronze: Lora serif for prose, Inter for utility.
- Status palette lifted to remain legible on dark while keeping warm bias.

## Scope
- New file `src/themes/bronze-dark.css` with the full token contract.
- Registered in `src/themes/manifest.ts` as `{ id: 'bronze-dark', displayName: 'Bronze (dark)', mode: 'dark', css: <import> }`.
- Contract test (`__tests__/contract.test.ts`) automatically covers it once registered.

## Out of scope
- No per-component overrides yet — the baseline + tokens should be sufficient. Spot fixes (if any) can be a follow-up PR.
- No new `--sui-*` tokens introduced; this theme conforms to the existing contract.
- Bronze theme audit (light) for token issues is tracked in PR #27.
