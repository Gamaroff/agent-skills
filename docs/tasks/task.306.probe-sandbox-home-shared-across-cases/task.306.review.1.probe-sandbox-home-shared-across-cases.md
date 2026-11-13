# Task Review Report: Task 306 - Probe sandbox HOME shared across cases

**Reviewed:** 2026-11-13
**reviewed_blob:** 41050609fc694a1b6f119cbe8c69d404f6437a32
**Review Depth:** Standard
**Task Status:** Planned (promoted to Ready for Development by this review)
**Overall Assessment:** GOOD

---

## Executive Summary

The task's diagnosis is right and checked against the engine: one `HOME` and `TMPDIR` per run, one fixture directory per (case, shell). The plan had no Critical defects. Its main gap was the rule "keep reporting a hostile write under the case's own HOME": moving `HOME` into the case directory takes it out of both escape watches, so the rule needed a mechanism, and none was named. Eight findings were fixed in the document.

**Critical Issues:** 0
**Important Issues:** 6
**Optional Improvements:** 2

**User Clarifications:** 0 (pipeline run; no questions asked)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

Pre-pass Agents B and C were not dispatched; the checks were done inline (independent review did not run). Axes source: not measured (inline).

---

## Findings

| # | Severity | Finding | Fix applied |
| - | -------- | ------- | ----------- |
| 1 | Important | The hostile-write report had no mechanism. The sandbox snapshot skips the work dir and `workDirStamps(workDir, caseName)` skips the case dir, so a `HOME` inside the case dir is invisible to both. | § 3 Target Architecture and Phase 2 now name a before/after snapshot of the per-run `HOME`/`TMPDIR` for hostile runs, in `caseWatchedSpawn`, pushed onto `escapes`. |
| 2 | Important | `--fixture-setup` runs under the run-wide `sandboxHome`. The task did not say it stays there. | Stated in § 3 and Phase 2; the `:8886` test holds it. |
| 3 | Important | A hidden `.probe-home` in the case's cwd is visible to `ls -A` and `find .`. Placement was unstated. | Placement stated; Phase 1 checks for a case that lists its cwd. |
| 4 | Important | The wall-time criterion stated no numeric bound, so finalise would send it down the behaviour path with no test. | Bound set: at most 1.10 times the prior median, command and `uptime` named. |
| 5 | Important | The reproduction fixture was a new tracked `.sh`, which joins the `lint:shell` population (`git ls-files '*.sh'`). | Inline script string in the test, like `setup-home.sh` at `security-probe.test.mjs:8856`. |
| 6 | Important | New tests' temp directories named no removal; `scripts/test-tmpdir.mjs` is a ratchet. | Removal and a listed prefix required. |
| 7 | Optional | Line anchors were taken from a generated copy and read one line late (`:2123` for `sandboxHome`; the source has it at `:2122`). The `:8878` anchor points at nothing; the setup test is `:8856`/`:8886`. | Anchors corrected in the task and plan. |
| 8 | Optional | The prompt has no passage on state-changing controls (`git grep -n "state-changing\|hostile-only" -- shared/resources/finalise-dod-security-prompt.md` finds nothing); the advice lives in `docs/contributing/traps.md`. | Prompt edit made conditional; Files Summary row marked conditional. |

Checks run and clean: config keys (none added), invariant claims (none run; none needed), call-site population (not applicable), removed literals (the traps entry's text is referenced by no test; `tests/load-sensitive-marker.test.js` reads only § Load-sensitive tests), banned names (no literals prescribed), checks 12, 16 to 20, 23 to 24, 27, 29 (the new directories' readers are named in finding 1 and 3), 30 and 31 (the plan names no moving command).

## Readiness

**Score:** 8/10
- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Recommendation:** READY TO IMPLEMENT. All Important findings are fixed in the document; the one open item is the Phase 1 measurement of the `cli:`, `fence:`, `shell:` and `shell-fn:` arms, which the task already schedules.

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline, Step 2)
- **Task File:** docs/tasks/task.306.probe-sandbox-home-shared-across-cases/task.306.probe-sandbox-home-shared-across-cases.md
- **Architecture Docs Consulted:** none (the task changes a shared script only)
