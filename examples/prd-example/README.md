# Worked PRD Example: agent-skills Onboarding & Tutorials

**Source:** [`docs/prd/onboarding/prd.onboarding.md`](../../docs/prd/onboarding/prd.onboarding.md)
**Skill version:** `create-prd` 0.1.0 — see `skills/create-prd/package.json`
**Captured:** 2026-05-12 by Story 2.1 (`develop-story` pipeline)
**Source SHA:** `ea106b1521706dc2c710e93996c0554c80a4c528`

---

This directory contains a faithful copy of the onboarding PRD that bootstrapped this whole dogfood run. The copy is identical to the source except for three provenance frontmatter fields (`captured_skill_version`, `captured_date`, `source_sha`). If they diverge beyond that, the source PRD has evolved since capture — check `source_sha` to see how far.

This document narrates the PRD: what was easy, what required iteration, and what `pm-checklist` flagged.

---

## What was easy

**The problem statement wrote itself.** The repo's own `examples/README.md` contained the sentence "No story, epic, or PRD examples live here." That sentence *is* the problem statement. When your gap documentation is that explicit, the PRD author's job is mostly transcription. The Background section (§1.4) quotes it directly.

**The four-epic structure fell out of the rubric.** `/create-prd` runs a 6-signal complexity rubric (§5.1). Scoring the onboarding work took under two minutes: domain breadth ✅, parallelism ✅, story volume ✅, timeline variance ✅, dependency isolation ➖, risk isolation ❌ → 4/6 → "multiple epics warranted." The four epics emerged from that score, not from top-down decomposition.

**Compatibility constraints were trivial.** Pure documentation — no DB schema, no API surface, no skill code changes. CR1–CR4 (§2.3) were one-liners.

---

## What required iteration

**The "meta-dogfood" framing took a revision pass.** The first draft positioned Epic 2 (worked examples) as a nice-to-have. After the pm-checklist review, it was repositioned as the *structural spine* of the whole PRD: the other epics produce artifacts, and Epic 2 captures them as examples. The current §1.4 language — "the deliverables of the work prove the pipeline that produced them" — came from that reframing.

**NFR6 (real artifacts only) required an explicit constraint.** An early draft of the worked-example ACs left room for "hand-crafted demos" as a fallback. The pm-checklist flagged this as a credibility risk: a skill library claiming its pipeline works needs examples the pipeline actually produced. NFR6 was added to close that loophole: each captured artifact must be committed exactly as the pipeline emitted it, no editorial polish.

**Epic sequencing required spelling out the dependency graph.** The first draft listed the four epics as parallel. They are not — Epic 2 runs last (consumes pipeline artifacts from Epics 1, 3, 4), and Epic 4 Day-3 specifically needs an Epic-2 messy-path artifact. The Mermaid dependency graph in §5.2 was added after the pm-checklist flagged "Epic 4 depends on Epic 2 but the sequencing text says 'fully parallel'."

**The frontmatter field-set for captured artifacts went through two revisions.** The original AC3 specified only `captured_skill_version`. The review (see `story.2.1.review.1.capture-prd-as-worked-example.md`) found three separate inconsistencies: AC3, Task 3, Manual Testing §AC3, and the Edge cases section each described a different field set. The canonical answer after user clarification: four fields — `captured_skill_version`, `captured_date`, `source_sha`, `created`. Task 0 was also added to establish where `captured_skill_version` comes from (a `package.json` on each skill that previously did not exist for `create-prd`).

---

## What `pm-checklist` flagged

**Traceability gaps.** The first-pass FR list was written goal-first without explicit FR↔Goal mappings. The pm-checklist §3 (Traceability) flagged this as a gap. §7.1 now includes the explicit mapping table (FR1↔goal-1, FR2↔goal-2, etc.).

**NFR measurability.** NFR3 in the first draft said "walkthroughs must work on macOS and Linux" without specifying shells or verification method. The checklist flagged "how do you know it works?" The current NFR3 specifies platforms (macOS/zsh, Linux/bash), verification method (walk it on a clean clone), and trigger (before merging the closing story of each epic).

**MVP-first concern.** The checklist asked: "Is Epic 1 alone shippable?" The first draft implied no — it was framed as a set. After review, Epic 1 was explicitly called out as the shippable wedge (§5.2 rationale, §8.3 implementation order). Epic 2's dependency on the full pipeline run means it lands last — that sequencing is now explicit rather than implied.

---

## How to read this PRD

Start at §1.4 (Goals) — it names the two gaps being solved (onboarding + credibility) in one paragraph. Then §5.2 (Epic structure) to understand the sequencing rationale. The rest of the sections fill in detail.

The canonical source PRD at `docs/prd/onboarding/prd.onboarding.md` is the live document — it may have been updated after this copy was captured. Check `source_sha` (`ea106b1521706dc2c710e93996c0554c80a4c528`) against `git log -- docs/prd/onboarding/prd.onboarding.md` to see if there are newer commits.

---

## Related examples

- Task pipeline (existing): [`docs/tasks/task.6.create-epic-jira-tracker-path/`](../../docs/tasks/task.6.create-epic-jira-tracker-path/)
- Epic examples (Story 2.2): `examples/epic-examples/` *(pending)*
- Messy-path story (Story 2.3): `examples/story-messy-path/` *(pending)*
