# Screen Walkthrough: What You're Actually Looking At

This is the companion piece to `data-deep-dive-for-notebooklm.md`. That doc explains the data and
DAX. This one explains the app screen itself — what each piece of UI shows, in plain language,
plus answers to three specific points of confusion that came up while looking at the live app:
whether there's a Pareto view, why "top 20" specifically, and what the $98.8M number actually
means given the drill-through only lists 10 rows.

Treat this as a second, separate source — a second NotebookLM notebook/project, not merged into
the data-deep-dive one. They answer different questions ("what does the data mean" vs. "what am I
looking at on screen") and keeping them separate lets you generate a focused audio overview for
each instead of one long one that jumps between data theory and UI tour.

## The three pages, in plain terms

**Landing page.** Just a front door — pitch, problem framing, a button into the dashboard. No
data, no DAX. Exists so a judge opening the app cold sees context before numbers.

**Page 1, Replenishment Overview — "what's the state of the world."** Top to bottom:

1. A row of 5 small KPI tiles — single big numbers with a label, like a scoreboard.
2. A line chart — how many units per day the risky items have been selling.
3. A bar chart — the 10 riskiest items, ranked, colored by how long they take to restock.

**Page 2, Action Center — "what do I do about it."** A full list of all 672 items ranked by risk
(filterable by restock-speed tier), a detail panel for whichever item you click (shows its own
mini sales chart and a plain-English sentence explaining why it's risky), and a form to actually
log a reorder decision — quantity, supplier, status. This is the only screen where anything you
do gets saved.

## The 5 KPI tiles, one at a time

- **Items Tracked** — how many stock items exist total (672). A denominator, not a risk signal.
- **Avg Lead Time Days** — average restock time across all items, in days.
- **Top At-Risk Items** — a count, fixed at "however many items rank in the top 20" (see below
  for why 20 specifically). Clicking it opens a list of those exact 20 items.
- **Accelerating Demand Items** — how many items are selling faster this month than last month.
- **At-Risk Reorder Value ($)** — a dollar total, explained fully below.

## Your questions, answered directly

### "Do we have anything we can show as a Pareto in our semantic model?"

Not currently — no Pareto chart or cumulative-percentage measure exists anywhere in the app or
the model today. But the data to build one is already sitting right there, and it would be a
genuinely strong addition, arguably a better story than the current flat top-10 bar chart.

A Pareto view here would look like: rank all 672 items by `Reorder Value` (already computed —
`Suggested Reorder Qty × Unit Price`, the same field driving the $ contributors drill-through),
then show a running cumulative-percentage line over that ranking. The classic "80/20" question it
would answer: *what share of items account for what share of the total at-risk dollar exposure?*
If (hypothetically) 30 of the 672 items account for 80% of the $98.8M figure, that's a much
sharper story for a warehouse planner than "here are 10 items" — it reframes the whole page from
"a list" to "here's how concentrated your risk actually is." This would need one new DAX measure
(a running-total percentage over the ranking, straightforward with `RANKX` + a cumulative `SUMX`
pattern) and a new chart — no new data source, no new dimension, purely additive to what's
already built. Worth raising as a concrete candidate for the "what's next" list.

### "Why top 20 for the at-risk items, any reason?"

Checked the code and the build log directly rather than guessing: **20 is a fixed, round-number
cap, not something derived from the data.** It's not a percentile, not a statistical elbow point
in the ranking, not tied to any threshold in the data — it's `[At Risk Rank] <= 20` hardcoded into
three places (the KPI tile's count, the $ value sum, and the drill-through query) purely so all
three stay consistent with each other. There's no documented reasoning beyond "a round number
that's clearly the top slice of 672 items."

That's honestly the weakest-justified number in the whole app, and it's exactly the kind of thing
a Pareto view (above) would fix — instead of an arbitrary top-20 cutoff, the cutoff could become
"however many items it takes to reach 80% of at-risk dollar exposure," which is a number the data
itself justifies rather than a guess.

### "At-Risk Value says $98.8M — what does it mean, and why does it only have data for the top 10 products?"

Two different things are happening here, and the confusion is completely understandable because
the UI doesn't currently spell out the relationship.

**The $98.8M figure itself** is the total: take the **top 20** at-risk-ranked items, and for each
one multiply its `Suggested Reorder Qty` (how many units the reorder-point formula says to
order) by its `Unit Price`, then add all 20 of those dollar amounts together. So $98.8M is "the
total dollar value of inventory you'd need to order to cover the 20 riskiest items" — not
revenue, not profit, a projected reorder cost.

**Clicking that tile opens a drill-through that only lists 10 rows**, and that's a deliberate,
separate design choice, not a bug or a data gap — but it does need explaining. The drill-through's
job is "what's driving this $98.8M number," i.e. which items are the biggest dollar contributors
within that same top-20 set. It was capped at 10 (not all 20) specifically so it reads as a
focused "top contributors" breakdown rather than a full duplicate of the other at-risk list right
next to it on the same page. So: **the $98.8M is a sum over 20 items; the popup only shows you the
biggest 10 of those 20 by dollar value**, not a different or smaller dataset. The other 10 items
that make up the rest of the $98.8M simply aren't listed in that particular popup — they're
visible in the separate "Top At-Risk Items" drill-through (the one off the "Top At-Risk Items"
tile, not the dollar tile), just without the dollar breakdown.

If this reads as confusing live (and it clearly did), the cheapest fix is a one-line caption in
the modal itself — something like "showing the top 10 of 20 items by dollar contribution" — so
the relationship is stated on screen instead of requiring a code read to understand.

## Suggested new NotebookLM project setup

Given the two docs now cover different questions, a clean setup:

1. **Project 1 — "WWI Data & DAX Deep Dive."** Upload `data-deep-dive-for-notebooklm.md`, plus
   `docs/wwi-schema-reference.md` and `SPEC.md` as supporting sources (not the primary source for
   the audio overview, but available for follow-up chat questions with citations back to the
   schema and spec directly).
2. **Project 2 — "WWI App Screen Walkthrough."** Upload this file
   (`screen-walkthrough-for-notebooklm.md`) alone, or alongside a few screenshots of the live app
   if you want NotebookLM's audio overview to reference visual layout more concretely (NotebookLM
   accepts image sources too, though the audio overview draws mainly from text/document sources).

Keeping them as two projects means you can generate two separate, shorter, more focused audio
overviews — one for "how does the risk math work," one for "what am I looking at" — rather than
one long one that has to context-switch between DAX internals and screen tour partway through.
