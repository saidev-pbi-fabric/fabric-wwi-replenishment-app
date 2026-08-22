# Talk Track — WWI Replenishment

**Rebuilt 2026-08-22, from source, not from the prior draft.** Every line below was checked against
the actual component/DAX that renders it (file noted per section) rather than carried over from
the last version of this doc — this project's own standing lesson is that prose paraphrases drift
from what's really on screen. Target: **~2 minutes script, 5 minutes total slot** (leaves ~3
minutes for judge Q&A). Live app demo only, no slide deck.

Rehearse out loud at least once before the room — written pacing and spoken pacing are never the
same length.

---

## 0:00–0:20 — Hook (Landing page)

*Grounded against `src/components/landing/landing-page.tsx` — hero heading + subhead, verbatim
test-locked copy.*

> "Picture Monday morning: 672 stock items, and no way to tell which ones actually need attention
> first. [gesture at the headline] Twenty percent of this catalog is carrying eighty percent of
> the reorder risk. This app ranks stock items by sales velocity against supplier lead time, shows
> exactly how concentrated that risk is, and lets you act on it without leaving the app."

**Cue:** open on Landing. The headline, the concentration-preview chart, and the live KPI teaser
tiles (Items Tracked / Avg Lead Time / Accelerating Demand) are all on screen already — no scroll
needed. Click "Open the dashboard" on "act on it."

---

## 0:20–1:00 — Overview: Qty by default, then the dollar reveal

*Grounded against `src/App.tsx` (rank mode now defaults to `"qty"`) and
`src/components/overview/pareto-risk-view.tsx` (the live headline sentence, cutoff slider, Rank By
toggle).*

> "This opens on the quantity-ranked view — the plain operational number, not dollars. [point at
> the headline sentence] It reads live off the model: N% of at-risk reorder quantity is generated
> by this many of the tracked items. One honesty note: this sample has no stock-on-hand or
> backorder table anywhere, just sales, so this rank is a disclosed proxy — velocity against
> lead time — not real inventory data. It says so on screen, not just here."
>
> "Now watch this —" *(flip Rank By to $ Value)* "— same items, ranked by dollar exposure instead.
> Quantity and dollar value are genuinely different lists, and this toggle is synced across the
> whole app instead of us quietly picking one."
>
> "This slider —" *(touch the cutoff slider)* "— is live. Drag it, the split recomputes in real
> time, and the KPI tiles above react with it."

**Cue:** default view is already Qty on load — no action needed. Flip Rank By to $ Value live on
"watch this," read the actual current headline number off screen rather than a memorized figure.
Move the cutoff slider once. Click one ranked table row to transition to Action Center.

---

## 1:00–1:40 — Action Center: the "why," then the write-back

*Grounded against `src/components/action-center/item-detail-panel.tsx` (rationale line, formula,
disclosures) and `src/components/action-center/reorder-action-form.tsx` /
`reorder-action-audit-log.tsx` (form fields, submit behavior, Audit Trail panel).*

> "This is the item I clicked through on — instead of just a rank number, we compose a
> plain-English rationale right under the name —" *(read it aloud)* "— tier, rank, sales trend
> versus lead time, built from fields already on screen, no separate AI call. Below that, real
> daily sales history for this item, and we say plainly there's no forecast line — this dataset's
> DAX has no forecast measure, so we don't draw one."
>
> "Now the write-back: suggested reorder quantity is pre-filled from the same disclosed formula —
> recent daily sales rate times this item's own lead time times a safety buffer, not a generic
> 30-day window. Supplier and Assigned To are real dropdowns, not free text — Assigned To is the
> actual people with access to this Fabric workspace. I set a status, submit —" *(submit live)*
> "— and it's recorded, along with an Audit Trail entry: what changed, who changed it, when.
> Refresh the page —" *(reload)* "— still there, audit trail still there."

**Cue:** if you navigated here directly via the nav tab rather than clicking through from Overview,
the #1-ranked item is already auto-selected — the detail column is never empty on first load. This
is the demo's one true live-action moment — rehearse the click sequence (read rationale → fill
status → Submit → point at the Audit Trail entry → reload → show it persisted) enough times it's
muscle memory, not read off a script live.

---

## 1:40–2:00 — Close

> "Everything you saw runs on stock Fabric building blocks — Warehouse Copy Job, an Import-mode
> semantic model, and a Fabric Data App for the UI and write-back. A report could have shown you
> that chart. It couldn't have let you act on it, logged who did, and proven it survived a
> refresh — that's why this had to be an app, not a report. One app, one loop: see the
> concentration, act on it, track it."

**Cue:** land back on Overview or Landing for the final frame — don't end mid-scroll on Action
Center.

---

## If asked in Q&A

*Every answer below checked against the current code, not memory.*

- **"Why Import mode, not Direct Lake?"** — at this data scale (trial capacity, not tens of
  millions of live rows) both modes need the identical setup flow, and Import additionally
  supports calculated columns/hybrid tables and skips Direct Lake's SKU-guardrail fallback
  behavior — a real risk to debug under hackathon time pressure.
- **"Is the reorder quantity a real forecast?"** — No. `reorder-action-form.tsx`/
  `item-detail-panel.tsx`: `Recent Daily Sales Rate × this item's own Lead Time Days × a safety
  factor`. No forecasting model — we don't have the data to claim one, so we don't pretend to.
- **"Is this actually predicting risk, or just ranking by value?"** — Fair challenge, and they're
  different claims. Ranking by $ value alone is classic ABC/Pareto inventory classification, not
  novel. The risk signal is the *other* rank — velocity vs. lead time — and it's never claimed as
  validated against real stockout outcomes, because this sample has no stock/backorder table to
  validate against. Said explicitly rather than dressing a heuristic up as a model.
- **"Isn't this just a Power BI report?"** — Power BI *can* build a Pareto view, but it needs the
  same hand-written DAX rank/cumulative measures this app has — parity, not an edge. Where it
  can't follow is write-back: Power BI has none natively, so the equivalent means bolting on Power
  Apps plus Power Automate plus a separate table — three tools stitched together. This is one
  coherent Fabric Data App with write-back and an audit trail built in.
- **"Can the same item get more than one reorder action logged?"** — Yes, but the form soft-blocks
  a second submit for the *same selection* (`reorder-action-form.tsx`: the Submit button disables
  after success until you reselect the item) — not a hard one-per-item limit. A real ops tool
  needs to support multiple purchase-order-style actions per item over time; there's no hard-delete
  in this app (`Dismissed` status is the soft-delete), so a true block would trap genuine mistakes.
- **"Why no confirmation dialog before a status change?"** — Checked live in
  `reorder-action-history.tsx`: none exists, by design. This is a many-times-a-day internal tool,
  and every change is already audit-logged (old value, new value, who, when) — traceability instead
  of click-friction, same pattern tools like Jira use for status transitions.
- **"What would you build next?"** — A real Fabric Data Agent / Copilot layer for natural-language
  questions over the semantic model — deliberately out of scope for a build-week timeline.

---

## Timing checklist (fill in during rehearsal)

- [ ] Full run, stopwatch, under 2:15 total including one stumble-recovery — leaves real Q&A room
      inside the 5-minute slot
- [ ] Confirm live, right before the room: Rank By opens on Qty (not $ Value) on both Overview and
      Action Center; flipping it live still shows a real $-concentration jump
- [ ] Read the actual current headline number off the Overview screen during rehearsal instead of
      quoting a number from memory — it's computed live and can drift as the underlying data
      refreshes
- [ ] Confirm landing on Action Center via the nav tab (not via Overview click-through)
      auto-selects the #1 item and the detail column is never blank
- [ ] Write-back submit + reload confirmed working on the actual deployed app immediately before
      the run-through
- [ ] Landing → Overview → Action Center transitions all confirmed smooth, no dev-preview badges
      visible (testing against the live Fabric embed, not `npm run dev`)
- [ ] Cutoff slider and Rank By toggle both demoed live at least once during rehearsal
