# Talk Track — WWI Replenishment

Written 2026-08-19 for the Microsoft Fabric Hackathon 2026 demo (2026-08-22, "Fabric App
Champion" track). Target: ~2 minutes live demo + 30-60s Q&A buffer. Drafted against the
already-locked scope (dataset, 3 pages, write-back loop) per `CLAUDE.md` — this does not need to
wait for every remaining polish item; update the bracketed cues below as features land, then do
one full timed rehearsal against the finished, deployed app on 8/21.

Rehearse out loud at least once before the room — written pacing and spoken pacing are never the
same length.

---

## 0:00–0:15 — Hook (Landing page)

> "Every BI dashboard shows you sales history. None of them tell you what to *do* about it — that
> step happens in a spreadsheet, or an email, outside the report. WWI Replenishment closes that
> loop inside one Fabric Data App: see what's at risk of stocking out, then record and track the
> reorder action for it, without leaving the app."

**Cue:** open on the Landing page. Point at the one-liner, click "Open the Dashboard."

---

## 0:15–0:35 — Dataset honesty (still Overview, before touching the KPI strip)

> "This runs on Fabric Warehouse's real Wide World Importers sample, loaded with the native Copy
> Job wizard — no manual pipeline. One catch: this sample has no stock-on-hand or backorder table
> at all — just sales. So instead of pretending we have inventory data we don't, we built a
> disclosed proxy: sales velocity versus supplier lead time. We say that out loud in the app
> itself, not just in this talk."

**Cue:** point at the disclosed-proxy callout if visible on this page, or say it while the KPI
strip is loading.

---

## 0:35–1:05 — Overview page

> "672 stock items tracked, ranked by risk. This one —" *(point at the $ tile)* "— is new: **$98.8
> million in suggested reorder value sitting in the top 20 at-risk items alone.** That's Unit
> Price times Suggested Reorder Qty, same disclosed-proxy honesty, but now it's a number a
> business stakeholder actually remembers. Below it, real daily sales trend, and the ranked list —
> click through on any item and it takes me straight to Action Center."

**Cue:** hover/click the $ tile briefly (no drill-through wired to it — just call out the number),
then click one ranked-list row to transition to Action Center.

**[Update this cue once decided: if the "Accelerating Demand" tile gets a drill-through per the
8/18 discussion, mention it here.]**

---

## 1:05–1:45 — Action Center: the "why," then the write-back

> "This is the item I clicked through on. Instead of just a rank number, we compose a plain-English
> line right under the name —" *(read it aloud)* "— built from the exact same fields as the
> detail panel below, no separate AI call, just a readable sentence out of numbers that were
> already there. Below that: 60 days of real daily sales, not a bar, a sparkline — and this dashed
> tail is a lightweight linear projection forward by the lead time, labeled clearly as a trend
> line, not a forecast model. We don't have the data to claim a real forecast, so we don't."
>
> "Now the write-back: suggested reorder quantity is pre-filled from the same proxy formula, I set
> a status, submit —" *(submit live)* "— and it's recorded. Refresh the page —" *(reload)* "— it's
> still there. That's the loop: see the risk, act on it, without leaving Fabric."

**Cue:** this is the demo's one true live-action moment — rehearse the click sequence (select item
→ read rationale → point at sparkline → fill status → Submit → reload → show it persisted) enough
times that it's muscle memory, not read off a script live.

---

## 1:45–2:00 — Close

> "Everything you saw runs on stock Fabric building blocks — Warehouse Copy Job, an Import-mode
> semantic model, and a Fabric Data App for the UI and write-back. No custom pipeline, no external
> database. One app, one loop: see it, act on it, track it."

**Cue:** land back on Overview or Landing for the final frame — don't end mid-scroll on Action
Center.

---

## If asked in Q&A

- **"Why Import mode, not Direct Lake?"** — at this data scale (trial capacity, not tens of
  millions of live rows) both modes need the identical setup flow, and Import additionally
  supports calculated columns/hybrid tables and skips Direct Lake's SKU-guardrail fallback
  behavior — a real risk to debug under hackathon time pressure.
- **"Is the reorder quantity a real forecast?"** — No, and we say so in the app: it's
  `Recent Daily Sales Rate × Lead Time Days × 1.2 safety factor`. The sparkline's dashed segment is
  a linear trend projection, not a statistical model — same honesty, extended to the chart.
- **"Why does the filter show mostly Medium lead time?"** — Real data: 582 of the 672 stock items
  in this sample are tagged Medium. We surface that distribution directly under the filter so it
  reads as a fact, not a bug.
- **"What would you build next?"** — Same sparkline pattern in the ranked list rows (not just the
  detail panel), and a real Fabric Data Agent / Copilot layer for natural-language questions over
  the semantic model — deliberately out of scope for a 4-day build.

---

## Timing checklist (fill in during the 8/21 rehearsal)

- [ ] Full run, stopwatch, under 2:30 total including one stumble-recovery
- [ ] Write-back submit + reload confirmed working on the actual deployed app immediately before
      the run-through (not from memory of an earlier session)
- [ ] Landing → Overview → Action Center transitions all confirmed smooth, no dev-preview badges
      visible (i.e., testing against the live Fabric embed, not `npm run dev`)
