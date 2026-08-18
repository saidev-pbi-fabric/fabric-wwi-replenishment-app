# Resume prompt — paste this to start the next session cold

Written 2026-08-18 (session ended at ~87% usage), for the session starting 2026-08-19.

Resuming the Fabric WWI Replenishment App hackathon build (#wwi-hackathon-build). Read
`CLAUDE.md`'s Status block first. Short version: Phases 1-5 (semantic model, DAX, Page 1/Page 2 UI,
write-back) are done and deployed. T6.1 (validation/polish), T6.4 (landing page) are also done.
Currently mid-`Phase 6` — the app is live and being iterated on visually based on the user's
live-portal screenshots.

## Run this first: `gsd-ui-auditor`

Before making any more hand-driven visual changes, run the `gsd-ui-auditor` agent — a retroactive
6-pillar visual audit that produces a scored `UI-REVIEW.md`. This was explicitly planned for
today: the user has been self-reviewing (me building the UI, then me judging it) for several
rounds now and wants an independent score before deciding what's next. See
`C:\Users\user\.claude\projects\C--RayfinApps-fabric-wwi-replenishment-app\memory\project_ui_audit_plan.md`
for the full reasoning.

**Only after that audit lands and the user has reviewed it**, decide whether to invest in a full
`design-dna`/`taste-skill` redesign pass. Both are already installed as repo-local skills
(`.claude/skills/`, committed — `git pull` gets a fresh clone up to date). Full reference bank at
`docs/design-reference-bank.md`.

## Open items from the last session (2026-08-18), not yet resolved

1. **Light mode "looks plain, colors not great"** — user flagged this directly, not yet touched.
   Planned fix (discussed, not implemented): retune `src/global.css`'s light-mode `--color-*`
   tokens (border/muted/card contrast + severity ramp). Single file, but global blast radius —
   re-run the CVD/contrast validator (`dataviz` skill) on the severity colors after, and
   re-screenshot every page in light mode, not just the one that prompted the complaint.
2. **Top-strip "messed up" screenshot** — diagnosed as the browser's own tab chrome (above Fabric's
   toolbar, outside our app entirely, not fixable on our end) — **user has not yet confirmed this
   diagnosis**. Don't act on it further until they do; ask again if it comes up.
3. **Other 3 KPI tile icons have no hover/click animation** — deliberate, not an oversight: only
   the "Top At-Risk Items" tile has a bound action (drill-through), so only its icon animates.
   Discussed option: give "Accelerating Demand" its own drill-through (same pattern as
   `top-at-risk-drill.ts`/`TopAtRiskDrillThrough`) so its icon would also earn real hover/click
   motion — not built, needs a decision first, not a default yes.
4. **Action Center** hasn't had the same drill-through/layout-reflow pass Overview just got — if
   the user likes what landed on Overview, the same measure-first-then-fix approach applies there
   too.

## Known fragile points, don't re-litigate

- `fabric-sqlendpoint` MCP is disabled — broken OAuth, not fixable. Use the AAD-token
  `System.Data.SqlClient` PowerShell pattern (documented in `CLAUDE.md` history) or the Power BI
  REST `executeQueries` + `az account get-access-token --resource
  https://analysis.windows.net/powerbi/api` pattern (used this session to verify DAX fixes live)
  if direct model access is needed again.
- `powerbi-modeling-mcp` DAX queries can hang on a stale connection credential — fix via
  `connection_operations` `Disconnect` then `ConnectFabric` with `clearCredential: true`.
- **`SUMMARIZECOLUMNS` filter-table arguments must sit directly after the group-by columns, not
  after the named measure pairs** — got this wrong once this session (`{{TIER_FILTER}}`
  placeholder position), caused a live DAX syntax error caught only by executing the query, not by
  unit tests. If templating another DAX query with a filter placeholder, get the position right
  the first time.
- Any UI change involving loading/re-query states: use the `"refreshing"` status from
  `use-query-panel.ts` (added this session) to keep prior content visible instead of a blank
  skeleton — don't reintroduce the blank-flash bug in a new component.
- **Local dev-preview fixtures bypass real async loading entirely** — they resolve synchronously,
  so bugs that only appear during a real network round-trip (like the blank-flash transition, or
  the tier-filter-returns-zero-rows bug) will never show up in local screenshots. Verify against
  the live semantic model directly (Power BI REST API) or the deployed app, not just local
  fixtures, before calling a data-shape-dependent feature done.

## Process lesson from this session, apply going forward

Every "fixed it" this session that turned out to still be broken traced back to the same root
cause: verifying against hand-built fixtures/unit tests instead of the real live data distribution
or the actual deployed app. Before calling anything involving real data "done," check it against
the live semantic model or a live deploy, not just local fixtures — this was said explicitly by
the user more than once.

Start by checking `git log --oneline -10` and `git status` to confirm nothing changed since this
prompt was written, then run `gsd-ui-auditor`.
