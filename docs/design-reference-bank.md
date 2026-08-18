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

## Installed (2026-08-18)

Installed as repo-local skills (`.claude/skills/`, committed so both team members get them —
no marketplace registration needed, just `git pull`):

```
npx skills add zanwei/design-dna -a claude-code -y
npx skills add Leonxlnx/taste-skill -a claude-code -y
npx skills add AThevon/genjutsu -a claude-code -y
npx skills add vercel-labs/agent-skills -a claude-code -y
```

Each of these repos bundles several sub-skills, not just the one we asked for — pruned down to
what's relevant for a React web app (removed Compose/SwiftUI/mobile/desktop/3D/canvas variants,
Vercel-CLI/deploy/React-Native skills we don't use). **Also removed `ui-ux-pro-max`**, bundled by
`genjutsu` — CLAUDE.md already locked a decision to skip it project-wide ("redundant,
mobile-app-flavored"), so it was deleted rather than silently kept.

Kept (26 skills): `brandkit`, `cast`/`paint` (genjutsu's two main skills), `css-native`,
`design-audit`, `design-dna`, `design-taste-frontend`(+v1), `framer-motion`,
`full-output-enforcement`, `gpt-taste`, `gsap` (genjutsu's own concise GSAP-usage reference —
distinct from the standalone `greensock/gsap-skills` repo we deprioritized above; harmless to
keep as reference, not obligated to use it), `high-end-visual-design`, `imagegen-frontend-web`,
`image-to-code`, `industrial-brutalist-ui` (matches our locked wireframe-brief tone — worth
checking against `docs/wireframe-design-brief.md`), `minimalist-ui`, `motion-principles`,
`redesign-existing-projects`, `stitch-design-taste`, `vercel-composition-patterns`,
`vercel-optimize`, `vercel-react-best-practices`, `vercel-react-view-transitions`,
`web-design-guidelines`, `writing-guidelines` (landing-page copy help).

**Not restart-tested yet** — same caveat as the original `addyosmani/agent-skills` plugin
install this project already hit once: newly dropped skill files may need a Claude Code session
restart before `Skill()` calls can see them. Verify next session before assuming they're live.

## Not yet evaluated in depth

- User referenced "amazing designs" at `zanwei/design-dna`'s linked showcase — the repo itself is
  evaluated above; the specific visual references worth pulling from it are still TBD (need to
  pick 1-2 concrete apps to extract, e.g. a Linear/Vercel/Stripe-style dashboard).
