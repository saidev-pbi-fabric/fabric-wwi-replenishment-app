# Fabric WWI Replenishment App — UI Review

**Audited:** 2026-08-19
**Baseline:** No UI-SPEC.md exists (not a GSD-managed project). Audited against the abstract 6-pillar
standards plus this project's own design contract: `docs/wireframe-design-brief.md` (industrial
control-room tone, severity-rail signature motif, IBM Plex typography) and the locked design tokens
in `src/global.css`.
**Screenshots:** Not captured — per task scope, this is a code-only audit of the actual source
(component TSX/CSS, chart spec JSON, `global.css` tokens), even though a dev server was detected
live at `http://localhost:5173` during this session. All findings below are read directly from
source, not inferred.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Every real-app string is specific and on-voice; the one gap is the untouched, generic `ErrorFallback.tsx` crash screen ("Something went wrong" / "Try Again"). |
| 2. Visuals | 4/4 | Clear focal points on all 3 pages, every icon-only button has an `aria-label`, severity-rail motif applied consistently as the signature detail. |
| 3. Color | 2/4 | Light-mode neutral ramp and severity hex values are low-contrast/desaturated vs. dark mode — the exact "looks plain" complaint already on record, unresolved. |
| 4. Typography | 3/4 | Locked IBM Plex 3-family / 100-based type scale used consistently everywhere except 2 untouched template files that fall back to default Tailwind sizes. |
| 5. Spacing | 3/4 | Custom 4px-grid `spacing-100`..`800` scale used almost everywhere; same 2 template files break the pattern with raw Tailwind `p-4`/`mb-2`/etc. |
| 6. Experience Design | 4/4 | Every async component has real loading/error/empty states via a shared `useQueryPanel` hook, plus a refresh-in-place pattern that avoids blank-skeleton flicker on filter/selection change. |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **Light-mode palette reads flat and the severity rail loses its punch** — Judges will very
   likely see light mode first (system default, no toggle interaction needed), and this is the
   mode the team has already flagged as "looks plain, colors not great." Root cause, read directly
   from `src/global.css`: the light-theme neutral ramp only spans `#ffffff` → `#f0f0f0` → `#e0e0e0`
   (background/muted/border), a ~12% value range with almost no separation between card, muted
   surface, and border — the app looks like one flat plane instead of layered cards. Compounding
   this, the light-mode severity triad (`--color-critical: #c50f1f`, `--color-at-risk: #9a6700`,
   `--color-on-track: #0e700e`) is dark and desaturated compared to the vivid dark-mode equivalents
   (`#f1707b`, `#e0a828`, `#54c454`) — on a 4px-wide rail border, that reads as muddy rather than
   confident, undercutting the app's one signature visual detail. Fix: widen the light-mode neutral
   steps (e.g. `background #ffffff`, `card #ffffff`, `secondary #f7f7f8`, `muted #eef0f2`,
   `border #d6d9dd`) for real depth, and brighten the light-mode severity hexes toward more
   saturation while keeping AA text contrast. File: `src/global.css:20-56`.

2. **The one screen left on generic copy and default styling is the app's crash screen** —
   `src/ErrorFallback.tsx`, wired as the app-wide `<ErrorBoundary>` fallback in `src/main.tsx:52`,
   is the single component in the codebase still using un-migrated Tailwind defaults (`text-sm`,
   `text-lg`, `p-4`, `mb-2`, `mb-4`) instead of the locked `font-heading`/`font-base` families and
   `text-*`/`spacing-*` token scale used everywhere else, and its copy ("Something went wrong" /
   "Try Again") is exactly the generic pattern the copywriting pillar flags. If anything crashes
   during a live demo, the one screen the judges see breaks both the visual system and the app's
   otherwise specific, confident voice. Fix: apply `font-heading`/`font-base`, the `text-200..600`
   scale, and `spacing-*` tokens; reword to something on-voice (e.g. "Something broke while loading
   the dashboard" + a "Reload" action). Apply the same fix to the parallel un-migrated block in
   `src/components/auth-gate.component.tsx:44-57` (the "Can't open this app outside Fabric" state),
   which has the identical default-Tailwind gap. Files: `src/ErrorFallback.tsx:16-30`,
   `src/components/auth-gate.component.tsx:44-57`.

3. **Long WWI stock item names truncate with no way to see the full name** — Real WWI item names
   are long and descriptive (e.g. "Shipping carton (Brown) 413x285x187mm"); the Action Center
   ranked list (`ranked-list-panel.tsx:185`) and the landing page's "ranked by risk" glimpse
   (`landing-page.tsx:121`) both apply `truncate` with zero fallback — no `title` attribute anywhere
   in `src/` (`grep -rn "title=" src` returns no matches) and no tooltip. A judge scanning the list
   can't tell what a cut-off item actually is without opening the detail panel. Fix: add
   `title={row.name}` (or a proper tooltip component, already available via the design system) to
   both truncated spans — a one-line, low-risk fix. Files: `src/components/action-center/ranked-list-panel.tsx:185`,
   `src/components/landing/landing-page.tsx:121`.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- Every empty state is specific and contextual, not generic: "No detail found for this item."
  (`item-detail-panel.tsx:63`), "No at-risk items right now." / `No at-risk items match "{tier}"
  lead time.` (`ranked-list-panel.tsx:161-162`, `top-at-risk-list.tsx:162-163`), "No reorder
  actions recorded yet for this item." (`reorder-action-history.tsx:82`), "No KPI data available
  yet." (`kpi-strip.tsx:130`).
- CTAs are specific, not generic: "Open the Dashboard" (`landing-page.tsx:94`), "Submit Reorder
  Action" / "Submitting…" (`reorder-action-form.tsx:203`), "View all" on the drill-through tile
  (`kpi-strip.tsx:200`). No bare "Submit"/"OK"/"Click Here" found anywhere (`grep -rn
  "Submit\|Click Here\|\bOK\b\|Cancel\|\bSave\b" src` returns zero generic matches — the only
  "Submit"-adjacent hits are the specific "Submit Reorder Action" label and internal
  `submitState`/`onSubmitted` identifiers, not UI copy).
- Error states surface the real underlying message rather than a blanket string: "Couldn't load
  KPI strip: {message}", "Couldn't load at-risk items: {message}", "Couldn't submit: {error}" —
  consistent pattern across all 7 query-backed components.
- The landing page's disclosed-proxy callout ("risk here is a **disclosed proxy**...not a literal
  stock count") is honest, specific domain copy — a genuinely strong choice for a hackathon judge
  audience.

**Gap:**
- `src/ErrorFallback.tsx:18,26` — "Something went wrong" / "Try Again" are exactly the generic
  patterns this pillar's audit method flags (`grep -rn "went wrong\|try again" src` matches only
  this file). It's the app-wide `<ErrorBoundary>` fallback (`main.tsx:52`), so it's user-facing,
  not dead code.

### Pillar 2: Visuals (4/4)

- Clear focal point per page: landing hero + CTA, Overview's KPI strip → chart → ranked list
  reading order, Action Center's master-detail split. No competing visual weight.
- Every icon-only button carries `aria-label`: theme toggle (`App.tsx:106`), drill-through modal
  close (`top-at-risk-drill-through.tsx:111`), status-update `sr-only` label
  (`reorder-action-history.tsx:116`), filter dropdowns, refresh spinners (`aria-label="Updating"`).
  10 `aria-label` occurrences found across 7 icon-bearing button/interactive elements — no bare
  icon-only control found without one.
- Visual hierarchy achieved through the type scale (hero → heading → body → label) plus the
  severity-rail motif as a consistent left-edge accent on tiles/rows/panels — one motif, reused
  everywhere per the design brief's own instruction, not reinvented per component.
- Checked the task's flagged open item directly: only 1 of 4 KPI tiles animates its icon on hover
  (`kpi-strip.tsx:179-188`). This is not an inconsistency — all 4 tiles share the same base
  `whileHover={{ y: -2 }}` card-lift affordance (`kpi-strip.tsx:162`), and the code comment
  explicitly reasons that animating the other 3 icons would imply clickability they don't have
  (false affordance). This is correct interaction design, not a visual gap.
- Page 2 (Action Center) was flagged as a risk for lagging Page 1's interaction pass; in code it is
  not lagging — it has the same icon-header treatment (`AlertTriangle`, `PackagePlus`, `History`),
  the same refresh-dimming pattern, and the same aria-labeled controls as Page 1. No visible gap
  found between the two pages at the code level.

### Pillar 3: Color (2/4)

- Accent/brand usage is tightly controlled: only 3 `text-primary`/`bg-primary`/`border-primary`
  occurrences in the whole `src/` tree (`App.tsx` nav tab, landing CTA, reorder submit button) —
  well under the 10-element overuse threshold, and matches the design brief's instruction to keep
  `--color-primary` as the neutral brand color, not a domain signal.
  Severity-token usage (`text-critical`/`text-at-risk`/`text-on-track` and their `border-l-*`
  siblings via `RAIL_CLASS`/`LEAD_TIME_RAIL_CLASS`/`LEAD_TIME_DOT_CLASS` in `src/lib/severity.ts`
  and `kpi-strip.tsx`) is centralized through shared lookup tables rather than scattered ad hoc
  class strings — good discipline, one source of truth per severity mapping.
- Hardcoded hex only appears once, in `top-at-risk-list.tsx:29-31`, and is explicitly justified in
  a code comment: Vega renders to SVG and can't resolve `var(--color-*)`, so the severity scale is
  duplicated as literal hex there, kept in sync with `global.css` by comment convention. Legitimate
  exception, not an ungoverned hardcode.
- **Known, unresolved issue** (previously reported by the user, not yet fixed — see project
  context): `global.css:20-56`'s light-theme tokens compress background/card/popover (`#ffffff`),
  secondary (`#fafafa`), muted (`#f0f0f0`), accent (`#f5f5f5`), and border (`#e0e0e0`) into a very
  narrow value range, giving light mode low structural contrast between surfaces. The severity
  triad is also markedly darker/duller in light mode (`#c50f1f`/`#9a6700`/`#0e700e`) than in dark
  mode (`#f1707b`/`#e0a828`/`#54c454`), which reads as murky on the thin 4px rail that is this
  app's signature visual device. This is the direct, evidenced cause of the "looks plain, colors
  not great" complaint on record.
- The pre-existing CVD (color-vision-deficiency) finding from `tasks/todo.md` T3.3 — the
  red/amber/green severity triad fails a ΔE-2.0 protanopia check — remains accepted-as-is per that
  decision, and is genuinely mitigated: every severity-rail usage found in this audit is always
  paired with a text label ("Short"/"Medium"/"Long", tier names, rank numbers), never color alone.
  Not re-litigated here, just confirmed still true in the current code.

### Pillar 4: Typography (3/4)

- `global.css:86-97` defines a locked, documented 100-based type scale (`text-100`..`text-hero-1000`)
  and 3 font families (`--font-heading` = IBM Plex Sans Condensed, `--font-base` = IBM Plex Sans,
  `--font-numeric`/`--font-monospace` = IBM Plex Mono) per the design brief. In practice, `.tsx`
  usage is disciplined: `text-200`/`300`/`400`/`500`/`600` for body/label/heading tiers plus
  `text-800` once for the landing hero — a deliberate semantic scale, not sprawl.
- Font weight is extremely disciplined: `font-semibold` is the *only* weight utility used anywhere
  in `.tsx` (19 occurrences, all `font-semibold`, applied to headings/labels/tile values); body text
  relies on the unstyled default weight. Two weights total, at the low end of even the abstract
  "≤2 weights" guideline.
- `font-numeric` (IBM Plex Mono) is correctly reserved for KPI values, stock counts, and detail-panel
  numeric fields (`kpi-strip.tsx:193`, `item-detail-panel.tsx:151`) — matches the brief's intent
  ("tabular figures for KPI values and stock counts") exactly, not applied to body prose.
- **Gap:** `src/ErrorFallback.tsx` and part of `src/components/auth-gate.component.tsx` (the
  unauthenticated/"Can't open this app outside Fabric" branch, lines 44-57) use raw Tailwind
  defaults (`text-sm`, `text-lg`) with no `font-heading`/`font-base` class at all — these two
  screens silently fall back to the system sans-serif stack instead of IBM Plex, breaking
  typographic consistency on the two screens a user sees when something goes wrong.

### Pillar 5: Spacing (3/4)

- `global.css:71-85` defines a strict 4px-grid `--spacing-100`..`800` scale (plus `-nudge` variants
  at `base − 2px`). A full grep of `p-/px-/py-/m-/mx-/my-/gap-` usage across every `.tsx` file
  under `src/components/` and `src/App.tsx` shows near-total adherence — the scale token (e.g.
  `p-400`, `gap-300`, `px-200 py-100-nudge`) is the spacing unit in every production component
  audited (kpi-strip, sales-trend-chart, top-at-risk-list, top-at-risk-drill-through,
  ranked-list-panel, item-detail-panel, reorder-action-form, reorder-action-history, landing-page,
  action-center, App.tsx).
- Arbitrary bracket values (`min-h-[480px]`, `max-w-[1400px]`, `max-h-[640px]`, `max-h-[80vh]`,
  `max-w-[900px]`, `h-[240px]`, `h-[120px]`, `h-[400px]`) are used exclusively for structural
  sizing constraints (card min-heights, modal max-widths, skeleton placeholder heights) — a
  legitimate, deliberate use case distinct from spacing/padding, not scale drift.
- **Gap:** the same two un-migrated files break the pattern — `ErrorFallback.tsx:16-24` uses raw
  Tailwind `p-4`, `p-3`, `px-4 py-2`, `mb-2`, `mb-4` (Tailwind's default numeric scale, not the
  project's named `spacing-*` tokens), and `auth-gate.component.tsx:46-53`'s unauthenticated view
  does the same (`p-4`, `mb-2`, `mb-4`). The values happen to land close to the token grid
  numerically, but bypass the named system, so a future token change (e.g. re-tuning `spacing-400`)
  won't propagate to these two screens.

### Pillar 6: Experience Design (4/4)

- Every async, query-backed component (`KpiStrip`, `SalesTrendChart`, `TopAtRiskList`,
  `TopAtRiskDrillThrough`, `RankedListPanel`, `ItemDetailPanel`, `ReorderActionForm`,
  `LandingPage`'s glimpse section) resolves through the shared `useQueryPanel` hook
  (`src/hooks/use-query-panel.ts`), which normalizes every query result to exactly one of
  `loading | refreshing | error | empty | ready` — a single source of truth for state coverage
  rather than each component reinventing its own branching (an architecture fix already applied
  during a prior `/agent-skills:review` pass per `tasks/todo.md` T5.2).
- Loading state: skeleton/pulse placeholders sized to match the eventual content
  (`animate-pulse` blocks at matched `min-h-*`), not a generic spinner-only state.
- Error state: every error renders `role="alert"` with the real underlying message interpolated
  ("Couldn't load KPI strip: {message}", etc.) — accessible and informative, not a blank failure.
- Empty state: contextual per component and per active filter (e.g. `ranked-list-panel.tsx:160-162`
  distinguishes "No at-risk items right now." from `No at-risk items match "{tier}" lead time.`
  depending on whether a filter is active) — this exact filter-aware empty state was a real bug
  fix documented in `tasks/todo.md` T6.1's follow-up (previously a blank box with no way to change
  the filter).
- Refresh-in-place: filter/selection changes keep the previous result visible at `opacity-50`
  instead of swapping to a blank skeleton (`ranked-list-panel.tsx:152-156`,
  `item-detail-panel.tsx:100-104`, `top-at-risk-list.tsx:158`) — a real UX fix, not incidental,
  explicitly traced in code comments to a user complaint about the transition "going blank."
  A `Loader2` spinner with `aria-label="Updating"` communicates the in-flight state without
  hiding content.
  Disabled state on the reorder submit button while submitting and after success
  (`reorder-action-form.tsx:198`, `disabled={submitState === "submitting" || submitState ===
  "success"}`) prevents accidental double-submit — the one write action in the app is guarded.
- No destructive-action confirmation gap: the only status-change action (`ReorderAction.status`
  dropdown) is non-destructive and reversible (status values, including "Dismissed," are a
  soft-delete per the project's data model — no hard delete exists anywhere), so a confirmation
  dialog isn't warranted here.
- Caveat (informational, not scored against this pillar): full live-Fabric-embedded round-trip
  verification of the write-back create/update paths (T4.1, T5.2, T5.3 in `tasks/todo.md`) remains
  deferred to a real portal session — this is an environment/testing limitation already tracked by
  the team, not a gap in the UI's own state-handling design, which is what this pillar audits.

Registry audit: `components.json` exists (shadcn initialized, `iconLibrary: lucide`), but no
UI-SPEC.md exists to declare third-party registries, so per the registry-audit gate this check does
not apply — skipped, no Registry Safety section added.

---

## Files Audited

- `src/App.tsx`, `src/main.tsx`, `src/ErrorFallback.tsx`, `src/components/auth-gate.component.tsx`
- `src/global.css`, `components.json`
- `src/components/overview/kpi-strip.tsx`, `sales-trend-chart.tsx`, `top-at-risk-list.tsx`,
  `top-at-risk-drill-through.tsx`
- `src/components/action-center/action-center.tsx`, `ranked-list-panel.tsx`,
  `item-detail-panel.tsx`, `reorder-action-form.tsx`, `reorder-action-history.tsx`
- `src/components/landing/landing-page.tsx`
- `src/hooks/use-query-panel.ts`
- `src/lib/severity.ts`
- `docs/wireframe-design-brief.md`, `docs/design-and-dax-references.md`, `tasks/todo.md`,
  `CLAUDE.md` (project status log)
