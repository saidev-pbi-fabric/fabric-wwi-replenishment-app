# Implementation Plan — Fabric WWI Replenishment App

Source: `SPEC.md`. Scope, pages, entity, and stack are locked there — this plan sequences the work,
it doesn't re-decide it.

## Dependency graph

```
T0.1 personal-laptop env parity ──┐
T0.2 Fabric workspace access ─────┤
                                   ▼
T1.1 WWI Copy Job (Warehouse) ──► T1.2 Semantic model core (Import, relationships)
                                              │
                                              ▼
                                   T2.1 Risk DAX measures (SM-side)
                                              │
                              ┌───────────────┴───────────────┐
                              ▼                                ▼
                   T2.2 Page 1 DAX + connection reg   T2.3 Page 2 DAX
                              │                                │
                              ▼                                │
                   T3.1 Design tokens                          │
                              │                                │
                              ▼                                │
                   T3.2 KPI strip (e2e)                        │
                              │                                │
                              ▼                                │
                   T3.3 Trend chart + ranked list (e2e)        │
                              │                                │
                    ── CHECKPOINT: Page 1 demoable ──          │
                                                                 │
   T4.1 ReorderAction entity + rayfin deploy (independent) ─────┤
                              │                                 │
                              └────────────┬────────────────────┘
                                            ▼
                                 T5.1 Master list + detail (e2e)
                                            │
                                            ▼
                                 T5.2 Write-back create path (e2e)
                                            │
                                            ▼
                                 T5.3 Status update path (e2e)
                                            │
                        ── CHECKPOINT: full golden path verified ──
                                            ▼
                                 T6.1 Validation pass (both pages)
                                            │
                                            ▼
                                 T6.2 Talk-track + buffer
```

**Notes on parallelism:**
- T0.1/T0.2 (env + access) can run for both team members simultaneously, ahead of everything else.
- T4.1 (Rayfin entity) has no data dependency on the semantic model — it can be built in parallel
  with T1.x/T2.x by the second team member once `data.enabled: true` is flipped.
- T2.2 and T2.3 (Page 1 vs Page 2 DAX) can be split across the two team members once T2.1 lands.
- **T5.1's edge from the "Page 1 demoable" checkpoint is a schedule choice, not a hard dependency.**
  T5.1 actually only needs T3.1 (tokens), T2.3 (Page 2 DAX), and T4.1 (entity) — not T3.2/T3.3. The
  graph below routes it through the checkpoint to match the Tue→Wed day split in `CLAUDE.md`, but
  if Page 1 runs long, a second team member can start T5.1 without waiting on it.
- Everything under T3.x and T5.x is vertically sliced (one full data → UI path per task, not
  "build all queries" then "build all components" as separate layers) so each task is independently
  demoable the moment it's done.

## Checkpoints

1. **After T1.2** — semantic model relationships match `docs/wwi-schema-reference.md` before any
   DAX is written against it (catches a wrong FK/grain early, not after 5 queries are built on it).
2. **After T2.1** — risk measures spot-checked against 3 known stock items (at-risk, on-track,
   backorder) before any query factory file is written, so UI bugs can't hide a wrong measure.
3. **After T3.3** — Page 1 demoable standalone. Good fallback checkpoint if write-back runs late.
4. **After T5.3** — full golden path (view → select → create → reload → update status) walked live
   in the Fabric portal embed, not just unit-tested.
5. **After T6.1** — nothing left but talk-track and buffer.

## Risks

- **Fabric credentials are still `[NOT STARTED]` the same day the no-slack SM build is due.** Per
  project `CLAUDE.md`'s status block, workspace access is pending from the teammate as of Sunday.
  If it slips past Sunday into Monday, T0.2 blocks T1.1/T1.2 with zero buffer. Fallback if access
  lands a day late: compress T1.1+T1.2 into Monday evening/Tuesday morning and treat T3.3 (trend
  chart) as the first thing cut, same as the schedule-critical risk below.
- **`docs/wwi-schema-reference.md` is sourced from GitHub's WWI DDL, not the actual Copy Job
  output** — real column values/grain could differ once data is really loaded. Mitigated by
  Checkpoints 1–2 below (SM relationships checked against the doc, then risk measures spot-checked
  on 3 known items) before any query factory file gets written on top of a possibly-wrong measure.
- **Schedule-critical: T1.1/T1.2 (Monday).** Everything downstream blocks on this — no slack day
  reserved for it. If the Copy Job or SM build slips, cut T3.3's trend chart (KPI strip + ranked
  list alone still demo) before cutting anything on the write-back side.
- **Direct Lake SKU-guardrail risk avoided by design** — SPEC already locks Import mode for this
  reason; don't revisit under time pressure.
- **Rayfin `data` service is currently `enabled: false`** — T4.1 is the first time this project
  exercises write-back at all. Do it early enough (parallel with T1/T2, not after) that a Rayfin
  platform surprise (see `known limitations` docs) doesn't land on the last day.
- **Two-laptop parity (T0.1)** — if the personal laptop isn't ready before Monday's SM build starts,
  work forks across two half-configured environments. Do T0.1 before T1.x starts, not during.
