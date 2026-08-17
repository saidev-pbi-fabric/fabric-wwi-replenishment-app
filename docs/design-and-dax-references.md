# Design & semantic-model reference links

Curated 2026-08-17, researched via a subagent against `docs/wireframe-design-brief.md`'s gap
(layout/type/color locked, no chart-craft/KPI-anatomy/description-writing guidance). Verdicts
below are calls on relevance to *this* project (custom React charts via Fabric Data App, no PBI
report canvas) — not a general review of the sources.

## Chart craft — data-goblins.com (Power BI dataviz blog)

| Link | Verdict | Why |
|---|---|---|
| [five-minutes-to-wow](https://data-goblins.com/power-bi/five-minutes-to-wow) | Skip | Narrative/adoption piece, no concrete rules |
| [bar-charts](https://data-goblins.com/power-bi/bar-charts) | Use | Bullet charts for target-vs-actual; divergent bars for magnitude-of-difference; stacked for total + part-to-whole. Pick variant for the comparison, not novelty |
| [line-chart-basics](https://data-goblins.com/power-bi/line-chart-basics) | Use | Y-axis starts at 0; avoid smoothing on non-continuous data; label only highest/lowest/latest point; cap concurrent series in area charts; show confidence bands on forecasts |
| [kpi-templates](https://data-goblins.com/power-bi/kpi-templates) | Use | Directly maps to Page 1 KPI strip — card = Number + Meaning (vs. target/prior, color+arrow not color alone) + Context. Cap 3-4 cards, use color sparingly |
| Reporting Objects post (found via crawl, exact URL not captured) | Use, tangential | Report-only measures (color/SVG/dynamic-title helpers) should be isolated in their own display folder, hidden/Private, documented — relevant once chart-styling DAX gets added |

No other chart-craft posts found on the site beyond these — rest of the recent archive is
non-dataviz (Copilot myths, semantic-link-labs, column widths).

## Semantic model + Fabric Data App — tabulareditor.com/blog

| Link | Verdict | Why |
|---|---|---|
| [how-to-write-good-ai-instructions-for-a-semantic-model](https://tabulareditor.com/blog/how-to-write-good-ai-instructions-for-a-semantic-model) | Use | Structure as Business terminology / Defaults when ambiguous / For Copilot only. Ground in real query-log failures, not guesses. Stay concise (10k-char limit) |
| [writing-good-descriptions-for-semantic-model-columns-and-measures](https://tabulareditor.com/blog/writing-good-descriptions-for-semantic-model-columns-and-measures) | Use, applies to T2.1 now | Descriptions must add non-obvious info: calc logic, source mapping, caveats. AI-facing descriptions need disambiguation rules ("when user says X, use this measure not that"). Never ship AI-drafted descriptions unreviewed |
| [how-data-apps-make-semantic-models-better-in-fabric](https://tabulareditor.com/blog/how-data-apps-make-semantic-models-better-in-fabric) | Use, architecture-critical | Hard separation: SM = business logic, app = presentation only. App queries via DAX, never bypasses to warehouse directly. Strip report-only DAX out of the model |
| [fabric-apps-explained-visualization-as-code-in-a-data-app-dashboard](https://tabulareditor.com/blog/fabric-apps-explained-visualization-as-code-in-a-data-app-dashboard) | Use, highest value | Describes almost exactly our `.dax`+`.json`+`.ts` factory pattern (SPEC.md). Validate `.dax` in Tabular Editor/DAX Studio before wiring in. Build shared component library + global.css early — style drift across charts is a real risk |
| [lessons-from-anthropics-implementation-of-agentic-self-service-bi](https://tabulareditor.com/blog/lessons-from-anthropics-implementation-of-agentic-self-service-bi) | Use, genuinely new ideas | Co-locate data + artifacts for agent discoverability; run regression tests of agent accuracy against a ground-truth snapshot over time; treat skill/context edits as atomic, testable changes |

## GitHub repos

| Link | Verdict | Why |
|---|---|---|
| [data-goblin/powerbi-macguyver-toolbox](https://github.com/data-goblin/powerbi-macguyver-toolbox) | Reference only | 60+ scored chart templates ("Goblin graph scores") — useful to browse for chart-craft ideas, but PBIX/PBIP-bound, not portable to React |
| [data-goblin/power-bi-agentic-development](https://github.com/data-goblin/power-bi-agentic-development) | **Useful** | Mature (857★), maintained skills/agents/hooks marketplace for AI-driven PBI/Fabric work (TMDL/PBIP validation, DAX, semantic modeling). Overlaps but doesn't duplicate our `powerbi-modeling-mcp` setup — worth a skim for the semantic-model-authoring workflow. Pin their v26.25 per the repo's own stability warning |
| [data-goblin/power-bi-visual-templates](https://github.com/data-goblin/power-bi-visual-templates) | **Skip** | Tabular Editor C# scripts injecting visuals into native PBIP report files — irrelevant, this project has no PBI report canvas |

## How this gets used

- **T2.1 (risk DAX measures, next up):** apply the descriptions-writing guidance when adding
  `description` to each new measure/column per `modeling-guidelines.md`.
- **T3.x (Page 1 UI build):** apply KPI-card anatomy + bar/line chart rules when building the KPI
  strip and trend chart components. Re-check the "5 minutes to wow" — no, skipped — use
  `kpi-templates` + `bar-charts` + `line-chart-basics` as the working checklist instead.
- **T2.2/T2.3 (DAX query factory):** cross-check the `.dax`/`.json`/`.ts` pattern against the
  "visualization as code" post before finalizing `src/queries/` structure.
- Not turned into a Skill — this is one-off curated reference material for a fixed, small task
  (finish 2 pages of one app), not a reusable cross-project behavior. `skill-creator` is for
  packaging repeatable workflows invoked across sessions/projects; a plain doc is the right shape
  here. Revisit only if this curation step turns out to repeat (e.g. next hackathon).
