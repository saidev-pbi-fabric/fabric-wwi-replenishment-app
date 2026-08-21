# Fabric WWI Replenishment App — UI Review

**Audited:** 2026-08-22 (re-audit of the 2026-08-21 mockup-fidelity rebuild, branch `rebuild/pareto-thesis`)
**Baseline:** No UI-SPEC.md exists. Audited against `docs/mockup-reference.html` (the locked
ground-truth HTML/CSS this rebuild was built against verbatim) plus the abstract 6-pillar
standards and the locked design tokens in `src/global.css`.
**Screenshots:** Not captured — no dev server detected on `:5173`/`:3000` this session (code-only
audit), consistent with the project's own "don't self-check with Playwright by default" note.
All findings are read directly from source.

**Context:** This supersedes the 2026-08-19 review (19/24) — the app has been substantially
rebuilt since (sparklines removed from the ranked list, ranked list now shares Overview's Pareto
dataset instead of a second query, ABC value-tier replaced Lead Time Priority Tier as the
color/filter axis, new sliding-pill rank-mode + theme toggles, dropdown fields on the reorder
form, y-axis chart fixes). All 3 priority findings from the last review were independently
re-checked and confirmed fixed — see "Carried-forward fixes, verified" below.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | Every string is specific and on-voice, including the crash screen — the one gap flagged last time (`ErrorFallback.tsx`) is fixed. |
| 2. Visuals | 3/4 | Three new pill-style controls (Rank Mode toggle, ABC tier chips, Chart Window A/B toggle) don't carry the app's own `focus-visible:ring` treatment that every other interactive control uses. |
| 3. Color | 3/4 | Light-mode palette fix from last review confirmed live in `global.css`; new nit: the item-detail sales-trend chart is hardcoded `text-critical` (red) for every item regardless of actual trend direction. |
| 4. Typography | 3/4 | Font-weight discipline regressed from 1 weight (all `font-semibold`) to 4 (`font-normal/medium/semibold/bold`) across the rebuilt components — organized, not sprawl, but worth a note. |
| 5. Spacing | 4/4 | The two previously-flagged un-migrated files (`ErrorFallback.tsx`, `auth-gate.component.tsx`) now use the token scale throughout — fully fixed. |
| 6. Experience Design | 3/4 | Excellent state coverage app-wide; the one live write-back field (reorder Quantity) has no `min`/`step` guard, so the demo's write-back moment can accept a negative or fractional quantity. |

**Overall: 20/24** (up from 19/24)

---

## Top 3 Priority Fixes

1. **Reorder Quantity field has no floor or step guard — the one write-back moment in the demo can silently accept garbage input.**
   `src/components/action-center/reorder-action-form.tsx:156-161` — the Quantity `<input type="number">`
   has no `min`, `step`, or client-side clamp before `getRayfinClient().data.ReorderAction.create()`
   is called (line 122). A judge or presenter fat-fingering the field (`-50`, `3.75`) writes it
   straight into the audit-tracked record with no guard rail, during exactly the feature the
   talk-track is built around. Fix: add `min={0}` and `step={1}` to the input, and either
   `Math.max(0, Math.round(...))` the value on submit or disable submit while invalid — a
   five-minute fix with outsized demo risk if skipped.

2. **New pill-style toggles/filters don't carry the app's own focus-ring treatment.**
   Every other interactive control in the app (`NavTab` — `src/App.tsx:128-134`, `ThemeToggle` —
   `src/App.tsx:200`, the ranked-list search input and rows — `ranked-list-panel.tsx:118,187`) uses
   the consistent `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` pattern.
   Three controls added in this rebuild don't: the Rank Mode toggle buttons
   (`src/App.tsx:168-181`), the ABC tier filter chips (`ranked-list-panel.tsx:121-136`), and the
   Chart Window A/B toggle (`pareto-risk-view.tsx:256-269`). They still get a browser-default focus
   outline (not fully inaccessible), but it's visually inconsistent with the rest of the app and
   worth matching before a judge tabs through the UI. Fix: reuse the same `focus-visible:ring-2
   focus-visible:ring-ring focus-visible:ring-offset-2` classes already defined on `NavTab`.

3. **Item-detail sales-trend chart is always rendered in alarm-red, regardless of the item's actual trend.**
   `src/components/action-center/item-detail-panel.tsx:178` hardcodes `className="text-critical"`
   on `<ItemTrendChart>` for every selected item. The same panel's own rationale sentence (line
   116) correctly distinguishes "accelerating" / "steady" / "declining" — but the chart next to it
   is red no matter which. A judge who reads the rationale text and then looks at a "declining" or
   Tier-C item's chart glowing red sees a mismatch that undercuts the app's own severity-color
   system. Fix: tie the chart's color class to `trendWord` (e.g. `on-track` for declining/steady,
   `critical` only for accelerating) or switch it to a neutral `text-foreground`/`text-primary`
   since it isn't itself a severity signal.

---

## Carried-forward fixes, verified

- **Light-mode neutral ramp** (previously the #1 finding) — `global.css:20-46` now has the exact
  widened steps recommended last time (`background #ffffff`, `secondary #f7f7f8`,
  `muted #eef0f2`, `accent #eef1f4`, `border #d6d9dd`). Confirmed fixed.
- **`ErrorFallback.tsx` generic copy/raw Tailwind** (previously #2) — now reads "Something broke
  while loading the dashboard" / "Reload" and uses the token spacing/type scale throughout
  (`p-400`, `mb-100`, `mb-400`, `font-heading`, `text-400`). Confirmed fixed. One tiny residual:
  `auth-gate.component.tsx:22`'s "Connecting to Fabric…" loading state still uses raw `text-sm`
  instead of `text-200` — cosmetic, shown for a fraction of a second during embed load, not worth
  a top-3 slot.
- **Truncated item names with no fallback** (previously #3) — `title={row.stockItem}` is now
  present on every truncated name span (`ranked-list-panel.tsx:198`, `pareto-risk-view.tsx:327`).
  Confirmed fixed.

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

- No generic patterns found anywhere (`grep -rn "Submit\b|Click Here|>OK<|>Cancel<|>Save<" src`
  returns only the specific "Submit Reorder Action" label and an internal `handleSubmit`
  identifier — no bare generic strings).
- Empty/error states remain specific and contextual per component: "No items match \"{query}\".",
  "No items in Tier {X}.", "No reorder actions recorded yet for this item.", "No changes recorded
  yet for this item.", "Couldn't load the audit log: {message}".
- The item-detail rationale sentence (`item-detail-panel.tsx:121-124`) is genuinely strong,
  specific domain copy composed client-side from fields already on screen — reads as authored,
  not templated.
- The disclosure copy ("No stock-on-hand figure exists anywhere in this dataset…",
  `item-detail-panel.tsx:197-202`) is honest and specific — a real strength for a hackathon judge
  audience who will ask exactly this question.
- `ErrorFallback.tsx` — the one gap from the last audit — is fixed (see "Carried-forward fixes"
  above).

### Pillar 2: Visuals (3/4)

- Clear per-page focal point retained: landing hero, Overview's KPI strip → Pareto chart → table,
  Action Center's list/detail split.
- Icon-only controls all have labels: `ThemeToggle` (`App.tsx:198`), status `sr-only` label
  (`reorder-action-history.tsx:147`), search input `aria-label` (`ranked-list-panel.tsx:117`),
  cutoff slider `aria-label` (`pareto-risk-view.tsx:235`). No bare unlabeled icon-only control
  found.
- Severity-rail motif still applied consistently as the one signature detail — KPI tile left
  border, ranked-list row dot, Pareto table row dot — now driven by the new ABC value tier
  (`VALUE_TIER_RAIL_CLASS` in `src/lib/severity.ts`) instead of the retired Lead Time tier, and
  matches the locked mockup's `rail critical`/`rail at-risk` KPI classes exactly
  (`docs/mockup-reference.html:258-260` vs `kpi-strip.tsx:174-196`) — verified no drift.
- **Gap:** the Rank Mode toggle (`App.tsx:168-181`), ABC tier filter chips
  (`ranked-list-panel.tsx:121-136`), and Chart Window A/B toggle (`pareto-risk-view.tsx:256-269`)
  — all three new/rebuilt this cycle — don't carry the `focus-visible:ring` treatment used
  everywhere else in the app. See Top 3 Fix #2.
- Minor: the reorder form's Supplier dropdown is honestly disclosed as illustrative/unbacked by
  real data in a code comment (`rayfin-client.ts:77-81`) — correct call given the loaded WWI
  sample has no `Dimension.Supplier` table, not a visual gap, just noted for completeness.

### Pillar 3: Color (3/4)

- Light-mode fix confirmed live (see "Carried-forward fixes").
- Accent discipline maintained: `grep -rn "text-primary|bg-primary|border-primary" src --include=*.tsx`
  returns a small, deliberate set (nav tab, landing CTA/step numerals, reorder submit button, rank
  input accent, cutoff slider highlight) — no overuse.
- No hardcoded hex found in any `.tsx` file (`grep -rn "#[0-9a-fA-F]{3,8}" src --include=*.tsx`
  returns zero matches). The one hex duplication that exists is in `pareto-chart-spec.ts`
  (`CUTOFF_COLOR_RANGE`, `CUTOFF_RULE_COLOR`) — a `.ts` file, not `.tsx`, and explicitly documented
  as a required exception because Vega-Lite's SVG renderer can't resolve `var(--color-*)`. Values
  are kept in sync with `global.css` by comment convention — same legitimate exception pattern as
  the last audit found, still holding.
- **Gap:** `item-detail-panel.tsx:178` passes `className="text-critical"` to `<ItemTrendChart>`
  unconditionally — every item's sales-trend line renders in the same alarm-red regardless of
  whether that item's trend is accelerating, steady, or declining. See Top 3 Fix #3.
- The CVD (color-vision-deficiency) finding accepted-as-is in the last review — the red/amber/green
  severity triad fails a ΔE-2.0 protanopia check — remains true and remains mitigated the same way:
  every severity-rail/tier usage is paired with a text label (tier letter, rank number, tier chip
  label), never color alone. Not re-litigated, just re-confirmed still true.

### Pillar 4: Typography (3/4)

- Type scale usage remains disciplined: `text-100`..`text-600` plus `text-800` once for the
  landing hero, matching `global.css:88-97`'s locked 100-based scale — no drift into raw Tailwind
  size classes except the one noted below.
- **Gap:** font-weight usage widened since the last audit. The last review found `font-semibold`
  as the *only* weight utility in `.tsx` (19 occurrences). This audit finds 4 distinct weights in
  use: `font-bold` (App.tsx logo mark, landing hero, Pareto headline numbers), `font-semibold`
  (headings/labels, still the majority), `font-medium` (nav tabs, rank-toggle labels), and
  `font-normal` (Pareto table header cells, explicitly overriding a default). Each use is
  purposeful and hierarchy-driven, not random, but it's now above the abstract "≤2 weights"
  guideline and a real change from the previous audit's tighter baseline — worth a pass to
  consolidate to 2-3 weights if there's time, not urgent for tomorrow.
- `font-numeric` (IBM Plex Mono) remains correctly reserved for KPI/stat values and table numeric
  columns — no drift there.
- One raw Tailwind leftover: `auth-gate.component.tsx:22` uses `text-sm` instead of `text-200` —
  see "Carried-forward fixes," cosmetic only.

### Pillar 5: Spacing (4/4)

- Full adherence to the `--spacing-100`..`800` token scale across every rebuilt component audited
  (`App.tsx`, `pareto-risk-view.tsx`, `kpi-strip.tsx`, `ranked-list-panel.tsx`,
  `item-detail-panel.tsx`, `reorder-action-form.tsx`, `reorder-action-history.tsx`,
  `reorder-action-audit-log.tsx`, `landing-page.tsx`).
- Arbitrary bracket values (`min-h-[480px]`, `h-[calc(100vh-200px)]`, `max-w-[220px]`,
  `min-w-[64px]`, `w-[28px]`/`w-[72px]`/`w-[92px]` for fixed-width table columns, `h-[14px] w-[4px]`
  for the severity rail dot) remain exclusively structural sizing, not spacing drift — same
  legitimate pattern the last review found, still holding, and slightly more of them now due to
  the new fixed-width table columns in `ranked-list-panel.tsx`/`reorder-action-audit-log.tsx` —
  all justified by real layout constraints (column alignment), not arbitrary padding choices.
- The two previously-flagged un-migrated files (`ErrorFallback.tsx`, `auth-gate.component.tsx`)
  now use `p-400`, `mb-100`, `mb-400` (token scale) throughout instead of raw Tailwind `p-4`/`mb-2`.
  Fully fixed — no more spacing-scale exceptions found anywhere in `src/`.

### Pillar 6: Experience Design (3/4)

- Every query-backed component still resolves through the shared `useQueryPanel` hook or an
  equivalent local `loading | ready | error | empty` state machine (`ReorderActionHistory`,
  `ReorderActionAuditLogPanel` intentionally use their own local version since they're
  imperative-mutation components, not pure query panels — consistent, not a regression).
- Refresh-in-place is preserved and, notably, a real race condition was found and fixed this
  rebuild cycle: `action-center.tsx:35-43`'s comment documents that `ReorderActionHistory`'s
  optimistic merge-not-replace update (`reorder-action-history.tsx:69`) is deliberately *not*
  followed by a forced refetch, because an earlier version's refetch could race its own write and
  clobber fresh state with stale data — a genuine correctness fix, not just polish.
  Disabled-state guard on the reorder submit button remains (`reorder-action-form.tsx:218`).
- Loading/error/empty states remain comprehensive and specific across all 8 async-backed
  components audited, each with its own contextual message (see Pillar 1 examples).
- Audit trail (`ReorderActionAuditLogPanel`) is a genuinely strong addition since the last audit —
  a full, append-only, human-readable change log per item, not just a raw table.
- **Gap:** the Quantity `<input type="number">` in `reorder-action-form.tsx:156-161` has no `min`,
  `step`, or submit-time validation — the only numeric write-back field in the app can accept a
  negative or fractional value with no guard. See Top 3 Fix #1.

Registry audit: `components.json` exists (shadcn initialized), but no `UI-SPEC.md` exists to
declare third-party registries, so per the registry-audit gate this check does not apply —
skipped, no Registry Safety section added (same as the last audit).

---

## Files Audited

- `src/App.tsx`, `src/ErrorFallback.tsx`, `src/components/auth-gate.component.tsx`, `src/global.css`
- `src/components/landing/landing-page.tsx`
- `src/components/overview/kpi-strip.tsx`, `pareto-risk-view.tsx`, `pareto-chart-spec.ts`
- `src/components/action-center/action-center.tsx`, `ranked-list-panel.tsx`,
  `item-detail-panel.tsx`, `item-trend-chart.tsx`, `reorder-action-form.tsx`,
  `reorder-action-history.tsx`, `reorder-action-audit-log.tsx`
- `src/lib/severity.ts`, `src/lib/rayfin-client.ts` (constants only)
- `docs/mockup-reference.html` (ground-truth comparison), `docs/UI-REVIEW.md` (prior audit,
  compared for carried-forward fix verification), `CLAUDE.md` (project status log)
