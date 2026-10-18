# Frontend Skill Workflow

Use this guide for the shadcn/ui migration and subsequent frontend work in AgriVision.

## 1. Design authority

**[DESIGN.md](../../DESIGN.md) is the source of truth for LeafAI's visual tokens, layout, motion and component rules.** Read it with `AGENTS.md` before UI work. Explicit user instructions take precedence; skill defaults apply only within the requested scope. Where this workflow's later examples differ from DESIGN.md, follow DESIGN.md.

LeafAI should feel like a calm, credible field guide. Preserve its branding, Vietnamese copy, classification flow, API contracts, validation, data semantics and existing navigation labels. The Starbucks analysis informed the warm canvas and green hierarchy; it is not a source for product features or raw design values.

Apply the current design authority consistently:

- Use Manrope via `next/font` and Lucide icons. Use the forest-green, warm-canvas palette through semantic CSS variables defined in `frontend/src/index.css`; raw visual values belong only in that token layer and DESIGN.md.
- Use shadcn/ui with Radix for shared primitives. Keep inputs, cards, dialogs and media at their documented shapes; reserve full-pill treatment for primary/secondary CTAs and compact filters. Prefer whitespace and hairlines to nested cards or decorative shadows.
- Use the 1280px maximum container with the mobile, tablet and desktop gutters specified in DESIGN.md. Verify at 375px, 768px and 1280px; below 768px, product content becomes one column. The banner's photographic layout changes at 1024px as defined in section 6.1.
- Keep the design dials at 5/3/5. Motion follows DESIGN.md section 6, including reduced-motion support. Only the introduction/home botanical banners have the approved leaf drift and automatic thirteen-scene cycle from section 6.1; preserve their caption and accessibility trade-off.
- Foreground real plant photography and the user's leaf image, classification result and next action. Do not present mock inference, severity, detection boxes or heatmaps as validated output. Retain the current routing and state architecture unless separately requested.

If a specified treatment creates a contrast or usability problem, identify the affected element and make the smallest accessible correction within DESIGN.md. Impeccable may review; implement any resulting UI changes with Taste and React Best Practices under this design authority.

## 2. Choose skills by responsibility

| Skill | Responsibility | Use on |
|---|---|---|
| [Taste](../skills/design-taste-frontend/SKILL.md) | Interpret the brief, shape hierarchy and composition within DESIGN.md | Intro, Home and marketing sections of About |
| [React Best Practices](../skills/react-best-practices/SKILL.md) | React/Next.js implementation, lifecycle, data fetching and bundle performance | Components being written or reviewed |
| [GSAP React](../skills/gsap-react/SKILL.md) | Implement motion that needs sequencing or programmatic control | Approved hero sequences, splash or other coordinated animations |
| [Impeccable](../skills/impeccable/SKILL.md) | Review UX, accessibility, responsive behavior, error states and polish | All affected surfaces; prioritize task completion in app UI |

Taste is intended for landing pages, portfolios and redesigns, not multi-step product UI or data tables. Use Impeccable's **Operate** mode for Diagnose, History, Profile, authentication and catalog controls; use **Read** for explanatory content. Taste does not set the interaction model for these surfaces.

Load only the relevant skill entrypoints and references. Do not activate all four groups for a small change.

For GSAP, start with [Core](../skills/gsap-core/SKILL.md), React and [Performance](../skills/gsap-performance/SKILL.md); add [Timeline](../skills/gsap-timeline/SKILL.md) for sequencing or [ScrollTrigger](../skills/gsap-scrolltrigger/SKILL.md) for approved scroll-driven motion. [Utils](../skills/gsap-utils/SKILL.md) provides calculation helpers if needed. Non-React framework skills and unused plugins have been pruned.

## 3. Work sequence

1. **Inspect:** check Git status, relevant source and callers, project rules and DESIGN.md. Identify the surface, required behavior and existing primitives.
2. **Design:** use Taste for marketing composition or Impeccable for task-oriented UX. Match DESIGN.md; do not inherit Taste's default variance, motion intensity or library choices.
3. **Implement:** reuse themed shadcn primitives and retain domain props. Apply relevant React rules, prioritizing request waterfalls and unnecessary bundle weight. Add dependencies or memoization only for a demonstrated need.
4. **Animate when needed:** prefer CSS for hover, focus, press and simple transitions. Use GSAP for coordinated motion; verify dependencies before importing. In React, scope targets with refs, prefer `useGSAP` when available, and revert contexts/remove listeners on cleanup. Run animation in client lifecycle, never during SSR.
5. **Verify:** review affected desktop/mobile screens and functional states with Impeccable. Run its detector once after web UI changes are complete. Batch fixes and confirm them; avoid open-ended polishing. Detector results supplement browser checks and behavior tests.
6. **Deliver:** report changes, checks actually run and remaining limits. UI mocks do not establish real inference. Use the actual task key for evidence and completion logs.

Skill installation does not install runtime packages. Keep pnpm and existing dependencies; add `gsap`/`@gsap/react` only when required. Do not add Motion/Framer Motion, another icon family, a state library or SWR merely because a skill recommends it.

Give each animated property one owner. If CSS controls a button's press transform, animate a wrapper with GSAP. Support reduced motion, keep content usable when animation fails and avoid decorative effects that delay actions.

## 4. Impeccable setup and boundaries

Read its SKILL.md and the relevant command playbook. Before a UI edit, read `reference/craft-floor.md`. From the repository root in PowerShell, configure the ignored engine cache and load context once per session for the actual target:

~~~powershell
$env:IMPECCABLE_HOME = Join-Path (Get-Location) '.cache/impeccable'
& ./.agents/skills/impeccable/scripts/impeccable.cmd context --target frontend/src/App.tsx
~~~

When troubleshooting installation, `engine-probe` checks the launcher. After completing UI changes, scan only the affected targets, for example:

~~~powershell
& ./.agents/skills/impeccable/scripts/impeccable.cmd detect --json frontend/src/views/DiagnosePage.tsx
~~~

Requests such as `$impeccable audit <target>` or `$impeccable polish <target>` tell the agent to follow a playbook; they are not assumed shell subcommands.

- Do not run `document`, replace DESIGN.md, enable hooks or repair context drift as a side effect of UI work. Follow the explicitly agreed design authority.
- Missing PRODUCT.md or surface briefs do not authorize invented product facts. For scoped changes, inspect existing source and requirements; for broader work, resolve material gaps before designing.
- If context fails, disclose the failure and read DESIGN.md and PRODUCT.md if present, following the skill's fallback. Launcher failure alone does not block source review.
- Installation verification on 2026-10-08 returned `impeccable-engine 0.1.11` and context exit 0 with `designPath: DESIGN.md`. Context also reported `NO_PRODUCT_MD`, no surface brief and `hasVisualImplementation: false` despite existing UI source. Treat those as tool findings to verify against source, not permission to redesign. No automatic hook was enabled.

## 5. Acceptance checklist

- [ ] Colors, typography, spacing, geometry and motion follow DESIGN.md; adaptations are documented.
- [ ] Shared shadcn primitives replace equivalent custom controls while retaining business behavior.
- [ ] Forms, navigation and dialogs support keyboard use, visible focus, associated errors and usable touch targets.
- [ ] Motion has scope, cleanup, reduced-motion handling and no competing property owners.
- [ ] Browser review covers 320, 390, 480, 768, 1024 and 1440px; long dialogs and printed reports are not clipped.
- [ ] Relevant [frontend checks](../commands/frontend.md) run; results and blockers are recorded without changing coverage gates.
- [ ] Demo labels, confidence semantics and factual product copy remain accurate.

Example requests:

- **Landing:** “Refine IntroPage using DESIGN.md. Use Taste for hierarchy, React Best Practices for implementation and Impeccable for review. Keep LeafAI copy and authentication actions.”
- **Form:** “Migrate LoginModal to themed shadcn Dialog. Use Impeccable Operate and React Best Practices. Preserve CAPTCHA, terms, validation and submit guards; verify focus and keyboard behavior.”
- **Motion:** “Add the approved hero sequence using GSAP React/Core/Timeline/Performance. Preserve DESIGN.md, scope and clean up animations, and support reduced motion.”

## 6. Installed sources

Repository-local copies installed on 2026-10-08, including their bundled references/scripts. Pin updates to a reviewed commit; do not silently follow `main`.

| Group | Repository / upstream path | Pinned commit |
|---|---|---|
| Taste | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), `skills/taste-skill` (local: `.agents/skills/design-taste-frontend`) | `b482f7a970abb98c4108d4a9f761e458c64cefc8` |
| GSAP | [greensock/gsap-skills](https://github.com/greensock/gsap-skills), core animation folders (`gsap-core`, `gsap-react`, `gsap-performance`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-utils`) | `aed9cfd3277740755f6bfc1155c7aa645403b760` |
| React Best Practices | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills), `skills/react-best-practices` (local: `.agents/skills/react-best-practices`) | `063bee94c3f4df8453406c830b0a7df0f2860278` |
| Impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable), `.agents/skills/impeccable` | `778c8a7b71ccd5bfe3ca6ac68c15d9d872d0f87d` |

Taste is v2 experimental; React Best Practices declares 1.0.0 and Impeccable 4.5.0. Duplicate skill directories have been pruned, retaining `design-taste-frontend` and `react-best-practices` as canonical local locations.

The only local content patch to these skills corrects three links in React Best Practices' AGENTS.md to `./rules/async-defer-await.md`, `./rules/async-cheap-condition-before-await.md` and `./rules/server-hoist-static-io.md`. Recheck those links when updating; rule content is unchanged.
