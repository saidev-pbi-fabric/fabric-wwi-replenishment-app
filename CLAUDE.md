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
  **Amended 2026-08-20:** the concentration-thesis rebuild (see `SPEC.md`'s Amendment section)
  adds a live, user-adjustable cutoff slider (default 80%) driving the Pareto view's in-cutoff
  vs. past-cutoff split. This is a deliberate, flagged addition, not a reversion to a fixed
  literal threshold — the underlying ranking is still relative (`At Risk Rank`), the slider only
  changes where the visual/table draws the line on that ranking.
- **Write-back entities (two, not a full CRUD system):** `ReorderAction` - stockItemKey,
  stockItemName, currentStockOnHand, suggestedReorderQty, supplierKey/supplierName, status
  (Pending Review / Approved / Ordered / Received / Dismissed), note, assignedTo, createdAt/By.
  **Amended 2026-08-20:** added `ReorderActionHistory` - an append-only audit-trail entity
  (fieldName, oldValue, newValue, changedAt, changedBy) written on every `ReorderAction`
  create/update. Still no hard-delete, still no full CRUD - this is traceability, not new
  business functionality.
- **Semantic model storage mode: Import**, not Direct Lake. At this data scale (trial capacity,
  not a live tens-of-millions-row dataset) both modes use the identical setup flow, and Import
  additionally supports calculated columns/hybrid tables/aggregations and skips Direct Lake's
  SKU-guardrail fallback behavior - a real risk to debug under hackathon time pressure.
- **Pages: 3** (raised from 2, decided 2026-08-17). **Landing** — new, unnumbered relative to the
  existing task IDs below to avoid renumbering already-completed work (problem framing, one-liner
  pitch, entry point into the dashboard — rich, not a minimal placeholder; scope/design not yet
  locked, decide at build time). **Page 1 - Replenishment Overview** (sales/stock trends, at-risk
  items ranked, KPIs) and **Page 2 - Action Center** (ranked at-risk list, record detail, the
  `ReorderAction` write-back panel) keep their existing numbering — `T2.2`/`T2.3`/Phase 3/Phase 5
  task IDs and `docs/wireframe-design-brief.md` already reference them as Page 1/Page 2. The
  landing page is genuinely low-cost (no DAX wiring) and helps judges who open the app cold before
  the KPI strip means anything — scope it as a Friday 8/21 polish-day build, same slot as the
  interaction-polish animation work in `docs/wireframe-design-brief.md`, not before Phase 3-5's
  real data/write-back work is done.
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

## Status (as of 2026-08-20, autonomous rebuild session)
Full detail in `docs/rebuild-session-2026-08-20.md` — kept short here per the user's own
noise-reduction request. Working on branch `rebuild/pareto-thesis` (pushed), executing the
concentration-thesis rebuild amendment in `SPEC.md`. **[DONE, tested, pushed]**: fixed 3 real
gaps the spec itself was missing (App.tsx/kpi-strip.tsx rewiring scope, landing-page.tsx's second
dependency on the retiring query, a `ReorderActionHistory` naming collision with an existing
component — renamed the new entity to `ReorderActionAuditLog`); built and wired the audit-log
entity/panel/write-hooks; removed the unbacked forecast projection project-wide and added a
proper gridded-axis `item-trend-chart.tsx` for the item-detail panel; added search+CSV to the
ranked list; updated landing hero copy. 141/141 tests, tsc/lint clean vs. documented baseline,
`npm run build` clean. **[BLOCKED, needs the user]**: everything downstream of the new duplicate
semantic model (its creation, new measures, the Pareto query/component, `App.tsx`/`kpi-strip.tsx`
rewiring, retiring the 4 old files) — deliberately not drafted blind per this project's own
DAX-must-be-live-validated discipline. Say "continue the rebuild" to resume at SM creation.

## Status (as of 2026-08-20, end of session)
- [DONE] Backlog items 1, 2, 3 (of the "1, 2, 3, 5" set the user asked for autonomously, one after
  another) — all built, verified locally, deployed. (1) **Top Contributors drill-through**: new
  modal on the At-Risk Reorder Value $ KPI tile (`top-contributors-drill-through.tsx` +
  `top-contributors-drill.dax/.ts`), same pattern as the existing Top At-Risk drill-through — DAX
  not live-verified, XMLA connection to the semantic model was unresponsive both times it was
  tried (documented flaky-credential issue, see 8/17 log). (2) **Per-row sparklines** in the
  Action Center ranked list — hit and fixed a real bug where the sparkline's own `width="100%"`
  SVG was squeezing item names to zero width in the flex row; fixed with a fixed-size wrapper span.
  (3) **Sparkline hover tooltips** (exact date + value) via native SVG `<title>` elements, added to
  both the compact row sparklines and the existing big detail-panel one; `formatShortDate()` added
  to `src/lib/utils.ts` for the label text.
- [DONE] The empty-space bug in the Overview "Top At-Risk Items" card — user-confirmed fixed.
  Root cause was not the originally-suspected `h-full` ambient stretch; `fabric-visuals` drops
  Vega's "fit-y" autosize for any bar chart with a categorical y-axis, so the hardcoded
  `style={{height: 400}}` wrapper left dead space below shorter charts. Fixed with `height:
  {step: 32}` in the Vega spec plus a JS-computed `style={{height: rows.length * 32 + 60}}`.
- [DONE] Item name middle-truncation (`labelExpr` on the y-axis, not a separate computed field —
  a first attempt using a `transform.calculate` field broke Vega's internal sort/selection domain
  unioning, caught and reverted before shipping) and the tier-filter caption mismatch
  (`tierDistributionCaption()` now takes the active tier instead of always showing the "All"
  summary) — both built and included in this session's deploy, but **not yet user-confirmed** ("I
  am not able to scroll through... same issue nothing seems fixed" was about the height bug, which
  is separately confirmed fixed; the user then said "This change one issue the height issue is
  resolved other is still pending need mroe clarity so i will park it for now" — so these two stay
  parked, no further work on them without more direction).
- [BLOCKED] Backlog item 5 (TE2 Best Practice Analyzer pass) — Tabular Editor 2 CLI
  (`TabularEditor.exe`) is not installed on this laptop (checked `where.exe` + both `Program
  Files` dirs). Per [[project_tabular_editor_decision]] this is TE2-CLI-only (free), but installing
  new desktop software unattended isn't something to do without confirmation — flagged to the user
  rather than silently installing or silently skipping. It was already documented as an optional
  Friday 8/21 buffer-day item, never a gate, so nothing else is blocked on it.
- [PROCESS] User gave an explicit standing instruction this session: when blocked or iterating
  without success, stop and say so rather than keep burning turns/tokens — ship what's believed
  working, let the user validate live and report back, instead of continuing to self-verify in a
  loop. Also confirmed: work backlog items one at a time in sequence, not batched (given earlier as
  general feedback, re-confirmed here in practice).
- Verify: 125/125 tests pass, `tsc --noEmit` clean vs. the known `use-query-panel.spec.ts`
  baseline, `npm run lint` clean vs. the known `main.tsx` baseline (one new warning from this
  session's own test, an unused `eslint-disable` directive, found and removed during closing
  checks), `npm run build` clean, all changes committed + pushed to `main`, live app matches HEAD
  (`3f84cc5`) — confirmed via `rayfin up` immediately before the commit.

## Status (as of 2026-08-19, end of session)
- [DONE] `gsd-ui-auditor` retroactive 6-pillar audit run (T6.5) — 19/24 (`docs/UI-REVIEW.md`).
  Fixed the 3 priority findings (light-mode neutral ramp, `ErrorFallback`/auth-gate off raw
  Tailwind onto the token system, truncated-name tooltips), plus user-flagged issues found the
  same session: Action Center's `ItemDetailPanel` was stretching to match the ranked list's
  `max-h-[640px]` under CSS grid's default row-stretch (fixed with `items-start`), and the "All"
  lead-time filter showing almost entirely Medium-tier rows is real data (582 of 672 stock items
  are Medium tier, live-verified) — added a `tierDistributionCaption()` so it reads as a
  disclosed fact, not a bug.
- [DONE] T6.6 — per-item sales-trend sparkline (`src/components/shared/sparkline.tsx`, hand-rolled
  SVG using `currentColor` + Tailwind severity classes, not Vega — avoids the hex-duplication
  Vega's renderer forces elsewhere) with a naive linear-trend forecast extension (client-side,
  zero new DAX). T6.6b — a 5th KPI tile, "At-Risk Reorder Value" ($98.8M, live-verified, computed
  inline in `kpi-strip.dax`, no new model measure). Also a plain-English rationale sentence in the
  item detail panel, composed client-side from fields already on screen. Direction for the
  sparkline was approved via an Artifact mockup before any real DAX/component work, per an
  explicit "don't build and revoke" instruction.
- [DONE] `docs/talk-track.md` drafted — timed sections covering all 3 pages and the live
  write-back demo moment. Not yet rehearsed against the live app (T6.2, do on 8/21).
- [DONE] A second round of live-app feedback (screenshots against the deployed portal) fixed:
  a rounded-card border-clip bug (missing `overflow-hidden` on cards with an internal
  `overflow-y-auto` scroll region — ranked list + KPI drill-through modal both had it), KPI strip
  now 5-across in one row instead of a orphaned full-width 5th tile, simplified KPI rail colors
  (dropped the arbitrary amber/green on "Accelerating Demand" — color now reserved for the two
  tiles genuinely inside the at-risk narrative), the Vega bar chart's overlapping "Item" axis
  title removed + a proper multi-field tooltip added + `labelLimit` narrowed from 420 to 220 so
  labels stop eating the plot area, sparkline min/max + latest-value labels + a shaded
  forecast-region band (data-goblins line-chart-variant picks: Area Chart + Label Latest Data
  Point + Vertical Area-of-Interest). Also replaced a KPI number count-up animation (added then
  same session) with a plain fade-in after the user flagged it as "unpleasant" — ticking through
  big jumpy intermediate values for a number like $98.8M read as jank, not polish.
- [KNOWN, deliberately not changed] Item names have no clean splittable "dimension" column —
  `Brand`/`Color` are `N/A` for almost every real item, the descriptive text is baked into one
  string with no consistent regex-safe pattern. Decided against a parsed "short name" — relying on
  the Vega tooltip + narrower `labelLimit` instead.
- [OPEN, next session] User has more feedback queued, not yet reviewed. Known backlog items
  already discussed but not built: (1) a "Top Contributors" drill-through on the $ KPI tile
  (same modal pattern as `TopAtRiskDrillThrough`) — verified feasible live, top-5 contributors are
  all despatch-tape variants; (2) same sparkline pattern in `ranked-list-panel.tsx` rows and the
  KPI drill-through table (currently only in the Action Center detail panel); (3) sparkline hover
  tooltip (exact date+value) — the earlier Artifact mockup had this, the real component doesn't
  yet. T6.2 talk-track rehearsal and T6.3 (optional TE2 BPA pass) still open for 8/21.
- [PROCESS] Learned this session, saved to memory: every code change must be built + `npx rayfin
  up`-deployed before calling it done — local edits are invisible to the user, who only sees the
  live Fabric portal embed. Also: build small, potentially-controversial visual changes (e.g. a
  chart redesign) as an Artifact mockup first and get a yes before wiring real DAX/components —
  established explicitly this session for the sparkline, worth repeating for future visual asks.
- Verify: 120/120 tests pass, `tsc --noEmit` clean (one pre-existing unrelated failure in
  `use-query-panel.spec.ts`, not touched this session), `npm run lint` clean (one pre-existing
  unrelated warning in `main.tsx`), all changes committed + pushed to `main`, live app matches
  HEAD (`d823c2a`) — confirmed via `rayfin up` immediately before each commit, not after.

## Status (as of 2026-08-18)
- [DONE] Phase 3 (Page 1 UI) fully complete — T3.1 (severity-scale + IBM Plex design tokens),
  T3.2 (KPI strip + `App.tsx` header/nav shell, template `EmptyStatePreview` deleted), T3.3
  (sales-trend chart + top-at-risk ranked list, VegaVisual-wired, click-through to a Page-2 stub).
  All loading/empty/error states built per `docs/wireframe-design-brief.md`. 42/42 tests, lint
  and `npm run build` clean. See `tasks/todo.md` T3.1/T3.2/T3.3 for full detail.
- [FINDING] `npm run test:fabric` (live Fabric portal embed via `playwright-cli`) isn't runnable
  yet — needs `.env.local`/`.env.fabric` `VITE_FABRIC_ITEM_ID` etc, which only exist once the app
  is registered as a Fabric item (T4.1, Phase 4). Until then `AuthGate` also blocks standalone
  `npm run dev` by design (renders "Can't open this app outside Fabric" unless embedded). Live
  visual verification of Page 1 is deferred to after T4.1 — this session verified via lint,
  `tsc --noEmit`, unit tests (mocking `@microsoft/fabric-visuals`/`fabric-client`), and a full
  `npm run build`.
- [FINDING] `docs/design-and-dax-references.md`'s `dataviz` skill CVD validator FAILs the locked
  red/amber/green severity triad (ΔE 2.0 protan — red-green is a structurally hard case for a
  traffic-light metaphor). Accepted as-is: it's a 2026-08-17 design decision used app-wide (KPI
  rail, chart bars, will be badges in Phase 5), not something to redesign mid-phase under a
  hackathon deadline. Mitigated by always pairing color with a text legend/label, never color
  alone. Revisit only if there's real slack on 8/21 polish day.
- [DONE] **Local visual verification unblocked, durably.** The two findings above led to a real
  fix, not just a workaround: (1) Playwright is now available via `npx -y playwright@latest` with
  chromium already installed on this machine (`C:\Users\user\AppData\Local\ms-playwright`) — the
  Chrome extension not connecting is no longer a blocker for screenshotting the app. (2)
  `AuthGate` (`src/components/auth-gate.component.tsx`) and `main.tsx`'s `createAuthService()` now
  have a dev-only bypass: unauthenticated + `import.meta.env.DEV` renders the app with a "DEV
  PREVIEW" badge instead of the Fabric-only notice, and a `bootstrapAuth()` failure (missing
  Rayfin env vars, expected pre-T4.1) falls back to an unauthenticated stub instead of failing to
  boot the SPA. (3) `src/lib/dev-preview-fixtures.ts` + a per-component dev-fixture ternary
  (`import.meta.env.DEV && !import.meta.env.VITEST && panel.status === "error" ? FIXTURE : ...`)
  renders the real success-state UI (filled KPI tiles, chart, ranked bars) locally too, not just
  the error state. All of this is gated on `import.meta.env.DEV`, verified false-and-stripped in
  the production bundle by grepping the built JS for the dev-only strings (zero matches). To
  screenshot: `npm run dev`, then `npx -y playwright@latest screenshot --color-scheme light
  --full-page http://localhost:5173 out.png` (or a small node script with the `playwright` package
  installed locally for console/error capture — see this session's scratchpad pattern).
- [FINDING] This same local-render pass caught a real bug lint/tests/build all missed: the
  top-at-risk-items bar chart colored by Lead Time Priority Tier had no explicit `scale.domain`,
  so Vega-Lite alphabetized it (Long, Medium, Short) — "Long" (highest risk) rendered green,
  "Short" rendered red, backwards. Fixed by pinning `encoding.color.scale.domain:
  ["Short","Medium","Long"]` in `top-at-risk-items.json`; regression test added. **Lesson:
  code passing lint/tests/build is not sufficient sign-off for UI work — render it and look.**
- [PROCESS] Ran `/agent-skills:review` (code-review-and-quality skill) on the Phase 3 diff per the
  locked `addyosmani/agent-skills` tooling stack — hadn't been using the 8 lifecycle commands
  (`/spec /plan /build /test /review /webperf /code-simplify /ship`) beyond the initial `/spec`
  and `/plan` calls; had been hand-driving `tasks/todo.md` since. The review pass found and fixed
  a real architecture issue (3 components duplicating the same loading/error/empty branching,
  extracted to `src/hooks/use-query-panel.ts`) — worth running `/agent-skills:review` again before
  each phase is considered done, not just at the end.

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
- [DONE] Page 2 DAX query factory (T2.3) fully complete — see `tasks/todo.md` T2.3. All of
  Phase 2 (Query Authoring) is now done — SM core, risk measures, and both pages' query factories
  are built and verified. Next phase (T3.x, Page 1 UI) is real component/design work.
- [DONE] Page 1 DAX query factory (T2.2) fully complete — see `tasks/todo.md` T2.2.
- [DONE] Risk DAX measures (T2.1) fully complete — see `tasks/todo.md` T2.1.
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
4. [DONE 8/17] T2.1 risk DAX measures built + verified — see `tasks/todo.md` T2.1 for the
   RANKX(ALL(column)) vs RANKX(ALL(table)) bug caught during verification.
5. [DONE 8/17] T2.2 Page 1 query factory built + verified — see `tasks/todo.md` T2.2.
6. [DONE 8/17] T2.3 Page 2 query factory built + verified — see `tasks/todo.md` T2.3.
7. Next: T3.x (Page 1 UI) — apply the KPI-tile and chart-craft rules from
   `docs/design-and-dax-references.md`. This is real UI/component work (App.tsx nav, KPI tiles,
   trend chart, ranked list card) — bigger and more design-judgment-heavy than the query-factory
   work above, worth doing carefully rather than rushing under a tight remaining budget.
8. Continue through `tasks/todo.md` in order from there.
