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
| **`COMPONENTS.md`** | Catalogue of every public component, its key props, and a usage example. | You need to find a component or remember its API. |
| **`STYLE_GUIDE.md`** | Architecture: depth levels (Atomic / Depth 2 / Depth 3), curried-variant pattern, factory rules, when to compose vs extend. | You're authoring a new component. |
| **`AGENT_GUIDE.md`** | Operating instructions for AI agents working in this repo: conventions, do/don'ts, how to add a component. | You're an AI assistant. |
| **`DESIGN_LANGUAGE.md`** | Vocabulary glossary for drafting page mockups in the Sandbox — short phrases like "shrink-wrapped delineated sidebar" mapped to structural definitions and curried implementations. | You're producing or reading mockups (`#/sandbox/...`). |
| **`CHANGELOG.md`** | Release notes per version. | You're cutting or auditing a release. |
| **`TODO.md`** | Visual-migration checklist — components ported / pending from the legacy library. | You're planning migration work. |

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
