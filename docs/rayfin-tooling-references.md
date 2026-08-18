# Rayfin & Fabric tooling reference links

Curated 2026-08-18, checked live via `gh repo view` against this project's actual state (not
guessed). Same pattern as `docs/design-and-dax-references.md` — verdicts are calls on relevance
to *this* project, not a general review of the sources. Candidate for migration to Notion once
enough categories exist; keep adding to this file as `/research` turns up more, don't scatter
links elsewhere.

## Core platform

| Link | Verdict | Why |
|---|---|---|
| [microsoft/rayfin](https://github.com/microsoft/rayfin) | **Already in use — bookmark for reference** | This is the actual platform the app is built on. `package.json` already depends on 7 `@microsoft/rayfin-*` packages (`rayfin-cli`, `rayfin-core`, `rayfin-client`, `rayfin-data`, `rayfin-lib`, `rayfin-auth-provider-fabric`, `rayfin-mcp`), and `rayfin env`/`rayfin up` are already wired into `npm run dev`/`build` (`predev`/`prebuild` scripts) and `rayfin/rayfin.yml`. Nothing to add — use its README/docs (`aka.ms/rayfin/docs`) as the reference for T4.1 (`ReorderAction` entity via `@entity()` decorators, `data.enabled: true`, `rayfin up`). |
| [microsoft/awesome-rayfin](https://github.com/microsoft/awesome-rayfin#-templates) | **Reference only, do not scaffold from it** | Community template gallery (Angular dashboard, field-technician, transport-map, IBCS trainer, PBI fixer, slide deck, blank apps, todo-local-experimental). This app is already scaffolded from a different template family (`fabric-apps-analytic-templates`, per `CLAUDE.md`) — re-scaffolding isn't on the table. Two things worth an actual skim before T4.1: the **Data Modeling** section (`@entity()`/`@text()`/`@boolean()`/`@date()` decorator syntax) directly previews what `ReorderAction` needs, and the **[todo-local-experimental](https://github.com/microsoft/awesome-rayfin/tree/main/templates/todo-local-experimental)** template solves the same "run without a live Fabric embed" problem we hand-built tonight with `AuthGate`'s dev bypass — could inform how T4.1's local dev/test story should work once real data-entry is involved, not just read-only dev-preview. |
| `@microsoft/rayfin-mcp` (npm) | **Registered, not currently active** | Already declared in this repo's `.mcp.json` (`npx @microsoft/rayfin-mcp start`) — but no `rayfin`-prefixed tools showed up in this session's tool list. Consistent with everything else gated on T4.1: the server likely needs a deployed/logged-in Rayfin project to have anything to expose. Re-check once T4.1 is underway rather than treating this as broken now. |

## Skipped

| Link | Verdict | Why |
|---|---|---|
| [spatney/rayfin-fabricator](https://github.com/spatney/rayfin-fabricator) | **Skip for this project** | A desktop GUI (Tauri app) that wraps `rayfin up` + a GitHub Copilot chat agent + live preview into one window — explicitly labeled by its own README as *"a personal project... not a Microsoft product... not affiliated with, endorsed by, sponsored by, or supported by Microsoft."* Three reasons to skip: (1) it duplicates exactly what Claude Code + this terminal already do for this team — chat-to-build, git snapshots, one-click `rayfin up`; (2) `CLAUDE.md` already locks Claude Code as primary tooling specifically to avoid mixing frameworks under hackathon time pressure; (3) it requires a separate installer + GitHub Copilot sign-in for zero net-new capability here. Worth knowing it exists if a teammate ever wants a GUI over a fresh Rayfin project, but not for this build. |

## Fabric-side skills already available (not separate repos to add)

These already exist as installed Claude Code agents/skills in this environment — no new repo needed:

- `fabric-skills:FabricAppDev`, `FabricDataEngineer`, `FabricAdmin`, `FabricIQ` — subagents for
  Fabric app/data-engineering/admin/BI work. Not used directly this session; instead the
  underlying MCP tools (`fabric-mcp-server`, `powerbi-modeling-mcp`, OneLake `onelake_*` tools)
  were called directly since this session already had them available and didn't need the
  delegation layer.
- `microsoft-learn` MCP (`microsoft_docs_search`/`fetch`/`microsoft_code_sample_search`) — official
  Microsoft/Azure docs, already available every session.
