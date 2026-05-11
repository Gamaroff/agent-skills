---
id: index.subagent-pipeline-improvements
title: "Index: subagent improvements for /develop-story and /develop-task pipelines"
type: index
created: 2026-05-08
updated: 2026-05-08
source_plan: .agents/plans/purrfect-whisper.md
---

# Subagent pipeline improvements — task index

Tasks 16–31 implement the read-only Explore subagent strategy across `/develop-story` and `/develop-task`. Order below respects the dependency graph; tasks within the same wave can be done in parallel.

## Wave 0 — Foundation (do first)

These have no dependencies and unlock everything else.

- [ ] **task.26** — `.summaries/` artifact convention + implementation report column ([#44](https://github.com/Gamaroff/agent-skills/issues/44))
- [ ] **task.23** — shared tracker state poller subagent ([#41](https://github.com/Gamaroff/agent-skills/issues/41))

## Wave 1 — Independent subagents (parallel-safe)

No dependencies. Can start once Wave 0 lands (26 unlocks summary-writing patterns; 23 unlocks tracker reads).

- [ ] **task.16** — review-story pre-pass: 3 parallel Explore (epic / architecture / codebase) ([#34](https://github.com/Gamaroff/agent-skills/issues/34))
- [ ] **task.17** — develop-loop iteration audit subagent ([#35](https://github.com/Gamaroff/agent-skills/issues/35))
- [ ] **task.18** — develop-loop test-failure triage subagent ([#36](https://github.com/Gamaroff/agent-skills/issues/36))
- [ ] **task.19** — create-pr diff summariser subagent ([#37](https://github.com/Gamaroff/agent-skills/issues/37))
- [ ] **task.20** — pre-qa-story traceability mapper subagent ([#38](https://github.com/Gamaroff/agent-skills/issues/38))
- [ ] **task.21** — pre-qa-fix findings ingester subagent ([#39](https://github.com/Gamaroff/agent-skills/issues/39))
- [ ] **task.22** — finalise DoD parallel checks (4 parallel Explore) ([#40](https://github.com/Gamaroff/agent-skills/issues/40))

## Wave 2 — Direct dependents (after their parent in Wave 0/1)

- [ ] **task.24** — pipeline resume stale-context detector — *needs task.26* ([#42](https://github.com/Gamaroff/agent-skills/issues/42))
- [ ] **task.25** — pipeline Phase 0 parallel fan-out — *needs task.23* ([#43](https://github.com/Gamaroff/agent-skills/issues/43))
- [ ] **task.27** — review-task pre-pass mirror — *needs task.16* ([#45](https://github.com/Gamaroff/agent-skills/issues/45))
- [ ] **task.28** — develop-task loop iteration audit — *needs task.17* ([#46](https://github.com/Gamaroff/agent-skills/issues/46))
- [ ] **task.29** — develop-task loop test-failure triage — *needs task.18* ([#47](https://github.com/Gamaroff/agent-skills/issues/47))

## Wave 3 — Transitive dependents (after Wave 2)

- [ ] **task.30** — develop-task pipeline resume detector — *needs tasks.24 + 26* ([#48](https://github.com/Gamaroff/agent-skills/issues/48))
- [ ] **task.31** — develop-task Phase 0 parallel fan-out — *needs tasks.23 + 25* ([#49](https://github.com/Gamaroff/agent-skills/issues/49))

---

## Dependency graph (text)

```
26 ─┬─→ 24 ─→ 30
    └─────────↑
23 ─┬─→ 25 ─→ 31
    └─────────↑
16 ──→ 27
17 ──→ 28
18 ──→ 29
19, 20, 21, 22  (no children)
```

## Notes

- Within a wave, tasks are independent — pick by priority (High first: 17, 18, 21, 22, 26).
- Wave 0 tasks block roughly half of everything else; landing them first maximises throughput.
- Tasks 19/20/21/22 modify shared sub-skills (`/create-pr`, `/qa-story`, `/qa-fix`, `/finalise`); their changes apply to both pipelines without separate develop-task mirrors.
- Source plan: `.agents/plans/purrfect-whisper.md`.
