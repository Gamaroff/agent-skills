# QA Report: Task 327 - SubagentHandback replies are extracted, not hand-copied (cycle 2)

**Task**: [task.327.subagenthandback-replies-are-extracted.md](./task.327.subagenthandback-replies-are-extracted.md)
**Gate File**: [task.327.gate.2.subagenthandback-replies-are-extracted.yml](./task.327.gate.2.subagenthandback-replies-are-extracted.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Gate Status**: FAIL

---

## Executive Summary

The four findings from cycle 1 are fixed and held by tests. The refute pass then found a defect in the original change: a hand-back from an earlier turn survives a new prompt and is extracted as the current reply. That breaks the final-turn rule and lets a stale block through with a valid sha256. Gate FAIL on one high.

**Deployment Recommendation**: BLOCKED (T327-QA-4)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T327-QA-1 symlink/hard-link `--out` deletes the transcript | ✅ FIXED | test "task 327 QA-1 …" (6 routes + control); mutations g, h red |
| T327-QA-2 criterion 7 without approver | ✅ FIXED | criteria-drift: `#7 added, approved: true (review-task)` |
| T327-CI-1 mailto false link in the implementation report | ✅ FIXED | host named in words; CI on 17b74641b pending at read time |
| T327-QA-3 directory `--out` crashes | ✅ FIXED | test "task 327 QA-3 …"; mutation i red |

## Review Methodology

Direct tools. Diff review: code review, one read-only Explore subagent over the whole branch diff with the cycle-2 refute directive. It was dispatched at 20:55:53Z and returned after 76484 ms by its completion notice.

Re-review scope: whole branch diff (cycle 2 refute pass)

CI on 17b74641b5cb: pending

Step 4b: no fenced block changed (unchanged since cycle 1).

## New Findings This Cycle

- **[high]** `shared/resources/agent-reply-block.js:144` — a user line clears the text tail, never the hand-back → clear it on a new prompt (T327-QA-4)
- **[low]** `shared/resources/agent-reply-block.js:226` — any lstat error reads as "nothing there" → only ENOENT (T327-QA-5)

---

## Issues Found

### HIGH Severity Issues (1)

**T327-QA-4: a hand-back from an earlier turn is read after a new prompt**
- **Observation**: reproduced by QA. Transcript rows: user prompt; assistant `SubagentHandback` with a `finalise-ac-yaml` block; its `tool_result`; a new user prompt (`"now redo it"`); assistant `Read` tool_use; its `tool_result`. `extract` answered `{"reason":"extracted","reply":"handback"}` with the old block.
- **Control**: the first three rows alone answer `extracted` / `handback`, which is correct.
- **Base**: `origin/develop`'s reader answers `transcript-unreadable` on the same transcript, so the defect is new to the branch (not pre-existing).
- **Impact**: criterion 4 (a block only in an earlier turn is not read) does not hold for hand-backs. `/finalise` would merge an earlier turn's AC YAML as verified.
- **Origin**: code-review CR-1 (high/high), reproduced by QA.

### LOW Severity Issues (1)

**T327-QA-5**: `clearOut` returns null for every lstat error. With `--out` under a regular file (ENOTDIR), reproduced: the later `mkdirSync` throws an uncaught `EEXIST`. Origin: code-review CR-2 (low/medium), reproduced by QA.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — FAIL
A stale hand-back is extracted after a resume (T327-QA-4).
### Security — PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The cycle-1 data-loss path is closed. Boundary decision unchanged from cycle 1.
### Maintainability — PASS
Advisory CR-3: the header overstates "every answer but `extracted` leaves no file".

---

## Code Review

**Correctness bugs (2):**
- [high/high] `shared/resources/agent-reply-block.js:144` — hand-back not cleared on a new prompt → T327-QA-4 (reproduced)
- [low/medium] `shared/resources/agent-reply-block.js:226` — lstat error read as absent → T327-QA-5 (reproduced, enters by 5d)

**Cleanups (1):**
- `shared/resources/agent-reply-block.js:40` — header claim excludes no usage answer; a symlink `--out` is unlinked, not followed → reword

Anchors: both bugs at lines checked against HEAD.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 70/100
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3.
