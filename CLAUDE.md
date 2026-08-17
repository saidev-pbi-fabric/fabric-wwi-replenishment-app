# Claude context - Fabric WWI Replenishment App

Microsoft Fabric Hackathon 2026 entry (Hyderabad Data & AI Community + India Fabric User Group),
"Fabric App Champion" track. Event: 2026-08-22, 10am-5pm. Team-demoable target: 2026-08-21.

## Locked scope (do not re-litigate without a real reason)
- **One unified Fabric Data App** — dashboards/insights and a write-back/data-entry feature live
  in the same app, not two separate apps.
- **Dataset: Wide World Importers (WWI)**, the DW/star-schema slice, loaded via Fabric Warehouse's
  native Copy Job wizard: New Item -> Copy job -> Sample data -> "Retail Data Model from Wide
  World Importers" -> Full copy. No manual download, no medallion/pipeline build.
- **Scenario: Stock replenishment / back-order risk → re-derived as demand-driven reorder
  attention.** `docs/wwi-schema-reference.md` corrected 2026-08-17 — real loaded schema is 6 flat
  tables (`dimension_city`, `dimension_customer`, `dimension_date`, `dimension_employee`,
  `dimension_stock_item`, `fact_sale`), no purchasing/stock-holding/backorder tables exist, no
  stock-on-hand column anywhere. Risk rule is now a disclosed proxy: sales velocity trend
  (`fact_sale.Quantity` over time) vs `dimension_stock_item.LeadTimeDays`, ranked not
  threshold-based. See schema doc's "Replenishment risk rule" section for the full derivation.
- **Write-back entity (one entity, not a full CRUD system):** `ReorderAction` - stockItemKey,
  stockItemName, currentStockOnHand, suggestedReorderQty, supplierKey/supplierName, status
  (Pending Review / Approved / Ordered / Received / Dismissed), note, assignedTo, createdAt/By.
- **Semantic model storage mode: Import**, not Direct Lake. At this data scale (trial capacity,
  not a live tens-of-millions-row dataset) both modes use the identical setup flow, and Import
  additionally supports calculated columns/hybrid tables/aggregations and skips Direct Lake's
  SKU-guardrail fallback behavior - a real risk to debug under hackathon time pressure.
- **Pages: 2.** Page 1 - Replenishment Overview (sales/stock trends, at-risk items ranked, KPIs).
  Page 2 - Action Center (ranked at-risk list, record detail, the `ReorderAction` write-back panel).
  A 3rd page is a stretch goal only, not committed scope.
- **Tooling stack: standardized on `addyosmani/agent-skills` end-to-end** (8 slash commands:
  `/spec /plan /build /test /review /webperf /code-simplify /ship`), plus `batch-grill-me` and
  `ponytail`. Deliberately not mixing in other spec/design frameworks - one coherent system.
  Frontend: `frontend-ui-engineering` + `dataviz` are the core skills to use; skip `ui-ux-pro-max`
  (redundant, mobile-app-flavored); `impeccable`/`emil-design-eng` are optional, late-stage only.
- **Backup AI tooling:** Claude Code is primary (both team members have it). Codex CLI and Google
  Antigravity are the token-exhaustion fallback - both read `AGENTS.md` (confirmed: donated to the
  Linux Foundation's Agentic AI Foundation, Dec 2025, multi-vendor standard). This repo ships both
  `AGENTS.md` (already present from the Rayfin template, tool-agnostic build guide - don't
  overwrite it) and this `CLAUDE.md` (Claude-Code-specific conventions).
- **GitHub: public, personal account.** Fabric: separate trial tenant from any employer tenant,
  access via a teammate's existing trial capacity.

## Day-by-day plan (3-4 hrs/day, both team members)
| Day | Focus |
|---|---|
| Sun 8/16 | Scope lock, repo scaffold, GitHub push, team registration, get Fabric credentials |
| Mon 8/17 | Load WWI data (Copy Job) + build semantic model core (Import mode, relationships) |
| Tue 8/18 | Finish SM DAX (risk ranking, lead time, priority) + scaffold app, build Page 1 |
| Wed 8/19 | Build Page 2 (Action Center) + start `ReorderAction` write-back (`data.enabled: true`) |
| Thu 8/20 | Wire write-back UI end to end, verify state survives reload, start polish |
| Fri 8/21 | Final polish, bug fixes, light presentation/talk-track outline, buffer |

**Schedule-critical day: Monday (SM build)** - everything downstream depends on it, no slack.

## Status (as of 2026-08-17, mid-day)
- [DONE] Fabric workspace access confirmed — native account `sai@r4k5.onmicrosoft.com` in
  teammate's `r4k5` tenant, workspace `Fabric-App-Hackathon` (id
  `f9f81ba4-029f-457f-8bd9-ec273060a362`), workspace type "Fabric Trial" (capacity-backed).
- [DONE] Azure CLI installed (winget, `2.89.1`) + `az login` completed as `sai@r4k5.onmicrosoft.com`
  (tenant `10c67e77-e11e-48f7-af1a-8d9e7d39c374`, tenant-level account, no Azure subscription —
  expected for a Fabric-only trial tenant).
- [DONE] `rayfin login` completed, same account/tenant, token confirmed via `rayfin login status`.
- [DONE] `fabric-mcp-server` MCP tool auth fixed. Root cause was **not** the Azure credential
  chain / session-restart theory — it uses its own MSAL/WAM login, independent of `az login`.
  Real cause: a stale Windows "Access work or school" (WAM broker) account cached under tenant
  `be63f613-8671-4926-81da-269fed126574` ("Default Directory"), unrelated to r4k5. Fix: removed
  that account via Settings → Accounts → Access work or school (`ms-settings:workplace`), then
  re-ran `onelake_list_workspaces` — it now correctly returns only `Fabric-App-Hackathon`
  (id `f9f81ba4-029f-457f-8bd9-ec273060a362`). No session restart was needed once the stale WAM
  account was removed.
- [DONE] Copy Job run: `LoadWWIRetailData` → Warehouse `WWIWarehouse`, source = Copy Job wizard's
  "Retail Data Model from Wide World Importers" sample, Full copy, all 6 tables, "Run once".
  Landed successfully — 6 tables visible in `WWIWarehouse.dbo`: `dimension_city`,
  `dimension_customer`, `dimension_date`, `dimension_employee`, `dimension_stock_item`, `fact_sale`.
- [FINDING] **This sample ≠ the full WWI-DW.** `docs/wwi-schema-reference.md` was researched from
  the wrong GitHub artifact (see Locked Scope note above) — no `Fact.Order`/`Fact.Stock
  Holding`/`Fact.Purchase`/`Dimension.Supplier` exist in what actually loaded. Needs the schema doc
  rewritten from the real 6 tables, and the risk-rule scenario re-derived, before SM/DAX work
  continues.
- [DONE] `docs/wwi-schema-reference.md` rewritten from real 6-table schema, verified live via
  `onelake_get_table` on all 6 tables. Replenishment risk rule re-derived as a disclosed proxy
  (sales velocity trend vs `LeadTimeDays`, ranked) since no stock-on-hand/backorder data exists
  anywhere in this sample. `tasks/todo.md` T1.1/T2.1 acceptance criteria updated to match.
- [DONE] `fact_sale` row-count cutoff decided — resolved differently than planned. Direct SQL
  query (AAD-token `System.Data.SqlClient` connection via PowerShell, `fabric-sqlendpoint` MCP's
  OAuth is broken — "does not support dynamic client registration", disabled) found the ~50.15M
  rows span only 335 distinct dates (2000-01-01 to 2000-11-30) — one ~11-month window, not
  multi-year history, so a "recent date range" filter doesn't apply. Instead: aggregate at Import
  load time to (StockItemKey, InvoiceDateKey) grain — folds server-side to 73,365 rows. See
  `docs/wwi-schema-reference.md` for the full finding and the M query pattern.
- [DONE] Semantic model core (T1.2) fully complete — built, deployed, refreshed (Workspace
  Identity cloud connection bound in portal), 3 base measures verified via live DAX query. See
  `tasks/todo.md` T1.2.
- [FINDING] `powerbi-modeling-mcp` XMLA queries can hang indefinitely (60-90s+, ignores
  `timeoutSeconds`) on a stale/invalid credential on the live connection — looks identical to the
  earlier `fabric-mcp-server` WAM-credential class of bug but on a different auth path (XMLA, not
  the refresh REST API — refresh worked fine while queries hung). Fix: `connection_operations`
  `Disconnect` then `ConnectFabric` again with `clearCredential: true`. No visible popup, no
  session restart needed — much lighter fix than the earlier fabric-mcp-server case. If
  `dax_query_operations` hangs again, try this first.
- [DONE] Statusline configured on this laptop to match the work laptop (global `~/.claude/settings.json`,
  not project-specific) — model/context-bar/tokens/cost/duration/5h-7d-rate-limits + git branch
  status, ANSI-colored by threshold. Not tracked further here, it's personal tooling not project
  state.

## Status (as of 2026-08-16)
- [DONE] Repo scaffolded from official Rayfin template (`fabric-apps-analytic-templates`, Data App).
- [DONE] `docs/wwi-schema-reference.md` - verified real WWI DW columns from Microsoft's own DDL.
- [DONE] Local git init + pushed to GitHub: `github.com/saidev-pbi-fabric/fabric-wwi-replenishment-app` (public).
- [DONE] Thread registered: `#wwi-hackathon-build` in `THREADS.md`.
- [DONE] Lightweight wireframe/layout pass - `docs/wireframe-design-brief.md` (tone: industrial
  control-room, severity-rail signature detail, IBM Plex Sans Condensed/Sans/Mono typography,
  page-by-page layout for both pages).
- [DONE, gap fixed] `addyosmani/agent-skills` plugin properly installed (`claude plugin
  marketplace add addyosmani/agent-skills` + `claude plugin install
  agent-skills@addy-agent-skills`) - the CLAUDE.md-locked tooling stack was NOT actually present
  before this session (checked filesystem, confirmed absent from both marketplaces and loose
  skills). An earlier `npx skills add addyosmani/agent-skills` attempt in this same session only
  installed the 24 underlying skills (no slash commands) - superseded by the proper plugin
  install, which also carries the `commands/*.toml` -> `/spec /plan /build /test /review /ship
  /code-simplify /webperf` command definitions. **Needs a session restart to activate** - plugin
  slash commands load at Claude Code process startup, not mid-session (confirmed: `Skill(spec)`
  still returned "Unknown skill" right after install). The duplicate loose `~/.agents/skills/*`
  copies from the npx attempt were removed the same session (`npx skills remove -g`, 24 skills) -
  clean, no leftover duplication going into the restart.
- [DONE] `/spec` -> `SPEC.md` (objective, stack, commands, structure, code style, testing,
  boundaries). Both open questions resolved and locked in: `ReorderAction` uses `@authenticated()`
  with no row-level policy (small internal tool, audit fields still captured as data); no
  hard-delete (`Dismissed` status is the soft-delete).
- [DONE] `/plan` -> `tasks/plan.md` (dependency graph, checkpoints, risks) + `tasks/todo.md`
  (task-by-task checklist). Independently reviewed by a fresh subagent against `CLAUDE.md`'s locked
  scope - no contradictions found; 5 gap/risk findings applied (build-check added to T6.1, two risk
  lines added, T5.1's real dependency clarified as narrower than its scheduled checkpoint, locked
  frontend skills wired into T3.3/T5.1 acceptance criteria).
- [DONE] `docs/personal-laptop-setup.md` - environment parity doc for the personal laptop (Fabric/
  Azure/Rayfin login, the `addyosmani/agent-skills` + `microsoft/skills-for-fabric` plugin installs,
  MCP server registration - verified `powerbi-modeling-mcp` is bundled in the `powerbi-authoring`
  plugin's own `.mcp.json`, no manual install needed). Includes a copy-paste "quick start" prompt
  for bootstrapping a fresh Claude Code session from just the repo URL.
- [NOT STARTED] Team hackathon registration (Google Form) - teammate handling, incl. an organizer
  conversation about track/details.
- [NOT STARTED] Fabric workspace credentials - Saidev getting these from teammate, who has an
  existing working Fabric Trial capacity (no new trial needed). **Flagged as a named risk in
  `tasks/plan.md`** - this is still open the same day the no-slack SM build (T1.1/T1.2, Mon 8/17)
  is due to start.
- [NOT STARTED] Personal laptop setup (`tasks/todo.md` T0.1) - doc is ready, execution pending.
- [NOT STARTED] Semantic model build (blocked on Fabric credentials).
- [NOT STARTED] App build (blocked on SM + Fabric credentials).

## Next actions, in order
1. [DONE 8/17] Schema explored via OneLake Delta metadata + direct AAD-token SQL (see
   `docs/wwi-schema-reference.md`). `fabric-sqlendpoint` MCP's OAuth is broken ("does not support
   dynamic client registration") — worked around it with a `System.Data.SqlClient` connection in
   PowerShell using an `az account get-access-token --resource https://database.windows.net`
   token. Reusable pattern if SQL access is needed again.
2. [DONE 8/17] Semantic model core built + deployed — `WWI Replenishment` in
   `Fabric-App-Hackathon` (item id `8023010f-ba5e-42ed-93c9-b505b6d560d8`). See `tasks/todo.md`
   T1.2 for full detail.
3. [DONE 8/17] Refresh credential fixed (Workspace Identity cloud connection), refresh succeeded,
   3 base measures verified live. T1.2 fully complete.
4. Next: `tasks/todo.md` T2.1 (risk DAX measures — Recent/Prior Daily Sales Rate, Demand Trend,
   Suggested Reorder Qty proxy, At-Risk rank, Lead Time priority tier) against the deployed model.
   Apply the description-writing guidance from `docs/design-and-dax-references.md` to every new
   measure/column.
5. Then T2.2/T2.3 (DAX query factory) — cross-check against the "visualization as code" pattern
   in `docs/design-and-dax-references.md` before finalizing `src/queries/` structure.
6. Then T3.x (Page 1 UI) — apply the KPI-tile and chart-craft rules from
   `docs/design-and-dax-references.md`.
7. Continue through `tasks/todo.md` in order from there.
