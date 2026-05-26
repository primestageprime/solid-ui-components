# Layout-First Structural Prototyping

> **Status:** 🚧 In progress — living document.
> A generic, reusable process for prototyping a page's structure *before*
> building real UI. This is **not** a design for any one page — it's the ordered
> list of phases we follow. Each phase is small and independently verifiable.
> (We develop it against a throwaway sandbox route, e.g. `/dev`, but the content
> here is the method, not that page.)

## The process

### 0 — Prove you can render something

Stand up a minimal throwaway surface (e.g. an unauthenticated sandbox route) that
displays a trivial placeholder like `hello world`. This proves the surface works
and gives us a place to iterate before investing any effort in it.

### 1 — Discuss layout

Map the page into its high-level regions, rendered as **plain labeled boxes** —
colored panes, each with a name and a one-line note on what it will eventually
do. **No real UI elements, no behavior, no data.** The point is to see the
regions, watch how they reactively fill space, and freely rearrange them. This
phase is about *what regions exist* and *roughly where they sit*.

Layout also includes the **page frame**: margins/padding (full-bleed vs. padded),
gaps between boxes, and how the shell anchors to the window — which regions pin to
which edges (header to top, side panels full height, a footer enclosed by the
side panels, etc.). Decide these here, not as an afterthought.

### 2 — Talk in detail about space usage and nesting

Once the regions are agreed, get specific about how they consume space and
contain one another:

- **Space usage / sizing relationships** — explicit constraints that hold as the
  viewport resizes: min/max size clamps, and proportional (ratio) relationships
  between regions (e.g. "this region is min/max 200/400px and sits in a 1:2 ratio
  with that one"). Verify they hold under resize.
- **Nesting / containment** — how regions group and contain each other: a single
  container box holding several sub-areas (vs. several separate boxes); column
  arrangements; fixed-height regions pinned/anchored to an edge; which things are
  one box vs. many.

### 3 — Responsiveness / mobile

Decide how the layout adapts across viewport sizes. Pick **breakpoints**, then for
each region decide its fate as space shrinks — there are three moves:

- **Collapse** — give up space first. Establish a *collapse order*: which regions
  yield space (or hide) earliest (usually auxiliary panels before primary content).
- **Eliminate** — remove the region entirely in some views (e.g. a secondary side
  panel that has no place on a phone).
- **Replace with a terser/alternate form** — swap the region for a compact mobile
  equivalent. Common substitutions:
  - nav bar → **hamburger** menu
  - a list/selector panel → **swipe paginator** (with position dots)
  - a docked side panel → **bottom sheet** (rises on demand, dismissable)
  - a footer action bar → **floating action button** (FAB)
  - a full chart → **sparkline**
  - side-by-side columns → **tabbed** (one at a time)
  - tall auxiliary bars → **compressed** to a fixed small height

Also capture **cross-region constraints** that must hold in the responsive forms —
e.g. an on-demand overlay (bottom sheet) must be *bounded* so it never covers a
key region (enforce this structurally, by nesting the overlay inside the region it
may cover rather than over the whole viewport).

### 4 — MVP the riskiest feature with frontend-only logic

Pick a *single* feature/interaction and make it actually work — but with
**frontend logic only**: stub/in-memory data, a frontend computation, **no
database and no backend**. The goal is to confirm the interaction behaves the way
you expect (e.g. editing inputs updates a derived view) before investing in
persistence.

**Which feature?** The *most risky / most impactful* one for this page — the
interaction that, if it turns out to be hard or to need an unexpected shape of
data, would force you to rethink the page (or the wider app). It is **not** "any
feature" and not the easiest one to reach. Once that risky feature is proven, the
remaining features on the page (filters, sort, drag-and-drop, polish, empty
states, etc.) are low-risk, well-trodden UI patterns — **defer them**.

**Joseki vs. non-joseki.** Borrowing the Go term: a *joseki* is a well-understood,
near-deterministic sequence — we already know how to complete it and there's no
hidden gotcha that could sink the project. The well-trodden features above are
joseki; we don't need to finish them now precisely *because* their completion is
already known. The risky/impactful feature is **non-joseki** — its outcome is
genuinely uncertain. So the rule is: **build the non-joseki parts up-front and
leave the joseki parts for the end.** Proving a non-joseki feature retires real
risk; finishing a joseki one only burns down work we could have done at any time.

As we identify joseki and work out their solutions, **note them** — capture the
feature and the known approach. Because they're deterministic and gotcha-free,
they're exactly the work we can **dispatch to background LLM agents** to complete
without close human supervision, freeing humans to stay on the non-joseki risk.

The deferral is app-wide, not just page-local: hold off on the joseki (low-risk)
features of *every* page until **all** pages in the app-level MVP have had their
non-joseki (risky / impactful) feature proven out. The point is to **mitigate risk
and let the hard features inform the wider application architecture** — surfacing
the real data shapes and cross-page constraints early — rather than getting bogged
down polishing one page with patterns we already know how to build.

- Use the **real components** where they already exist (e.g. the actual chart the
  product uses), fed by stub data — not a placeholder box.
- Add a small amount of stub data (e.g. a couple of items of each kind) and a
  frontend function that derives the dependent view from it.
- Wire the interaction end-to-end in the browser (change an input → see the
  derived output update). Defer the database/backend until it feels right.

Example: "items in the revenue/expenses list are reflected in the cashflow
graph" — stub 2 revenue + 2 expense items, compute the projection in the
frontend, and render it with the real cashflow chart.

---

_Further phases to be appended as the process continues (e.g. wiring real
persistence / a backend once the interaction is proven)._
