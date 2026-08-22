# Talk Track — WWI Replenishment

**Rewritten 2026-08-22, event-day final pass** — restructured for two things that changed after the
last version: (1) the app now opens on **Qty** rank mode, not $ Value, so the dollar number is now a
live reveal instead of the opening frame; (2) the landing page grew a "why you can trust the
numbers" trust strip, which meant the old standalone 20-second "dataset honesty" block could be
folded into the Overview beat instead of spending its own slot. Target: **~2 minutes script, 5
minutes total slot** (leaves ~3 minutes for judge Q&A). Live app demo only, no slide deck.

Rehearse out loud at least once before the room — written pacing and spoken pacing are never the
same length. This doc doubles as source material for a NotebookLM audio overview/slide deck —
see `docs/project-summary-for-notebooklm.md` for the deeper background material to pair with it.

---

## 0:00–0:20 — Hook (Landing page)

> "Picture Monday morning: 672 stock items, and no way to tell which ones actually need attention
> first. [gesture at the headline] Twenty percent of this catalog is carrying eighty percent of
> the reorder risk — that's not a slogan, it's what this app finds, and it lets you act on it
> without leaving the app."

**Cue:** open on the Landing page with the headline and concentration-preview chart both visible
while speaking. Click "Open the dashboard" on the word "act."

---

## 0:20–1:00 — Overview: Qty by default, then the dollar reveal

> "This opens on the quantity-ranked view — the plain operational number. 219 items are worth
> ranking here; the other 453 in the dataset had zero recent sales, so they're excluded outright,
> not just filtered down. One honesty note before we go further: this sample has no stock-on-hand
> or backorder table anywhere — just sales — so this rank is a disclosed proxy, sales velocity
> against supplier lead time, not real inventory data. We say that on-screen, not just in this
> talk."
>
> "Now watch this —" *(flip Rank By to $ Value)* "— same 219 items, ranked by dollar exposure
> instead. The single highest item here is $182 million. Quantity and dollar value are genuinely
> different lists, and this toggle is synced across the whole app instead of us quietly picking
> one and hoping nobody asks."
>
> "This slider —" *(touch the cutoff slider)* "— is live: 80% of dollar-ranked reorder value sits
> in just 63 of these 219 items. Drag it, the split recomputes in real time."

**Cue:** default view is already Qty on load — no action needed to show it. Flip the Rank By
toggle live to $ Value on "watch this." Move the cutoff slider once. Click one ranked row to
transition to Action Center.

---

## 1:00–1:40 — Action Center: the "why," then the write-back

> "This is the item I clicked through on. Instead of just a rank number, we compose a
> plain-English line right under the name —" *(read it aloud)* "— built from fields already on
> screen, no separate AI call. Below that, real daily sales history for this item."
>
> "Now the write-back: suggested reorder quantity is pre-filled from the same disclosed formula —
> recent daily sales rate times this item's own lead time, not a generic 30-day window. Supplier
> and Assigned To are real dropdowns, not free text — Assigned To is the actual people with access
> to this Fabric workspace. I set a status, submit —" *(submit live)* "— and it's recorded, along
> with an audit-trail entry: what changed, who changed it, when. Refresh the page —" *(reload)* "—
> still there, audit trail still there."

**Cue:** this is the demo's one true live-action moment — rehearse the click sequence (select item
→ read rationale → fill status → Submit → point at the audit trail entry → reload → show it
persisted) enough times it's muscle memory, not read off a script live.

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

- **"Why Import mode, not Direct Lake?"** — at this data scale (trial capacity, not tens of
  millions of live rows) both modes need the identical setup flow, and Import additionally
  supports calculated columns/hybrid tables and skips Direct Lake's SKU-guardrail fallback
  behavior — a real risk to debug under hackathon time pressure.
- **"Is the reorder quantity a real forecast?"** — No, and we say so in the app: it's
  `Recent Daily Sales Rate × this item's own Lead Time Days × a safety factor`. No forecasting
  model — we don't have the data to claim one, so we don't pretend to.
- **"Why does one item dominate the dollar chart so much?"** — Real data, not a rendering issue:
  the #1 item by $ value is genuinely ~4-11x the size of the next several bars — that concentration
  *is* the Pareto insight the whole page is built around, not a bug to smooth over.
- **"Is this actually predicting risk, or just ranking by value?"** — Fair challenge: the two are
  different claims. Ranking by $ value alone is classic ABC/Pareto inventory classification, not
  novel. The risk signal is the *other* rank — velocity vs. lead time — and we never claim it's
  validated against real stockout outcomes, because this sample has no stock/backorder table to
  validate against. We say that explicitly rather than dress a heuristic up as a model.
- **"Isn't this just a Power BI report?"** — Power BI *can* do a Pareto view, but it needs the same
  DAX-hand-built rank/cumulative measures we wrote here — parity, not an edge. Where it can't
  follow is write-back: Power BI has none natively, so the equivalent would mean bolting on Power
  Apps plus Power Automate plus a separate table — three tools stitched together. This is one
  coherent Fabric Data App with a real write-back and audit-trail loop built in, and we built it
  faster by pairing with an agent on the DAX, React, and TypeScript together.
- **"Can the same item get more than one reorder action logged?"** — Yes, intentionally. A real
  ops tool needs to support multiple purchase-order-style actions per item over time (partial
  orders, corrections) — there's no hard-delete in this app (a `Dismissed` status is the
  soft-delete), so blocking a second entry would trap genuine mistakes with no way out.
- **"Why no confirmation dialog before a status change?"** — Deliberate: this is a
  many-times-a-day internal tool, and every change is already audit-logged (old value, new value,
  who, when) — traceability instead of click-friction, same pattern real tools like Jira use for
  status transitions.
- **"What would you build next?"** — A real Fabric Data Agent / Copilot layer for natural-language
  questions over the semantic model — deliberately out of scope for a build-week timeline.

---

## Timing checklist (fill in during rehearsal)

- [ ] Full run, stopwatch, under 2:15 total including one stumble-recovery — leaves real Q&A room
      inside the 5-minute slot
- [ ] Confirm live, right before the run: default Rank By is Qty on page load (not $ Value), and
      flipping it live still shows the $182M top item / 80%-in-63-items split — those exact
      numbers, re-verify against the actual deployed app, not memory of an earlier session
- [ ] Write-back submit + reload confirmed working on the actual deployed app immediately before
      the run-through (not from memory of an earlier session)
- [ ] Landing → Overview → Action Center transitions all confirmed smooth, no dev-preview badges
      visible (i.e., testing against the live Fabric embed, not `npm run dev`)
- [ ] Cutoff slider and Rank By toggle both demoed live at least once during rehearsal
