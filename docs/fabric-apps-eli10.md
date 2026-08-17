# Fabric Apps, explained like you're 10

Source: [Tabular Editor blog — "Fabric Apps Explained: Visualization-as-Code in a Data App
Dashboard"](https://tabulareditor.com/blog/fabric-apps-explained-visualization-as-code-in-a-data-app-dashboard)
(full read, condensed below — nothing invented that isn't in the article).

**Why this matters for us:** the article is describing *exactly* the stack this repo already
uses (Rayfin CLI, `.dax`/`.tsx`/Vega-Lite files, `@microsoft/fabric-app-data`, `fabric.yaml`) —
this isn't background reading, it's the manual for what we're building.

## 1. What's a Fabric App?

A workspace item type in Microsoft Fabric that's a real web app (lives in the browser) — not a
fixed dashboard template. It can be a data dashboard, or a tool to manage data/services.

## 2. What's a "Data App"?

One flavor of Fabric App, built for analytics. It connects to a **published semantic model**
and queries it in **DAX** — same as a Power BI report would. That's ours.

## 3. "Visualization-as-code" — the big idea

Instead of dragging visuals onto a canvas (Power BI style), you **write code**: HTML,
TypeScript, and DAX. You use real charting libraries (Vega, Vega-Lite, D3.js) instead of Power
BI's built-in visual types. Trade-off: total pixel-level control, but zero drag-and-drop.

**The article's own metaphor:** *if a Power BI report is LEGO, a data app is a 3D printer.*
LEGO = fast, preset pieces, limited shapes. 3D printer = slower to set up, but you can make
literally any shape.

## 4. Data App vs. Power BI report — side by side

| | Power BI report | Data App |
|---|---|---|
| Build with | Drag-and-drop UI | Code, no GUI |
| DAX | Auto-generated for you | You write `.dax` files by hand |
| Visuals | Pick from a preset list | You code every visual from scratch |
| Interactivity (filter/drilldown/slicers) | Built in | You code it yourself |
| Deploy | Click "Publish" in Desktop | Terminal commands (build + upload) |

## 5. Anatomy of one visual (4 files, working together)

1. **`.dax`** — the query. Uses placeholder text like `{{LEVEL}}`, `{{YEAR}}`, `{{FILTERS}}` that
   get swapped for real values at runtime.
2. **`.json`** — the Vega-Lite spec: chart type + how data maps to visual encoding (axes,
   colors, etc).
3. **`.ts`** — the glue. Wires the `.dax` query to the `.json` spec, does the placeholder
   swap-in.
4. **`global.css`** — shared styling, same job as a Power BI theme file.

Plus config files: `fabric.yaml` (which workspace + semantic model this app talks to),
`rayfin.yml` (backend config).

Example DAX from the article (placeholder syntax circled):
```dax
EVALUATE
CALCULATETABLE(
    FILTER(
        SUMMARIZECOLUMNS(
            'Regions'[{{LEVEL}}],
            "OTD %", [OTD % (Lines)],
            "OTD % 1YP", [OTD % (Lines) 1YP],
            "vs 1YP", [OTD % (Lines) vs 1YP (Δ)]
        ),
        NOT ISBLANK([OTD %])
    ),
    'Date'[Calendar Year Number (ie 2021)] = {{YEAR}},
    'Exchange Rate'[From Currency] = "EUR"{{FILTERS}}
)
```

## 6. Tools mentioned

- **Rayfin CLI** — scaffolds the project (`bun create @microsoft/rayfin@latest`), deploys
  (`bunx rayfin up`), runs local dev server (`bun run dev`, localhost:5173). **We already use
  this.**
- **`@microsoft/fabric-app-data`** — the React package that talks to the semantic model.
  **We already use this.**
- **Fabric CLI** — browse workspaces/models.
- **Tabular Editor CLI** — check/validate DAX and model schema before wiring it into a visual.
- Charting: Vega-Lite (main path, has Microsoft helper packages) or D3.js for extra control.

## 7. The workflow (article's steps)

1. Have a published semantic model + workspace access (Contributor+) ready first.
2. Scaffold: `bun create @microsoft/rayfin@latest -- "MyApp" --template dataapp --workspace "WorkspaceName"`.
3. Tell your AI agent the semantic model + what dashboard you want — it generates the files.
4. `bun run dev`, look at it in the browser, give feedback, iterate.
5. Sanity-check DAX with Tabular Editor CLI before trusting a visual's numbers.
6. `bunx rayfin up` to build + deploy to OneLake.
7. Open it for real in the Fabric Portal (signed in with Entra identity).

## 8. It's built assuming AI writes it

Straight from the article: *"The expectation is that if they create these items, they do so
primarily using AI."* Agents get an `.agents/skills/` folder, `AGENTS.md`, `.mcp.json`, and
skills specifically for DAX / semantic-model reference / styling — **this is our repo's
structure already** (`AGENTS.md`, `.agents/skills/`).

Reported speed gain: *"±80% less time than the same bespoke design in a Power BI report."*

## 9. The honest downsides (worth remembering under time pressure)

- **"Most people who build a data app won't even read the code"** — the article flags this as a
  real risk to quality, maintainability, and security if nobody reviews what the agent wrote.
  Don't skip reading the generated `.dax`/`.tsx` before shipping.
- More moving parts than Power BI: HTML, CSS, TS, JS, DAX, YAML all at once.
- Multiple AI-generated visuals can drift inconsistent in look/behavior without discipline —
  this is exactly why our `dataviz` skill + `global.css` matter.
- New skills needed (React/web dev), not just Power BI skills.
- LLM token cost is a real, ongoing cost — not free.

## 10. Bottom line

Data apps don't replace Power BI reports — they coexist. Power BI stays simpler/safer for
plain self-service reporting. Data apps win when you need something Power BI's canvas can't do,
and you're willing to trade "drag and drop" for "write it in code, faster than you'd think."
That's the trade this hackathon project is making on purpose.
