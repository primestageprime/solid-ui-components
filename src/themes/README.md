# SUI Themes

A theme is a CSS file that declares the SUI token contract and, optionally,
overrides specific component rules. Themes are registered in `manifest.ts`
and loaded by `dev/load-theme.ts`.

## Architecture

Two `<style>` tags on the page:

- `#sui-baseline` — `_baseline.css`. All component visual treatment, written
  purely against `--sui-*` tokens. Loaded once on app boot. Never swapped.
- `#sui-theme` — the active theme's CSS. Declares tokens; optionally overrides
  baseline rules. Swapped when the user changes theme.

Cascade order: baseline rules → theme rules. A theme overrides only what it
needs to.

## Adding a theme in 3 steps

1. Create `src/themes/<id>.css` that declares the [token contract](#token-contract).
2. Register it in `src/themes/manifest.ts`:
   ```ts
   import myThemeCss from "./my-theme.css?raw";
   export const THEMES = {
     ...
     "my-theme": { id: "my-theme", displayName: "My Theme", mode: "light", css: myThemeCss },
   } as const satisfies Record<string, ThemeEntry>;
   ```
3. (Optional) Add an export entry to `package.json` if you want consumers to
   load the CSS file directly by URL:
   ```json
   "./themes/my-theme.css": "./dist/themes/my-theme.css"
   ```

The dev `ThemeSwitcher` picks the new entry up automatically.

## Token contract

Every theme MUST declare these custom properties at `:root`. The contract
test at `__tests__/contract.test.ts` fails if any are missing.

### Backgrounds
| Token | Purpose |
|---|---|
| `--sui-bg-deep` | Outermost frame |
| `--sui-bg-primary` | Page |
| `--sui-bg-secondary` | Panel |
| `--sui-bg-tertiary` | Warmer accent surface |
| `--sui-bg-elevated` | Highest lift (header strips, modals) |

### Text
| Token | Purpose |
|---|---|
| `--sui-text-primary` | Body text |
| `--sui-text-secondary` | Subdued labels |
| `--sui-text-muted` | Captions, hints |

### Borders
| Token | Purpose |
|---|---|
| `--sui-border` | Default hairline |
| `--sui-border-bright` | Emphasised hairline |
| `--sui-border-focus` | Focus ring (usually the accent) |

### Accent + semantic
Each color comes paired with an `-rgb` triplet for `rgba()` use.
| Token | Purpose |
|---|---|
| `--sui-accent`, `--sui-accent-rgb`, `--sui-accent-dim` | Brand accent |
| `--sui-danger`, `--sui-danger-rgb` | Errors, destructive actions |
| `--sui-warning`, `--sui-warning-rgb` | Caution states |
| `--sui-success`, `--sui-success-rgb` | Confirmations |

### Radii, clip sizes, spacing
| Token | Notes |
|---|---|
| `--sui-radius-sm`, `--sui-radius-md`, `--sui-radius-lg` | Rounded-corner sizes |
| `--sui-clip-sm`..`--sui-clip-xl` | Clip-path sizes (HUD-style themes) |
| `--sui-space-0` through `--sui-space-6` plus `-px`, `-0-5`, `-1-5`, `-2-5` | Spacing scale, identical across themes |

### Typography
| Token | Purpose |
|---|---|
| `--sui-font-family` | Prose / headings |
| `--sui-font-mono` | Code, tabular numerics |

### Optional: `--sui-font-utility`
Small-text font (buttons, tabs, subtitles, list metadata). If a theme does
NOT declare `--sui-font-utility`, baseline rules fall back to
`--sui-font-family` via CSS var fallback — so dark themes that don't
distinguish prose vs utility fonts can simply omit it.

### Chart status colors
| Token | Purpose |
|---|---|
| `--status-full` | "Fully filled" cells |
| `--status-partial` | Partial coverage |
| `--status-sparse` | Low coverage |
| `--status-missing` | No data |

## Theme-specific overrides

Beyond tokens, a theme may need to override specific component rules when
pure-token theming is insufficient. Examples:

- `bronze.css` overrides `.sui-btn--secondary` because `_baseline.css`
  inherits a Bootstrap-grey background from default that clashes with the
  warm palette.
- `bronze.css` softens `.sui-panel--glow-*` shadows because the baseline
  uses `rgba(0,0,0,...)` opacities that read too heavy on bone bg.
- `hud.css` overrides corner treatment everywhere because HUD uses
  `clip-path` instead of `border-radius`.

Keep overrides as small as possible — every override is a surface that may
drift from baseline as components evolve.

## Fonts

Themes that depend on a specific font face may either:

- `@import` the font at the top of the theme CSS (Bronze does this with
  Google Fonts), OR
- Document the font load as a consumer responsibility in this README.

There is no bundled font-self-hosting today.
