# Design Feedback (in progress)

Parked here 2026-08-19 while other app work was underway. This folder holds design/UI feedback
and proposals; most of the concrete fixes have since been applied to `src/` directly (see below).

## Contents
- `design-strategy-guide.md`: hallmark audit (1 critical, 5 major, 1 minor), gallery study,
  skill-chain recommendation, Vega-vs-D3 call, design-system status. See its §6 for the
  file:line-scoped findings.
- `reference-checklist.md`: what to screenshot and where, for gathering real dashboard
  references to compare this app against.

## Status
Fixed and deployed (2026-08-19/20): landing page `STEPS` 3-card-grid, KPI tile false hover
affordance, nav `transition-all`, missing `:focus-visible` rings, item-detail-panel header tint.

Still open: card-chrome hierarchy differentiation across the app (major finding, the closest
thing to a root cause behind "feels basic"), spinner delay-show, curly quotes in landing copy,
and the Action Center duplicate-title header reclaim (mockup built, waiting on approval, see
`docs/known-issues.md`).
