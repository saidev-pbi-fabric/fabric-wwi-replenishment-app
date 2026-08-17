# Wireframe / design brief — WWI Replenishment App

Lightweight pre-`/spec` pass per `.agents/skills/app-design`. Design decisions only — no
component code yet; `global.css` tokens get applied when the app build starts (Day 3+).

## Aesthetic direction
- **Tone:** industrial control-room — a warehouse ops command deck, not a generic SaaS dashboard.
- **Signature detail:** a left-edge severity rail (color bar) on every at-risk item — critical
  (red) / at-risk (amber) / on-track (green) — repeated as the row accent in tables, the KPI
  tile border, and the detail-panel header in the Action Center. One motif, used everywhere, so
  severity reads at a glance without a legend.

## Typography
- `--font-heading`: **IBM Plex Sans Condensed** — compact, technical, industrial.
- `--font-base`: **IBM Plex Sans** — same foundry, pairs cleanly.
- `--font-numeric`: **IBM Plex Mono** — tabular figures for KPI values and stock counts.
- `--font-monospace`: IBM Plex Mono (reuse).
- Load via Google Fonts `<link>` tags in `index.html`.

## Color
- Keep the existing Fluent blue (`--color-primary: #0f6cbd`) as the neutral/brand color —
  it's correct for buttons and nav, not the domain signal.
- Add a dedicated **severity scale** (new tokens, additive to the existing theme, both light +
  dark variants): `--color-critical` (red), `--color-at-risk` (amber), `--color-on-track`
  (green), each with a `-foreground` pair. This is the one new token family the domain needs.
- Radius: lower end of the existing scale for structural elements (`--radius: 4px`, cards use
  `rounded-lg`) — industrial, not soft. Severity badges/chips use `rounded-full` (the one
  pill-shaped exception, per the "signature detail" above).

## Layout

### Header / toolbar
Compact inline toolbar, not a heavy branded banner: app name (left) + 2-page nav (Overview /
Action Center) + theme toggle (top-right). No sidebar — 2 pages don't need one.

### Page 1 — Replenishment Overview
- **Row 1 — KPI strip** (4 stat tiles, equal width): Total At-Risk Items, Open Backorders, Avg
  Lead Time (days), Items Needing Review. Each tile's left edge carries the severity-rail motif
  when its value is in a risk state.
- **Row 2 — mixed grid** (not a uniform grid): a wide chart (spans 2 cols) showing stock-on-hand
  vs. reorder level trend, next to a tall narrow ranked list card ("Top At-Risk Items", severity
  rail per row, click-through to Action Center).
- **Row 3 — full-width table** (optional/stretch): all stock items with on-hand, reorder level,
  lead time, backorder flag — sortable.

### Page 2 — Action Center
Master-detail split, not stacked cards:
- **Left panel** — ranked at-risk item list (same severity-rail rows as Page 1's card),
  filterable by severity/supplier, click to select.
- **Right panel** — detail view for the selected item (stock levels, supplier, lead time) with
  the `ReorderAction` write-back form beneath it: suggested qty (pre-filled, editable), status
  dropdown (Pending Review / Approved / Ordered / Received / Dismissed), note, assigned-to,
  submit. Form uses the same severity color on its header strip as the selected item's rail.

### Dashboard grid rules (carried from app-design skill)
- Mobile-first, scale up columns at breakpoints.
- Constrain the outer dashboard wrapper's max-width, not individual charts/cards.
- Vary card spans (KPI tiles are narrow/equal; the trend chart is wide; the ranked list is tall) —
  no uniform spreadsheet-of-cards look.

## Interaction polish (stretch, Friday buffer day only)
Reference: Kurt Buhler's Fabric Data App examples (custom web dashboards) — clean sparkline-in-KPI-card
and a hover-reveal prior-period comparison line (dashed) on trend charts. Decision 2026-08-17:
**borrow these two interaction patterns, don't adopt his premium-fintech palette/tone** — the
severity-rail motif stays the signature detail. Implement in `--font-numeric`/severity-scale
tokens already locked above, not Kurt's neutral off-white/serif look. Scope to Fri 8/21 polish —
not blocking Page 1 core build (KPI strip, trend chart, ranked list must work on real DAX data
first; animation on top of fake data is a worse demo than a plain chart on real write-back).

## States
Every async-data component (KPI tiles, trend chart, ranked lists, detail panel) needs loading
(skeleton), empty (centered muted message), and error (destructive banner) states per the
app-design skill's table — applies once real semantic-model queries are wired in (Day 3+), not
before.
