# Resume prompt — paste this to start the next session cold

Resuming the Fabric WWI Replenishment App hackathon build (#wwi-hackathon-build). Read
`CLAUDE.md`'s Status block first — it's kept current. Short version: Phase 2 (Query Authoring) is
fully done and pushed through commit `2c23c81` on `main` — semantic model (`WWI Replenishment`,
Import mode, `Sale`/`Stock Item`/`Date`), risk DAX measures (Recent/Prior Daily Sales Rate, Demand
Trend %, Suggested Reorder Qty, At Risk Rank, Lead Time Priority Tier), and both pages' DAX query
factories (`src/queries/overview/*`, `src/queries/action-center/*`) are all built, live-verified,
and tested (30/30 passing).

**Scope changed 2026-08-17: app is now 3 pages, not 2.** A Landing page was approved as committed
scope (not stretch-only) — problem framing, one-liner pitch, entry point into the dashboard, can
be rich not minimal. Kept unnumbered (not "Page 3") so the existing Page 1 = Overview / Page 2 =
Action Center task IDs (`T2.2`/`T2.3`/Phase 3/Phase 5) don't need renumbering. Landing page is
scoped to Friday 8/21 as task `T6.4` — genuinely cheap (no DAX wiring), but still after the real
data/write-back work below. See `CLAUDE.md` locked scope for the full note.

**Next task: T3.x, Page 1 UI** (`tasks/todo.md`). Build `App.tsx` nav + the Replenishment Overview
page — KPI strip, sales trend chart, top-at-risk ranked list — wired to the existing
`src/queries/overview/` factories via `useSemanticModelQuery`. Follow
`docs/wireframe-design-brief.md` (severity-rail motif, IBM Plex fonts, locked layout) and
`docs/design-and-dax-references.md` (KPI-tile anatomy, chart-craft rules — Y-axis at 0, no
smoothing, sparse labeling). Loading/empty/error states required per the wireframe brief's States
section.

**Known fragile points, don't re-litigate:**
- `fabric-sqlendpoint` MCP is disabled — its OAuth is broken (no dynamic client registration
  support), not fixable. If SQL access is ever needed again, use the AAD-token
  `System.Data.SqlClient` PowerShell pattern documented in `CLAUDE.md`'s history instead.
- `powerbi-modeling-mcp` DAX queries can hang indefinitely on a stale connection credential. Fix:
  `connection_operations` `Disconnect` then `ConnectFabric` again with `clearCredential: true`.
- `fabric-mcp-server` auth was fixed (stale WAM account, wrong tenant) — should be fine, but if
  `onelake_list_workspaces` ever shows the wrong workspace again, that's the fix.

Start by checking `git log --oneline -5` and `tasks/todo.md` to confirm nothing changed since this
prompt was written, then begin T3.x.
