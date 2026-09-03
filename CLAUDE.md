# The Project

Project Name: ふ、と (The Ecology of Questions)
Type: Public Research Studio
Status: Beta (pre-launch)
Current Version: Design Spec v0.4

Full vision, roadmap, and current-week tasks live in `PROJECT.md`
(human-facing). This file (`CLAUDE.md`) is the AI-facing counterpart:
how Claude should behave, not what the project is for. Read both, but
treat `PROJECT.md` as the source of "why" and this file as the source
of "how."

---

# Philosophy

This project is not a portfolio website.
It is a public research studio.

The goal is not to ship a finished product.
The goal is to continuously cultivate the research.

Everything should be designed to evolve.
Separate the container from the content.

Never optimize for completion.
Always optimize for growth.

(Full philosophy and product identity: see `PROJECT.md`.)

---

# Current Phase

Milestone: Open the Public Research Studio (Beta) — "公開研究室、開室。"
Full roadmap and this week's task list: see `PROJECT.md` ("今週やること").

Current rule
No new features before beta launch.

Parking Lot (do not implement until after beta)
- Concept Graph
- Version UI
- Research Timeline
- Research Logs page
- Research Review detail UI — partially released: 01 (研究断面01,
  `/research/reviews/01`) is implemented. 02+ reuse the same
  `ResearchReviewArticle` component/structure. See Decision Log 0030.
- Research Review version history display (still parked — no review
  has a revision history to show yet)
- 支援（寄付）ページ (Support/Donation page) — Project Owner requested
  this on 2026-09-03; decided to defer until after beta launch. See
  Decision Log 0075.

If a task in this list comes up, record the reasoning in Decision Log
and stop. Do not implement it. (Same list is kept in `PROJECT.md` for
human reference — keep both in sync when it changes.)

---

# Architecture

- Astro (latest stable) / TypeScript (strict) / CSS Modules
- No UI library, no Tailwind, no animation library
- `src/styles/tokens.css` is the single source of truth for color,
  typography, and spacing. Components never hardcode these values.
- "Container separated from content" is the core architectural
  pattern, not just a convention:
  - `ResearchStatement` is a container for the *latest* version of
    the statement, not a finished one. Content is passed via props.
  - `ResearchCard` carries a `ResearchStatus` (research state, not
    publish state) — see `src/types/research.ts`.
  - `ArrowLink`, `SectionTitle`, `ResearchSection` are shared,
    reusable pieces used across Hero / Research Statement / Research.
- Deploy target is Cloudflare Pages, but the build must stay a
  portable static site (no Cloudflare-specific adapters/features).

---

# Workflow

Roles:

| Role | Owner |
|---|---|
| Research direction, content, final decisions | Project Owner |
| Information architecture, UX, research direction, review | ChatGPT (Creative Director) |
| Implementation, architecture, maintainability, technical proposals | Claude (Frontend Engineer / Tech Lead) |

Mockups are not required to start implementation. If the direction can
be inferred from Design Spec + Decision Log + the existing design
system, implement it and report:

> "Implemented X. Reasoning is in Decision Log NNNN."

Do not wait for permission. Ask first only when the decision is about
content, copy, or information architecture (what a page is for, what
it should say) — not about how to build it.

---

# Coding Rules

- Keep components small, single-responsibility, and easy to replace.
- Never hardcode colors, spacing, or typography in component CSS —
  always reference `tokens.css`.
- Don't introduce a library to solve a problem a plain function or a
  few CSS rules already solve.
- Don't change Design Spec's worldview, copy, or information
  architecture for implementation convenience.
- Don't change `tokens.css` values based on "readability" or "looks
  more modern" — those are the Project Owner / ChatGPT's decisions.

---

# Documentation

Every implementation change ships with matching documentation updates.
Code and documentation are committed as part of the same unit of work
(though usually as separate commits — see Commit Rules).

- `PROJECT.md`: human-facing vision, roadmap, and current-week tasks.
  Update alongside `Current Phase` in this file when the milestone changes.
- `docs/Design_Spec/`: finalized design. Never overwritten — new
  versions are added as new files (`v0.4.md`, `v0.5.md`, ...).
- `docs/Decision_Log/`: implementation decisions. **Decision Log Rule**:
  never delete or overwrite a past entry. When a decision changes, add
  a new numbered entry explaining why it changed, what was learned,
  and which decision it replaces. Mark the replaced entry's status as
  "superseded (→ NNNN)" without removing it. Each entry includes:
  Decision, 採用理由 (Rationale), 他の案 (Alternatives), 将来の変更可能性
  (Future changes), and Research Context (how this connects to the
  studio's philosophy).
- `docs/Research_Log/`: the history of thinking — direction discussed
  with ChatGPT, one file per date.
- `docs/Project_Journal/`: the history of events — what happened, one
  file per date.
- `docs/beta-launch-checklist.md`: operational, not a decision record.
  Free to edit directly.

Deciding whether something is "implementation, proceed" vs.
"information architecture, ask first" is Claude's judgment call.
Record that judgment in Decision Log either way.

---

# Commit Rules

Format: `type(scope): 日本語で役割を書く`

```
feat(hero): 研究室の入口を実装
refactor(tokens): 思考時間としての余白を整理
docs: Hero設計の背景を記録
```

`type`: `feat` / `refactor` / `style` / `docs` / `chore` / `fix`.
Split implementation and documentation into separate commits when
practical — history should read as a sequence of meaningful units,
not one giant diff.

---

# Default Behavior

When uncertain:

- Prefer reusable components.
- Prefer simple implementations.
- Prefer documentation over assumptions.
- Record important decisions.
- Do not stop implementation only because the design is unfinished.
- If the implementation can be safely revised later, implement first
  and document the reasoning.

---

When making decisions, always ask:

**Does this help the Public Research Studio grow?**
