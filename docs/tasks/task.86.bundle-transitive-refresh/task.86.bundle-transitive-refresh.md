---
id: task.86
title: "[Task 86] bundle_skill.py never refreshes transitively-bundled references"
type: task
description: "A shared resource that lands in skills/*/references/ via a transitive reference is never refreshed again — the bundler discovers references only from a skill's own files, so the copy goes stale forever while the bundler reports 'in sync'. Two skills shipped a pipeline contract describing a step that no longer matched the source."
tags: [bundler, build, tooling, silent-failure]
category: infrastructure
status: draft
priority: High
risk_level: medium
created: 2026-09-03
updated: 2026-09-03
assignee:
estimated_effort_hours: 4
---

# Technical Task: `bundle_skill.py` never refreshes transitively-bundled references

**Status:** Draft

---

## 1. Overview

`bundle_skill.py` builds its `needed` set by scanning a skill's **own** files for
`shared/resources/X` references. Its copy loop is content-based and correct. But a file that reached
`skills/{skill}/references/` because *another bundled file* referenced it is never rediscovered — so
once the source changes, the copy is **stale forever**, and the bundler prints `✅ in sync`.

Found during task 77. `skills/qa-story/` and `skills/qa-task/` were shipping
`develop-pipeline-resume-contract.md`, `develop-pipeline-autonomous-defaults.md`,
`develop-pipeline-step-0-resolve-and-prepare.md` and `pipeline-resume-detector-prompt.md` that still
described a pipeline **without Step 5c**, four cycles after the source changed. Both were reported
in sync on every run.

## 2. Why this is High priority

The failure is silent and the report is actively misleading — `in sync` is printed for a file the
bundler is no longer even looking at. Nothing in the test suite catches it, because every assertion
in the repo reads `shared/resources/`, never the bundled copies. A consumer installing a skill from
its zip gets the stale contract with no signal at all.

## 3. Scope

### In Scope

- Make reference discovery **transitive**: after bundling a file, scan it for further
  `shared/resources/X` / `references/X` references and bundle those too, to a fixed point.
- Add a **bundle-freshness assertion** to CI: every `skills/*/references/<name>` must equal
  `shared/resources/<name>` after path rewriting and header injection. A partial bundle should fail
  CI rather than wait for a reviewer.
- Correct the `in sync` status so it cannot be printed for a file that was not examined.

### Out of Scope

- Changing the rewrite or header format.
- Removing genuinely orphaned references (files no longer referenced by anything) — that is a
  separate cleanup with its own risk.

## 4. Success Criteria

- [ ] Changing a shared resource referenced only transitively refreshes every consumer
- [ ] A deliberately-staled bundled copy fails CI (mutation-proved)
- [ ] `npm run bundle` is still idempotent — a second run is a no-op
- [ ] No skill gains or loses a bundled file as a side effect of this change
- [ ] Full `npm run ci` green

## 5. References

- Origin: `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.3.review-pr-in-pipeline.yml` — TASK77-025
- Discovery: `skills/create-skill/scripts/bundle_skill.py` pass 1 vs pass 2
- Related prior art: the repo memory note on bundle drift reverting fixes applied to `references/`

## Change Log

| Date       | Version | Description                               | Author       |
| ---------- | ------- | ----------------------------------------- | ------------ |
| 2026-09-03 | 1.0     | Filed from task 77 QA cycle 3 (TASK77-025) | develop-task |
