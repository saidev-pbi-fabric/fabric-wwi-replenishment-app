# Feedback backlog — 2026-08-21 evening session

## RESUME HERE if this session got cut off / compacted

**Scope right now is Step 1 only (items 1–6 below).** Step 2 (items 7–9, Action Center live bugs)
and Step 3 (item 10) are explicitly deferred — they don't block Step 1, do them after, in that
order. User is managing context budget carefully this session (flagged 48% context / 72% session
length used before Step 1 execution started) — that's why scope is intentionally narrow right now.

**If resuming fresh:** read this whole file, then check `git log --oneline -15` and `git status` —
work is meant to be committed incrementally per item (not one giant commit) so partial progress
survives a cutoff. Check which of items 1–6 are actually done in the code before assuming any are
still open — this file is updated to strike through items as they land, but verify against the
diff, don't trust the checklist blindly if it looks stale.

- [x] 1. Global rank-mode toggle (qty ⇄ $) + dynamic labeling — 4 new SM measures (live-verified),
      `RankMode` lifted to App.tsx, shared toggle in header, wired through KpiStrip, ParetoRiskView,
      RankedListPanel, ItemDetailPanel (rank/tier/CSV all mode-aware now).
- [x] 2. Pareto chart y-axis zero-baseline fix — `scale: { zero: true }` explicit, ticks left to
      Vega's automatic "nice" selection (no hardcoded step).
- [x] 3. Currency M → B dynamic formatting — centralized `formatCompactCurrency`/`formatCompactNumber`
      in `src/lib/utils.ts` (deduped 3 local copies), both handle the B tier now.
- [x] 4. Default chart-window toggle = Fixed (B).
- [x] 5. Dense-rank tie collision fix — chart x-position now uses a sequential `ChartSlot` (always
      unique), displayed rank (`DisplayRank`, can tie) is tooltip-only; selection keys off
      `StockItemKey` instead of rank, for the same reason.
- [x] 6. Table scrollbar/empty-space CSS fix — `pr-200` on the scroll container so the scrollbar
      no longer sits on top of the "Cum. %" column.

92/92 tests, tsc/lint clean vs. documented baseline, `npm run build` clean. All 4 new SM measures
live-verified against the real model before wiring (top qty item, cumulative monotonicity).
Not yet deployed/user-confirmed against the live app — see commit log for when `npx rayfin up` ran.

## LOCKED WORK ORDER (as of last discussion) — each basis-tagged, nothing starts until user says go

1. **Global rank-mode toggle** (Feedback) — one synced control (App.tsx level, visible both
   pages), qty ⇄ $ value, drives Overview + Action Center together. Needs 2 new SM measures
   (`Suggested Reorder Qty Share %`, `Cumulative Suggested Reorder Qty %`, mirroring the existing
   $ ones off `At Risk Rank`). Subsumes the earlier separate "add Qty column" ask — Qty becomes
   the primary column in qty-mode, not a bolt-on.
   - Dynamic labeling (Feedback, folded into #1): headline/axis/table-header/tooltip/CSV text
     must switch between $ wording and qty wording with the toggle — not hardcoded either way.
2. **Y-axis not zero-based on the Pareto chart** (Live-data/rendering bug, found from screenshot)
   — bars compress into a narrow band near the top, short bars nearly invisible. Fix: force
   `scale: { zero: true }` explicitly (currently relying on an unconfirmed default), and let tick
   step auto-select ("nice" ticks) instead of a hardcoded step, so it scales correctly whether the
   axis is showing $200M or a qty-mode range of a few thousand units.
3. **Currency should switch M → B dynamically** past ~$999M (Feedback).
4. **Default chart-window toggle = "B — Fixed window"**, not "A — Dynamic" (Feedback).
5. **Dense-rank tie collision** — two items sharing one rank number collide on one chart x-slot
   (Live-data bug, side effect of today's rank fix). Chart needs a unique per-bar x-position,
   separate from the displayed (tie-able) rank.
6. **Table scrollbar overlapping the "Cum. %" column + excess empty space above the table**
   (Live rendering bug, CSS).

Items 1–6 above all touch the same Overview chart component — building them together (one
component, one pass) avoids rebuilding it twice; this is NOT the same as the earlier "batch
everything" failure, which mixed unrelated files/bugs across two pages.

7. **Action Center sparklines still blank past ~rank #149** (Live bug, needs fresh diagnosis —
   yesterday's lazy-load fix didn't fully solve it).
8. **Reorder Actions: "Unknown date" + blank Qty** (Live bug, needs fresh diagnosis — the
   `parseApiDate` fix only replaced crash text, didn't fix the underlying value).
9. **Audit Trail: blank field/old/new values + "Unknown date"** (Live bug, needs fresh diagnosis
   — may be missing data at the record level, not just formatting).
10. **Item Detail panel blank/black in one screenshot** — needs user clarification first (no item
    selected, or real bug?) before touching code.

**Parked, not committed, only if time remains:**
- `Total Profit` as supplementary context somewhere (not a ranking change).
- A date-range filter/slicer — flagged during discussion as a real gap, never explicitly
  requested as a build item; ask before building.


Working log of everything currently open, so nothing gets lost across a break/compact/restart.
Per [[feedback_root_cause_and_stop_on_repeat]] (Claude memory): one item at a time, user checks
and approves each before the next.

## Open — needs a decision from the user

1. **Action Center vs Overview ranking alignment.** Overview's Pareto view now sorts/cumulates by
   $ Reorder Value (`Reorder Value Rank`); Action Center's ranked list still sorts by qty × lead
   time (`At Risk Rank`) — an explicit choice made earlier today, now being questioned since the
   two pages read inconsistently side by side. Decision needed: align both to $, or keep
   deliberately split and say so explicitly in the UI so it doesn't read as a bug.

## Open — small Overview chart/table fixes (agreed bundle, not yet built)

2. Currency formatting should switch M → B dynamically once a value crosses ~$999M (currently
   only formats K/M).
3. Default chart-window toggle should be "B — Fixed window", not "A — Dynamic".
4. Y-axis gridline step: try $10M increments instead of the current $50M, "want to see how it
   looks" — experimental, not a final decision yet.
5. **Real bug**, not cosmetic: two items tied at the same `Reorder Value Rank` (dense rank) share
   one x-axis slot on the chart, so their bars visually collide. Chart needs a unique per-bar x
   position, separate from the *displayed* rank (which can legitimately tie in the table).
6. Add `Suggested Reorder Qty` and `Lead Time Days` as extra columns on the Overview Pareto table
   (both already exist as measures/columns, confirmed live — no new SM work needed).
7. Table's internal scrollbar visually overlaps the "Cum. %" column; also excess empty space
   between the chart's bottom axis label and the table start. CSS fix.

## Open — Action Center bugs, need real live re-diagnosis (not another guess-patch)

8. Sparklines in the ranked list are still blank past roughly rank #149. The lazy
   `IntersectionObserver` fix from earlier today didn't fully solve it — root cause unconfirmed.
9. Reorder Actions panel shows "Unknown date" and a blank Qty. The `parseApiDate` fix (assumed a
   DAB SQL `datetime2` string-format quirk) did not actually fix the underlying value — the
   fallback text just replaced the crash text. Real format still unconfirmed; Qty being blank is a
   separate, uninvestigated issue.
10. Audit Trail entries render almost empty (`— : →`, blank field/old/new values) plus "Unknown
    date". Looks like it could be missing data at the record level, not just a display-formatting
    problem — needs inspecting the actual API response before touching code again.
11. Item Detail panel appeared blank/black in one screenshot — unclear if a real rendering bug or
    just no item selected in that view. Needs the user to confirm which before chasing it.

## Parked, not blocking

12. `Total Profit` / `Total Sales Excluding Tax` exist as base measures (since 8/17) but are
    unused by any ranking. Recommendation: don't swap the core ranking to profit this close to the
    hackathon (breaks the locked "reorder risk" scope) — instead surface profit as supplementary
    context somewhere (e.g. a line in Item Detail), later, not urgent.

## Resolved this session, for reference (don't re-open without a new symptom)

- Pareto chart's line/dot/dual-axis layer removed — mockup-faithful bars + cutoff rule only.
- 672 → 219 item count fix: filtered to `Reorder Value Total > 0` (zero-recent-sales items
  excluded from the Pareto/KPI view; they contributed $0 either way, no analysis lost).
- `Reorder Value Rank` measure added; `Cumulative Reorder Value` now accumulates by $ value, not
  qty rank — fixes the "$182M item wasn't rank #1" bug.
- Overview panel title/caption restored to match `docs/mockup-reference.html`
  ("Reorder Risk Concentration" + its explanatory line).
- Action Center's redundant page-level "Action Center" H1 removed (nav tab already shows it).
- Item Detail panel's forced `min-h-[480px]` removed (was creating dead space before the next
  card); Ranked list's height changed from a fixed `max-h-[640px]` to viewport-relative.
- `$` Value column added to the Overview Pareto table.
- A/B chart-window toggle ("Dynamic" / "Fixed window") wired as a real, live, switchable control.
- `Invalid Date` crash text replaced with a graceful fallback (though see #9/#10 above — the
  underlying value still isn't parsing correctly, this only stopped the crash-looking text).
