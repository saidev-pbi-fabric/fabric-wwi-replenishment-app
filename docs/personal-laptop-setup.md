# Personal laptop setup — Fabric WWI Replenishment App

Steps to bring a personal laptop to parity with the work-laptop environment this project has been
built on: Fabric/Power BI login, the semantic-model tooling, and the Claude Code skills/plugins
this repo's workflow depends on. Written so a teammate can follow the same steps independently.

## Quick start — hand this to a fresh Claude Code session

Open VS Code on an **empty folder**, open Claude Code in it, and paste this as your first message
(fill in the repo URL if it's changed):

> Clone `https://github.com/saidev-pbi-fabric/fabric-wwi-replenishment-app.git` into this folder.
> Then read `docs/personal-laptop-setup.md` in the cloned repo and execute steps 1–3 (`npm install`,
> `az login`, the two Claude Code plugin marketplace/install commands) yourself. Stop and tell me
> to restart the session once the plugins are installed — don't try to continue past that point in
> the same session. Ask me to run any interactive browser sign-in yourself; don't attempt to script
> around it.

That gets you through the parts that don't need a restart. **Two things it genuinely can't do in
one shot** — a Claude Code session can't restart itself, and `az login`/`rayfin login` need a human
in front of the browser popup — so the realistic flow is exactly two messages, not one:
1. The message above (clone → install → plugins → stops before restart).
2. After you restart the session yourself, say **"continue the personal laptop setup from step 4"**
   — it verifies the MCP servers, runs `rayfin login` and confirms Fabric workspace access
   (prompting you for the interactive logins), runs the verification checks in step 6, then picks
   up at the first unchecked item in `tasks/todo.md`.

**Do this at Phase 0 of `tasks/plan.md` (T0.1)** — before Monday's semantic model build starts, not
during it. See "When to switch" below for why.

## When to switch

**Do this now, before the Monday (8/17) semantic model build — not during it.** SM build is the
schedule-critical day with no slack (see `tasks/plan.md` risks). Two reasons to front-load it:
1. Plugin installs need a Claude Code session restart before their slash commands / MCP tools are
   usable (this repo already hit that once with `addyosmani/agent-skills` — see project `CLAUDE.md`
   status log). Discovering that mid-build costs you the session.
2. `az login` / Fabric workspace access can have propagation delays (role assignment, trial
   capacity onboarding) that are better absorbed a day early than mid-task.

Once this checklist passes end-to-end, treat the personal laptop as primary and the work laptop as
backup — don't keep splitting work across both.

## Prerequisites

| Tool | Why | Get it |
|---|---|---|
| Node.js v22 | App build/dev, `npx` tooling | https://nodejs.org/dist/v22.22.2/node-v22.22.2-x64.msi |
| Git | Clone the repo | https://git-scm.com/downloads |
| Azure CLI | `az login` — backs Fabric REST/XMLA auth for semantic-model tooling | https://learn.microsoft.com/cli/azure/install-azure-cli |
| Claude Code CLI | This project's primary AI tooling | https://docs.claude.com/claude-code |
| Playwright CLI | Browser validation (`npm run test:fabric`) | `npm install -g @playwright/cli@latest` |
| Power BI Desktop | **Optional** — `semantic-model-authoring`'s MCP and `az rest`+TMDL workflows both work directly against a Fabric workspace with no Desktop involved. Only install if you'd rather author the model visually. | https://aka.ms/pbidesktopstore |

## 1. Clone the repo

```powershell
git clone https://github.com/saidev-pbi-fabric/fabric-wwi-replenishment-app.git
cd fabric-wwi-replenishment-app
npm install
```

## 2. Sign in to Azure / Fabric

```powershell
az login
```

Then confirm you can see the shared Fabric trial-capacity workspace: open the Fabric portal and
check the workspace shows up in your list. If it doesn't, ask the teammate who owns the trial
capacity to add your account as a member/contributor on that workspace — this is a portal action
on their side, not something scriptable here.

## 3. Install the Claude Code plugins this project's workflow depends on

Two plugin bundles, from two marketplaces:

```powershell
# Spec-driven dev workflow (/spec /plan /build /test /review /ship /code-simplify /webperf)
claude plugin marketplace add addyosmani/agent-skills
claude plugin install agent-skills@addy-agent-skills

# Fabric / Power BI authoring + consumption + operations skills
claude plugin marketplace add microsoft/skills-for-fabric
claude plugin install powerbi-authoring@fabric-collection
claude plugin install fabric-authoring@fabric-collection
claude plugin install fabric-consumption@fabric-collection
claude plugin install fabric-operations@fabric-collection
```

> If `claude plugin marketplace add microsoft/skills-for-fabric` doesn't pick up plugins directly
> from the GitHub repo, fall back to a local clone + directory-source add (this is how the work
> laptop ended up configured):
> ```powershell
> git clone https://github.com/microsoft/skills-for-fabric.git "$env:USERPROFILE\.claude\skills-for-fabric"
> claude plugin marketplace add "$env:USERPROFILE\.claude\skills-for-fabric"
> ```

**Restart the Claude Code session after installing** — plugin slash commands and MCP servers load
at process startup, not mid-session.

## 4. Register the MCP servers

`powerbi-modeling-mcp` (the live semantic-model connection the `semantic-model-authoring` skill
prefers — see [Tool Selection Priority](https://github.com/microsoft/skills-for-fabric) in that
skill) is **bundled inside the `powerbi-authoring` plugin's own `.mcp.json`** — confirmed by
reading `plugins/powerbi-authoring/.mcp.json` in the `microsoft/skills-for-fabric` repo, it runs
`npx -y @microsoft/powerbi-modeling-mcp@latest --start` automatically. **No manual install step —**
installing the plugin in step 3 and restarting is enough. (The `fabric-authoring` plugin similarly
bundles its own `fabric-sqlendpoint` remote MCP server.)

`fabric-mcp-server` (`npx -y @microsoft/fabric-mcp@latest server start --mode all`, general Fabric
item/workspace operations) and `microsoft-learn` (hosted Microsoft Learn docs search, `https://learn.microsoft.com/api/mcp`)
are **not** bundled by any of the `skills-for-fabric` plugins — they need registering by hand once,
either via `claude mcp add` (run `claude mcp add --help` for current flag syntax) or by adding
these entries to `~/.claude.json`'s `mcpServers` block:

```json
{
  "mcpServers": {
    "microsoft-learn": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp"
    },
    "fabric-mcp-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@microsoft/fabric-mcp@latest", "server", "start", "--mode", "all"],
      "env": {}
    }
  }
}
```

After the next restart, confirm all three with:

```powershell
claude mcp list
```

Without `powerbi-modeling-mcp` connected, the `semantic-model-authoring` skill still works — it
falls back to `az rest` (`getDefinition`/`updateDefinition` on TMDL) against the Fabric workspace,
just with an extra local-edit-then-redeploy step instead of live editing.

## 5. Sign in to Rayfin (needed for the `ReorderAction` write-back entity)

```powershell
npx rayfin login
```

Entra ID sign-in, same tenant as the Fabric trial workspace.

## 6. Verify

```powershell
npm run lint
npm test
npm run dev          # sanity-check the dev server starts; validate for real via test:fabric, not localhost
```

Then in Claude Code, confirm the plugin slash commands resolve (`/spec` etc. shouldn't say
"Unknown skill") and that `semantic-model-authoring`, `dax-authoring`, `schema-discovery`, and
`sqldw-consumption-cli` are triggerable.

## Fabric/Power BI skills this project leans on

Already available once step 3 completes — worth knowing what each is for so they get used instead
of hand-rolled `az rest` calls or raw SQL:

| Skill | Use it for |
|---|---|
| `semantic-model-authoring` (powerbi-authoring plugin) | Building/editing the WWI semantic model itself — tables, relationships, the risk/lead-time/priority DAX measures, Import-mode setup, deploy to the Fabric workspace. **Primary tool for the Monday SM build.** |
| `sqldw-consumption-cli` (fabric-consumption plugin) | Read-only T-SQL against the Warehouse after the Copy Job runs — spot-check row counts and column values while verifying `docs/wwi-schema-reference.md` against the real loaded data. |
| `dax-authoring` (this repo's own `.agents/skills`, bundled in via `AGENTS.md`) | Writing and testing the `.dax` query files under `src/queries/` — DAX syntax rules, patterns, the iterative `npx fabric-app-data query` test loop. |
| `schema-discovery` (this repo's own `.agents/skills`) | Progressively discovering semantic model metadata via DAX `INFO` functions — used instead of ever asking a human to describe the schema. |
| `query-design` (this repo's own `.agents/skills`) | Filter strategy, multi-grain patterns, anti-patterns to avoid when shaping the Page 1/Page 2 DAX queries. |
| `app-design` / `app-validation` / `visuals` / `fabric-cli` / `fabric-sdk` / `playwright-cli` (this repo's own `.agents/skills`) | UI conventions, the Fabric portal embed validation flow, chart/grid component patterns — all already wired into `AGENTS.md`'s recommended workflow. |
| `rayfin` (this repo's own `.agents/skills`) | The `ReorderAction` entity, `rayfin.yml` services, `rayfin up` deploy — write-back side. |

Not needed for this project (flagging so they're not reached for by habit): `powerbi-report-*`
skills (this is a Fabric Data App, not a Power BI report — no PBIR/PBIP report authoring involved)
and the Spark/pipeline/medallion skills (`spark-authoring-cli`, `e2e-medallion-architecture`, etc.
— out of scope per `CLAUDE.md`'s locked "no manual pipeline build" decision).
