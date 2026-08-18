# Design Reference Bank

Links collected 2026-08-18 for the "PBI-report look → real web-app UI" push (Overview/Action
Center polish, post-T6.1). Saved here so they don't get lost — pull from this list rather than
re-Googling next time we touch visual design.

## Use in this order

1. **`VoltAgent/awesome-design-md`** — https://github.com/VoltAgent/awesome-design-md
   Pre-extracted `DESIGN.md` files (tokens + rules) for ~73 real sites (Linear, Vercel, Stripe,
   etc.). Check first — if one matches the aesthetic we want, it's a drop-in reference with zero
   extraction work.

2. **`zanwei/design-dna`** — https://github.com/zanwei/design-dna
   If nothing in (1) matches: feed it a screenshot/URL of a specific app we like, it extracts a
   structured "Design DNA" JSON (tokens, qualitative style, visual effects) we can apply here.
   This is the direct answer to "I don't have a reference, help me find one."

3. **`Leonxlnx/taste-skill`** — https://github.com/Leonxlnx/taste-skill
   "Anti-slop" skill — stops AI-generated UI from defaulting to generic/boring. Use as a guardrail
   during the actual redesign implementation pass.

4. **`AThevon/genjutsu`** — https://github.com/AThevon/genjutsu
   Motion/interaction design skill (React, Framer Motion, Three.js, CSS, plus Compose/SwiftUI —
   we only need the web side). More sophisticated than the manual framer-motion pass already
   shipped — proposes an "interaction thesis" before implementing, audits reduced-motion/exit
   animations/performance on exit. Use for the next motion iteration.

5. **`vercel-labs/agent-skills` → `web-design-guidelines`** —
   https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md
   Fetches Vercel's Web Interface Guidelines live and reviews given files against them
   (accessibility, UX conventions), output as `file:line` findings. Run as a QA/audit pass once
   the redesign is implemented, not as a builder.

## Deprioritized (explicitly, not silently dropped)

- **`greensock/gsap-skills`** — https://github.com/greensock/gsap-skills
  Legitimate, well-maintained, GSAP is genuinely powerful for scroll-driven/timeline-heavy
  animation. **Not adopting now**: framer-motion (already installed, already wired into
  App.tsx/KpiStrip/RankedListPanel/LandingPage) covers everything the app currently needs —
  page transitions, stagger reveals, hover/tap feedback. Running two animation libraries in one
  small app is bundle-size and mental-overhead cost with no current benefit. Revisit only if we
  want something framer-motion doesn't do well (complex SVG morphing, true scroll-driven
  storytelling) — unlikely for a 3-page dashboard on a hackathon timeline.

## Not yet evaluated in depth

- User referenced "amazing designs" at `zanwei/design-dna`'s linked showcase — the repo itself is
  evaluated above; the specific visual references worth pulling from it are still TBD (need to
  pick 1-2 concrete apps to extract, e.g. a Linear/Vercel/Stripe-style dashboard).
