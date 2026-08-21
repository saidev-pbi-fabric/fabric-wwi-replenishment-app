# UI Audit Findings — 2026-08-22, Explained

From the `gsd-ui-auditor` run this session (score 20/24, up from 19/24 on 8/19). Full scored
report: `docs/UI-REVIEW.md`. This file exists because the original 3-bullet summary was too terse
— written out in plain language, **not fixed yet**, deferred given session/weekly limit pressure
on 2026-08-22 (event day). Fix in this priority order when there's a slot.

---

## 1. Quantity input has no guard rail — real risk for the live demo

**File:** `src/components/action-center/reorder-action-form.tsx:156-161`

**What's wrong, in plain terms:** the "Quantity" field on the write-back form is a plain
`<input type="number">` with no `min` or `step` attribute set. That means nothing stops someone
(including a judge poking at the live demo out of curiosity) from typing `-50` or `12.7` and
hitting Submit — it would go through and get stored as a real `ReorderAction` row with a negative
or fractional reorder quantity. Not a crash, just a silently wrong, nonsensical number sitting in
the write-back data — the kind of thing that looks bad if a judge notices it live.

**What the fix looks like:** add `min={0}` and `step={1}` to that `<input>` element (matches how
HTML number inputs normally guard against this — the browser itself will then refuse negative/
fractional entry via the spinner arrows and typically on submit). ~2 lines of code, no test
changes needed beyond maybe one assertion. Lowest-effort, highest-payoff item on this list.

---

## 2. New toggle/chip controls don't show a focus ring like the rest of the app

**Files:** `src/App.tsx:168-181` (Rank Mode Qty/$ Value toggle, Theme toggle), `src/components/action-center/ranked-list-panel.tsx:121-136` (Tier A/B/C filter chips), `src/components/overview/pareto-risk-view.tsx:256-269` (Chart Window A/B toggle)

**What's wrong, in plain terms:** every button in this app is supposed to show a visible blue ring
around itself when you reach it by pressing Tab on the keyboard (not by clicking) — that's the
`focus-visible:ring-2 focus-visible:ring-ring` pattern used everywhere else, e.g. `NavTab` in
`App.tsx`. The newer pill-style controls built this week (the Qty/$Value toggle, the Tier A/B/C
chips, the Chart Window A/B toggle) were built without that same styling — they still *work* with
a keyboard (Tab still lands on them, Enter/Space still activates them), they just don't *show* a
visible ring when they have focus. So a keyboard-only user (or anyone tabbing through to check
accessibility) sees some buttons highlight clearly and others give no visual signal at all — reads
as inconsistent/half-finished, even though functionally nothing is broken.

**What's needed:** add the same `focus-visible:outline-none focus-visible:ring-2
focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` class
string (copy-paste, it's already used verbatim in ~6 other places in this codebase) onto the
`<button>` elements in those three files. Pure CSS-class addition, zero logic change.

---

## 3. Sales-trend chart is always red, regardless of whether the trend is actually bad

**File:** `src/components/action-center/item-detail-panel.tsx:178`

**What's wrong, in plain terms:** in the Action Center's item detail panel, there's a small chart
showing the item's daily sales trend, and right next to it a plain-English sentence like "Sales
rate accelerating +34%" or "declining -12%" or "steady." The sentence correctly changes based on
the item's real trend direction. But the *chart itself* is hardcoded to always render in the same
alarm-red color (`text-critical`) no matter what the sentence says — so even an item whose trend
is described as improving/steady still gets shown with a red "danger" chart. The visual and the
text are telling two different stories for the same item.

**What's needed (not yet built, this is the gap, not a prescribed fix):** the trend direction is
already computed elsewhere in this same component (it's what generates the rationale sentence) —
that same computed direction needs to drive the chart's color too, picked from the app's existing
3-color severity scale (`critical` / `at-risk` / `on-track`, already defined in `global.css` and
already used for the tier-color rail elsewhere in this app) instead of a hardcoded single color.
This is slightly more than a copy-paste fix (2 is) — it needs figuring out the direction→color
mapping and threading it into the chart component's className, but it's still a small, contained
change, not a redesign.
