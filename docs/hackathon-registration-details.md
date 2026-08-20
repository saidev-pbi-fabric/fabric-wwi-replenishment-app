# Hackathon Registration Details — WWI Replenishment

Team name intentionally left out — fill in yourself. Everything else below is drawn from
`CLAUDE.md` and this repo's actual current state, not guessed.

## Event
- Microsoft Fabric Hackathon 2026
- Hosted by: Hyderabad Data & AI Community + India Fabric User Group
- Event date: 2026-08-22, 10am–5pm
- Track: "Fabric App Champion"

## Project name
WWI Replenishment (repo: `fabric-wwi-replenishment-app`)

## One-liner
Demand-driven reorder attention for a wholesale distributor — ranks stock items by sales
velocity vs. supplier lead time, and lets a user log and track reorder decisions directly
against that ranking.

## Problem statement
Standard BI dashboards show sales history but leave the "what do I do about it" step to a
human working outside the report — usually a spreadsheet or an email. This app closes that
loop inside a single Fabric Data App: view what's at risk of stocking out, then record and
track the reorder action for it, without leaving the app.

## Dataset
Wide World Importers (WWI) retail sample data, loaded via Fabric Warehouse's native Copy Job
("Retail Data Model from Wide World Importers", full copy) — 6 tables, ~50M sales rows spanning
Jan–Nov 2000. No real stock-on-hand or purchasing data exists in this sample, so the
"replenishment risk" signal is a disclosed proxy (sales velocity trend vs. supplier lead time,
ranked) rather than a literal backorder count — documented openly in the app and in
`docs/wwi-schema-reference.md`, not hidden.

## Tech stack
- **Data**: Fabric Warehouse (WWI sample via Copy Job) → Power BI semantic model, Import mode,
  custom DAX risk measures.
- **Backend**: Rayfin (Microsoft's Backend-as-a-Service for Fabric apps) — Fabric-embedded Entra
  SSO auth, a typed data entity (`ReorderAction`) backed by a provisioned SQL database, static
  app hosting, all deployed as a real Fabric item in the team workspace.
- **Frontend**: React + TypeScript + Vite, Tailwind CSS v4, Vega-Lite charts via
  `@microsoft/fabric-visuals`.

## Status as of today (2026-08-18)
Core dashboard and write-back functionality both built and deployed to a live Fabric-embedded
app — real semantic model reads and real backend writes, not mocked. Remaining before the 8/21
demo target: visual polish, an entry/landing page, and a final validation pass.

## Links
- GitHub (public): https://github.com/saidev-pbi-fabric/fabric-wwi-replenishment-app
- Live app: deployed inside the team's Fabric workspace (`Fabric-App-Hackathon`) — opens via the
  Fabric portal, not a standalone public URL (Fabric-embedded auth by design).
