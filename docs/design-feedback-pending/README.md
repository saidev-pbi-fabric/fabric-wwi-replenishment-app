# Design Feedback — PENDING, not yet applied

Parked here 2026-08-19. Real app work was in progress when this feedback landed — don't act on
it until current work finishes. This folder holds design/UI feedback and proposals only; it does
not touch `src/`.

## Contents
- `design-strategy-guide.md` — hallmark audit (1 critical · 5 major · 1 minor) + gallery study +
  skill-chain recommendation + Vega-vs-D3 call + design-system status. See its §6 for the
  file:line-scoped findings.

## Next step when ready
Fix order per the audit: landing page `STEPS` 3-card-grid (critical) → card-chrome hierarchy
differentiation (major, root cause of "feels basic") → KPI hover-affordance bug → nav
`transition-all` / missing `:focus-visible` / spinner delay-show (the rest of major/minor).

An HTML mockup demonstrating the proposed fixes (not wired to real components) may be added here
or linked from here before anything lands in `src/` — check for an Artifact link in the session
this was discussed, or ask for one to be regenerated.
