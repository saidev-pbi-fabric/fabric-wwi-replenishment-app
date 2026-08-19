# Design Strategy Guide

Written 2026-08-19 in response to a discovery session: "I don't know what 'great' means for this
app, where to start, or whether to trust my own taste." This doc is the answer — a concrete
audit of the app as it stands today, plus the order to work in from here. Companion to
`docs/design-reference-bank.md` (the skill/repo inventory) — that doc says *what tools exist*,
this one says *what to do with them, in what order, starting where*.

## 1. Where to start

Don't start by browsing galleries cold — start with the audit in §6 below. It's a concrete,
file:line-scoped answer to "what does great mean for THIS app," not generic advice. Fix the
critical + major findings there first.

Then, for gallery browsing, go genre-specific — this is an ops/data dashboard, not a marketing
site, so generic "best landing pages" galleries (Awwwards, Land-book) are the wrong reference
class for most of it. Start here:

1. **linear.app** and **vercel.com** (dashboard/product sections, not just the marketing home) —
   closest genre match: dense information, restrained color, real product screenshots over
   illustration. See §7 for what was actually observed.
2. **Mobbin** (mobbin.com) — real product UI screenshots, filterable by pattern (tables, filters,
   empty states, drill-throughs) — more useful than a landing-page gallery for this app's actual
   surface area (ranked lists, detail panels, KPI tiles).
3. **PostHog** (posthog.com) and **Basedash** (basedash.com) — both are dashboards over real
   tabular/analytics data, same problem class as this app.

Generic landing-page galleries (Godly, Awwwards) are lower priority — this app has one landing
page and two dashboard screens; most of the surface area is data-dense UI, not hero sections.

## 2. Skill chain, in order

| Skill | When to reach for it |
|---|---|
| `hallmark audit` | Done for this pass — see §6. Re-run after each round of fixes to check nothing regressed. |
| `hallmark study <url>` | Point it at a specific screen (e.g. a Linear settings page or a PostHog dashboard) to extract structural DNA — macrostructure, type pairing, colour anchor — instead of eyeballing it yourself. |
| `design-dna` | Same job as `hallmark study`, different tool — use if you want a portable JSON profile (tokens + style + effects) instead of a diagnosis report. Pick one, don't run both on the same reference. |
| `high-end-visual-design` | Polish pass once structure is fixed — motion/effects specifics beyond what hallmark's `motion.md` covers. |
| `dataviz` | Already governing the severity-triad/chart-color work — keep using it for any new chart or KPI tile. |
| `frontend-ui-engineering` | Implementation — already the locked stack skill for wiring real components. |

## 3. Vega-Lite vs D3.js

**Stay on Vega-Lite + hand-rolled SVG.** Fabric natively embeds Vega-Lite via
`@microsoft/fabric-visuals`' `VegaVisual` — that's already the locked stack and it's a supported,
documented integration path. D3 has no native Fabric wrapper; you'd be hand-building the
React/SVG lifecycle management D3 needs on top of an already-tight hackathon timeline, without
deep frontend background to fall back on when it breaks.

The existing `Sparkline` component (`src/components/shared/sparkline.tsx`) is the right pattern
for anything Vega-Lite can't do cleanly — hand-rolled SVG using `currentColor` so it picks up
Tailwind severity classes directly, no light/dark hex duplication. Reach for that pattern again
for future bespoke bits.

Only reach for D3 if there's real slack time (post-8/21, or a genuine "nothing left to fix" day)
and you want exactly one signature interactive centerpiece visual — not as a wholesale chart
library swap.

## 4. Design system status

**You already have one — don't rebuild it.**

- `src/lib/severity.ts` — the severity-scale tier system (critical/at-risk/on-track), locked and
  used consistently across rail colors, dots, and text classes.
- `src/global.css` — full token set: color (light + dark), spacing (4px grid), type scale, font
  families (IBM Plex Sans Condensed/Sans/Mono), radius scale.
- `docs/wireframe-design-brief.md` — the documented rationale (industrial control-room tone,
  severity-rail signature detail).

If a gallery/study pass turns up something better — a spacing rhythm, a specific hover
treatment, a type-pairing idea — **swap the specific token**, not the system. E.g. if you like
how Linear handles table row density, adjust `--spacing-*` values or one component's padding;
don't start a second parallel token system.

## 5. The `/design` Claude skill

It's the **Claude Design canvas** — a multi-artboard visual mockup tool that publishes as an
Artifact. You draft the visual direction as HTML artboards on one pan/zoom canvas; it's
click-to-select editable, with inline text editing and undo/redo, and a "Save" step that
publishes a refined version.

**This is the native version of a pattern you already used manually.** Per the project's own
history: the sales-trend sparkline was built as an Artifact mockup first, approved, *then* wired
into real DAX/components — an explicit "don't build and revoke" instruction. `/design` is the
built-for-purpose tool for that same move. Use it for the next visual proposal (e.g. fixing the
landing-page 3-column grid flagged in §6, or restyling the card chrome) instead of hand-building
an HTML artifact mockup from scratch.

## 6. Hallmark audit — current app

Audited against `hallmark`'s named anti-pattern catalog (`references/anti-patterns.md`), scoped
to dashboard/data-app tells rather than marketing-site tells (this is an internal ops tool, not
a landing page — missing hero/CTA/footer marketing patterns are correctly absent, not flagged).

**The good news first:** no purple-gradient heroes, no gradient-fill headlines, no aurora-blob
backgrounds, no mismatched icon sets (lucide-react used consistently throughout), no arbitrary
`z-index: 9999`, severity-triad color use is disciplined and consistently applied. This app does
not read as templated *slop* — the findings below are what's keeping it from reading as
*deliberate*, which is a different bar.

---

**[critical] The 3-column feature grid — `src/components/landing/landing-page.tsx:146-167`**
The `STEPS` section is the textbook AI template: three equal `grid-cols-3` cards, icon above a
heading above two lines of body copy, identical card chrome, `whileHover: {y: -3}` lift on all
three. This is the single most-recognized LLM-generated layout pattern, verbatim.
→ Fix: these steps are genuinely ordinal (surface → record → track) — lean into that instead of
hiding it. Try a horizontal connected-step rail with a visible arrow/line between steps, or
asymmetric card widths, or drop the cards and use a numbered typographic list instead.

---

**[major] Undifferentiated card chrome across the entire app**
`rounded-lg border border-border bg-card p-400 shadow-sm` (or a near-identical variant) is
applied to every single container regardless of role: `kpi-strip.tsx:213-217`,
`top-at-risk-list.tsx:110`, `ranked-list-panel.tsx:172`, `item-detail-panel.tsx:127-131`,
`landing-page.tsx:72,102,157,171`, both drill-through modals. The primary chart, the hero
section, a static info footnote, and a modal all carry the *same visual weight*. This is the
real root cause behind "it lacks wow factor" — nothing on screen tells the eye what matters most.
→ Fix: reserve the border+shadow treatment for genuinely elevated surfaces (modals, dropdowns).
Let the primary content per screen (the chart, the ranked list) read as heavier — larger radius,
no border, rely on the severity rail + size instead — so secondary chrome visibly recedes.

---

**[major] False affordance — non-interactive KPI tiles get the same hover lift as clickable ones**
`src/components/overview/kpi-strip.tsx:205-217`. `whileHover={{ y: -2 }}` is applied to every
tile's outer `Tag` unconditionally, but only 2 of the 5 tiles have `tile.drillThrough` set. The
code already reasons about this exact problem for the icon wiggle animation (comment at
lines 229-232: "Animating the other three's icons would suggest they're clickable when they
aren't, which is a false affordance") — but the same logic wasn't applied to the outer lift.
→ Fix: gate `whileHover`/`whileTap` on the `Tag` behind `tile.drillThrough`, matching the icon
logic already in the file.

---

**[major] `transition-all` — `src/App.tsx:89`**
`NavTab`'s className includes `transition-all`, animating every property including ones that
should change instantly.
→ Fix: `transition: background-color var(--dur-short) var(--ease-out), color var(--dur-short) var(--ease-out)` — name the properties.

---

**[major] Missing `:focus-visible` ring on custom interactive elements**
No custom button in the audited files (`App.tsx` NavTab/ThemeToggle, `kpi-strip.tsx` drill
tiles, `ranked-list-panel.tsx` row buttons, `landing-page.tsx` CTA button, both drill-through
close buttons) declares an explicit focus ring class. `global.css` defines `--color-ring` but
nothing in these components consumes it via `focus-visible:`.
→ Fix: add `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (or your
existing ring utility) to every custom clickable element. Must appear instantly, never
transitioned in.

---

**[major] Spinners that flash — `top-at-risk-list.tsx:147-152`, `ranked-list-panel.tsx:192-197`, `item-detail-panel.tsx:151-155`**
`isRefreshing` swaps the `Loader2` spinner in the instant `panel.status === "refreshing"` fires,
with no delay-show or minimum-visible-duration. A fast refetch (cache hit, small query) flashes
the spinner for under 100ms, reading as a glitch rather than feedback.
→ Fix: delay-show 150ms before rendering the spinner, or enforce a 300ms minimum once shown.

---

**[minor] Straight quotes in landing-page copy — `src/components/landing/landing-page.tsx`**
"what's", "doesn't", "isn't" etc. appear to use straight apostrophes (`'`) rather than curly
(`'`) — a small proofreading tell.
→ Fix: swap to curly quotes/apostrophes in copy strings.

---

**Structural fingerprint check:** Landing, Overview, and Action Center all use the identical
macrostructure — header, then a vertical stack of same-weight rounded-bordered-shadow-sm cards,
with the same `fadeInUp`/`staggerContainer` entrance on each. Individually compliant (one
orchestrated entrance per component, per Hallmark's motion rules), but combined across all three
pages it reads as *one page reskinned three times* rather than three distinct places in the
product. This isn't a single fixable line — it's the reason to treat §6's card-chrome finding as
the priority fix over any one-off polish.

**Summary — 1 critical · 5 major · 1 minor**
**Verdict — close, fix the majors.** Nothing here ships as slop; the findings above are what
separate "competent internal tool" from "deliberately designed." Fixing the card-chrome
hierarchy (finding #2) and the landing-page grid (finding #1) will move the needle furthest per
hour spent.

## 7. Gallery study notes

Lightweight pass via WebFetch — markdown-converted page content only, not a rendered screenshot,
so exact font-face declarations and pixel-level spacing weren't recoverable (both sites are
JS-rendered SPAs; WebFetch sees the server-rendered/markdown shell). Take the notes below as
directional, not a full `hallmark study` DNA extraction — for exact fonts/colors, run
`hallmark study https://linear.app/<specific-page>` yourself, or a screenshot through it.

**linear.app**
- Reads as spacious despite being data-dense — whitespace is used deliberately around dense
  content (the issue backlog list), not spread evenly everywhere.
- Screenshot-heavy sections alternate with text blocks rather than stacking uniformly — breaks
  the "everything is the same rhythm" pattern this app currently has.
- Distinctive data techniques worth studying directly: timeline bars spanning quarters, inline
  status badges + assignee avatars on list rows (this app's ranked list rows could carry more
  visual info per row the same way, not just name + rank + sparkline), and side-by-side diff/
  comparison views.

**vercel.com**
- Dark/light mode is a first-class visual strategy, not an afterthought toggle — both theme
  variants get dedicated image assets, not just inverted colors. Worth a comparison pass: does
  this app's dark mode (already implemented, `global.css` `.dark` block) get equal design
  attention, or was it derived mechanically?
- Consistent repeating component pattern (title → paired image variants → feature list → CTA)
  across sections — the app already does something similar per-page; the difference from Linear
  is Vercel's spacing between repeats is generous enough that repetition doesn't read as templated.

Neither fetch could confirm exact typefaces or hex values — if font pairing specifics matter for
a direct comparison, screenshot the two sites and run them through `hallmark study` (image mode)
instead of relying on this WebFetch pass.

## 8. Gallery URLs for ongoing reference

**Ops-dashboard genre (closest match — check these first):**
- https://mobbin.com — real product UI screenshots, filterable by pattern
- https://posthog.com — analytics dashboard over tabular data
- https://basedash.com — dashboard/data-tool product
- https://linear.app
- https://vercel.com

**General UI/web (lower priority for this app's surface area):**
- https://land-book.com
- https://godly.website
- https://awwwards.com
- Stripe dashboard (stripe.com/docs or the Stripe product tour pages)

**D3-specific (only if §3's slack-time condition is met):**
- https://observablehq.com/@d3/gallery
- https://d3-graph-gallery.com
