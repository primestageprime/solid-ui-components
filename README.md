# solid-ui-components

PrimeStage's SolidJS UI component library. Atomic + composed components,
curried-variant pattern, themes (Default + HUD dark, Bronze light).

## Quick start

```bash
npm install
npm run dev          # Vite dev server on :6006 — showcase + sandbox
npm run build        # Builds dist/ for the package
npm run audit:styles # Reports inline `style={…}` repeats — candidates for variants
```

## Where each doc lives

| Doc | What's in it | Read it when… |
|---|---|---|
| **`docs/BEST_PRACTICES.md`** | The distilled general expectations for how SUI components work: layers, curried variants, prop split, minimal surface, tokens, naming, lifecycle. | You want the rules on one page before diving into the deeper guides. |
| **`COMPONENTS.md`** | Catalogue of every public component, its key props, and a usage example. | You need to find a component or remember its API. |
| **`STYLE_GUIDE.md`** | Architecture: depth levels (Atomic / Depth 2 / Depth 3), curried-variant pattern, factory rules, when to compose vs extend. | You're authoring a new component. |
| **`AGENT_GUIDE.md`** | Operating instructions for AI agents working in this repo: conventions, do/don'ts, how to add a component. | You're an AI assistant. |
| **`DESIGN_LANGUAGE.md`** | Vocabulary glossary for drafting page mockups in the Sandbox — short phrases like "shrink-wrapped delineated sidebar" mapped to structural definitions and curried implementations. | You're producing or reading mockups (`#/sandbox/...`). |
| **`CHANGELOG.md`** | Release notes per version. | You're cutting or auditing a release. |
| **`TODO.md`** | Visual-migration checklist — components ported / pending from the legacy library. | You're planning migration work. |
| **`docs/local-development.md`** | How to wire a downstream consumer to read SUI from source for readable Solid DevTools names + `autoname` signal labels. | You're iterating on SUI from a local consumer app and want devtools to show real component / signal names. |

## Repo map

```
src/components/        — public components, one folder per component
src/components/Layout  — Stack/Row/Box primitives + curried variants
src/themes/            — _baseline.css + per-theme tokens (default, hud, bronze); registered in manifest.ts
dev/                   — local Vite app: showcase nav + #/sandbox harness
dev/showcases/*.tsx    — one showcase per component
dev/sandbox.tsx        — ephemeral page-mockup harness
dist/                  — build output (gitignored at runtime)
scripts/               — small repo-maintenance scripts
```

## Consuming the CSS (import contract)

A consumer app needs **two** stylesheets, imported once at the app entry
(e.g. `app.tsx`):

```ts
import "solid-ui-components/index.css";          // per-component bundled CSS
import "solid-ui-components/themes/default.css"; // theme tokens + global baseline
```

The theme file is **not just tokens** — each shipped theme
(`default.css`, `hud.css`, `bronze.css`, `bronze-dark.css`) begins with
`@import "./_baseline.css";`, so importing one theme also pulls in the global
baseline layer. The baseline supplies page-level rules that are NOT in
`index.css`:

- `body { background-color: var(--sui-bg-primary); color: var(--sui-text-primary); }`
- the box-sizing reset
- baseline styling for native `button`, `input`, scrollbars, and every
  `.sui-*` component class (written purely against `--sui-*` tokens)

So `index.css` alone is **not** enough — without a theme import the page
`<body>` stays unstyled (white background, unstyled native controls). Switch
themes by swapping the second import (`themes/hud.css`, `themes/bronze.css`, …).

If you need the baseline on its own (e.g. you supply your own token file),
it is also exported directly:

```ts
import "solid-ui-components/themes/_baseline.css";
import "./my-tokens.css"; // your own :root { --sui-*: … } declarations
```

All `./themes/*.css` paths resolve via the package `exports` map.
