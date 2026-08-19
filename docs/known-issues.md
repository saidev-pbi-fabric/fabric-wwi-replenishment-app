# Known Issues

Tracked bugs and pending decisions that aren't design proposals (those live in
`docs/design-feedback-pending/`).

## Open

- **Ranked-list scrollbar flashes on open, list caps at ~10 visible rows.**
  Found 2026-08-20 on the live Action Center page (`RankedListPanel`, 672 items). Scrollbar
  renders on initial paint, then disappears; only around 10 rows stay reachable after that.
  Needs investigation in `src/components/action-center/ranked-list-panel.tsx`'s scroll
  container (`overflow-y-auto` + `max-h-[...]` region) — likely a height/overflow recalculation
  race, not a data issue (672 items load fine, just aren't all reachable by scroll).

- **Action Center duplicate page title eats vertical space.**
  `App.tsx`'s `ActionCenterPage` renders an H1 "Action Center" that duplicates the already-active
  nav tab label. Mockup built (Artifact "Control Room Fixes," Fix 04) dropping the H1 and folding
  the subtitle into a slim caption. Waiting on approval before touching `src/`.

## Fixed

- 4 stale `.claude/worktrees/agent-*` git worktrees removed (2026-08-20). Confirmed no real
  work lost first — only untracked `closing-checks` skill eval-harness output files and one
  redundant CLAUDE.md log commit already duplicated on `main`. `npm run lint` clean afterward
  (was previously broken by the extra tsconfig paths these introduced).

- Landing page `STEPS` 3-card grid → uniform-chrome numbered flow (2026-08-19, then corrected
  2026-08-20 after live render showed inconsistent card chrome between step 1 and steps 2-3).
- KPI tile false hover affordance on non-clickable tiles (2026-08-19).
- Nav `transition-all` → `transition-colors`, missing `:focus-visible` rings app-wide (2026-08-19).
- `ItemDetailPanel` header tint for visual differentiation (2026-08-19).
