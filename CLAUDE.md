# Claude context - Fabric WWI Replenishment App

Microsoft Fabric Hackathon 2026 entry (Hyderabad Data & AI Community + India Fabric User Group),
"Fabric App Champion" track. Event: 2026-08-22, 10am-5pm. Team-demoable target: 2026-08-21.

## Locked scope (do not re-litigate without a real reason)
- **One unified Fabric Data App** — dashboards/insights and a write-back/data-entry feature live
  in the same app, not two separate apps.
- **Dataset: Wide World Importers (WWI)**, the DW/star-schema slice, loaded via Fabric Warehouse's
  native Copy Job wizard: New Item -> Copy job -> Sample data -> "Retail Data Model from Wide
  World Importers" -> Full copy. No manual download, no medallion/pipeline build.
- **Scenario: Stock replenishment / back-order risk.** Real signals confirmed in the actual DW
  schema (see `docs/wwi-schema-reference.md`), not invented: `Fact.Order.WWI Backorder ID`
  (populated = backorder), `Fact.Stock Holding.Quantity On Hand < Reorder Level` (at-risk rule),
  `Dimension.Stock Item.Lead Time Days` (urgency), `Fact.Purchase.Is Order Finalized` (avoid
  duplicate reorder suggestions).
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
- [NOT STARTED] Team hackathon registration (Google Form) - teammate handling, incl. an organizer
  conversation about track/details.
- [NOT STARTED] Fabric workspace credentials - Saidev getting these from teammate, who has an
  existing working Fabric Trial capacity (no new trial needed).
- [BLOCKED ON RESTART] `/spec` - produces `SPEC-[name].md` (Objective, Commands, Structure, Code
  Style, Testing, Boundaries). Ready to run as soon as a new session picks up the plugin.
- [NOT STARTED] `/plan` - produces `tasks/plan.md` + `tasks/todo.md`.
- [NOT STARTED] Semantic model build (blocked on Fabric credentials).
- [NOT STARTED] App build (blocked on SM + spec/plan).

## Next actions, in order
1. **Restart the Claude Code session** (new window/session in this folder) so the
   `addyosmani/agent-skills` plugin's slash commands load.
2. Run `/spec`.
3. Run `/plan`.
4. Once Fabric credentials arrive: load WWI data, build the semantic model (Import mode).
5. Build the app in this same repo, against the semantic model from step 4.
