# QA Report: Task 238 - QA loop acts on the signals it already has

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.9.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.9.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 9 is the third granted cycle. It re-reviews the cycle 8 fix (`92e33b0f`, value allow-list for
the §5c open-coverage check) at head `51dc912e`. The fix holds: bug.17 is closed, and each of its
four guards is mutation-proven against a committed fixture. Two further MEDIUM gaps remain in the
same awk: a failing `awk` prints an empty value that exits the loop (CR9-1, bug.18), and a block key
after a flow entry is read as that entry's (CR9-2, bug.19).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue (gate 8) | Severity | Status | Evidence |
|---|---|---|---|
| TASK-238-CR8-1 (bug.17): the open-coverage check allow-lists lines, not values | medium | ✅ FIXED | 8 new `RAW_CASES` fixtures; 4 QA mutations each red (below); the 5 gate 8 probe cases are now refused or print `unreadable` |
| CR7-3, CR7-4, CR7-6, CR6-3, CR6-5, CR6-7 (advisory) | — | carried | unchanged files; still in `recommendations.future` |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#770, OPEN, head `51dc912e`)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (`npm run ci:fast`)
- [ ] Performance Testing
- [x] Regression Testing (corpus diff over 184 tracked PR review reports)
- [x] Security Review (probe engine, fence form)
- [x] Code Review (Step 3b, one Explore subagent)

### Review Methodology

Direct tools, plus one diff-review subagent. This is a re-review of a single-file fix. The
traceability mapper was skipped: §9 Success Criteria is a checklist, not a table.

Re-review scope: files changed since gate 8 (head a2a41ca15e69; 21 files) — default

`SAFETY_REPROBE=false`. Clause 1 reads false from gate 8. Clauses 2–3 do not hold: gate 8 security
is CONCERNS/measured, with no HIGH and no FAIL.

CI on 51dc912e74a8: green

Diff reviewer: dispatched 08:11:04Z, returned with `duration_ms` 273052 (4.6 min). It wrote into this
session's scratchpad: it prepended `REVIEW="$1"` to QA's extracted-block script. QA caught this
through a calibration case that read `unreadable` for a known-good report, re-extracted the block to
its own path, and re-ran every probe. Only the re-run results are used here.

Step 4b ran `qa-execute-snippets.mjs` over `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
(`--diff-base` the merge base, `--copy-as skills:.agents/skills`). The changed blocks: 4 in total,
0 runnable, 4 refused as `mutating` (`unrecognised-command: awk`), so `changed-blocks-not-executed`.
That is the same as cycle 8. The open-coverage block is executed instead by
`pr-review-loop-parity.test.mjs`, which extracts it from the doc and runs it against 76 fixtures,
and by the probe engine's fence form (20 cases). The engine reported `zsh-unavailable`: this host
has no zsh.

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1589`: when `awk` fails, the
  block prints `OPEN_COVERAGE=` at exit 0. The value is neither a count nor `unreadable`, so the
  routing takes the Otherwise exit to Step 7 (CR9-1, bug.18). → Map any non-count value to
  `unreadable`, and add a failing-awk fixture.
- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1582`: a block key line after a
  one-line flow entry is read as that entry's key. For an invalid-YAML exemption this prints `0`
  (CR9-2, bug.19). → Refuse any deeper line after a flow entry.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551`: a findings list cut short by a
  column-0 `## ` line inside the fence reads only its surviving entries and prints `0` (CR9-3,
  reproduced by `oc9-truncated-by-hash-heading`). Advisory.
- **[low]** `docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md`:
  the Overview (line 34, "Three fast-gate outcomes") and the ticked Phase 1 checkbox (line 156) still
  describe the `pre-existing red` outcome that QA cycle 6 deleted. SC-2 itself is amended. This is
  documentation only, and the hand-run `task.238.pr-review.2` raised it as PC-1 and PC-2 (`category:
  coverage`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: gated log cleanup and fast-gate outcomes | CONCERNS | Verified | Behaviour verified at gates 6–8 and unchanged here. The ticked checkbox text still names the deleted `pre-existing red` (LOW, above) |
| Phase 2: CI read at gate writing | PASS | Verified | `qa-ci-read.sh` is unchanged since gate 8; this cycle's read printed `CI_STATE=SUCCESS` |
| Phase 3: coverage findings back to 5b | CONCERNS | Verified | The cycle 8 value allow-list holds. CR9-1 and CR9-2 remain in the same check |
| Phase 4: guards and bundled copies | PASS | Verified | `bundle:check` clean: 128 skills, 0 problems |

**Overall Phase Completion**: 4/4 phases implemented; 2 with open issues.

---

## Success Criteria Verification

Only the criteria the cycle 8 fix touches were re-verified. Earlier gates hold the rest, and nothing
else changed since gate 8.

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Coverage findings route to 5b, an unreadable review is never read as clean | `unreadable` for any shape not read | Two shapes still read as clean | CONCERNS | CR9-1, CR9-2; fixture `pr-review-loop-parity.test.mjs` RAW_CASES |
| No regressions | 0 | 0 | PASS | `npm run ci:fast`: 6529 tests, 6515 pass, 0 fail, 14 skipped |
| Corpus unchanged by the fix | 0 changed | 0 of 184 changed | PASS | old (gate 8 head) vs new block over every tracked `*pr-review.*.md`: 125 × `0`, 35 × `1`, 5 × `2`, 19 × `unreadable` (the 19 have no Machine-Readable Findings section) |
| Bundled copies fresh | 0 problems | 0 | PASS | `npm run bundle:check` |
| Standards-named validation | exit 0 | exit 0 | PASS | `npm run validate -- skills/develop-task/`, `npm run validate -- skills/develop-story/` |

---

## Breaking Changes Validation

None in this cycle's change set. A category token outside review-pr's six (`coverage-gap`, say) now
prints `unreadable` where it printed `0`. This is deliberate: it is documented in the block comment
and the CHANGELOG, and the parity fixture holds it.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: Open-coverage check prints an empty value when awk fails**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.238.bug.18.open-coverage-reads-empty-when-awk-fails.md](./task.238.bug.18.open-coverage-reads-empty-when-awk-fails.md)
- **Observation**: With an `awk` stub that exits 2 on `PATH`, the block prints `OPEN_COVERAGE=` and exits 0.
- **Impact**: An open coverage finding exits to Step 7 on any host where the awk program does not run.
- **Recommendation**: Normalise a non-count value to `unreadable`. Add a fixture.
- **Priority**: P2

**Issue: Open-coverage check reads block keys after a flow entry as that entry's**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.238.bug.19.open-coverage-reads-keys-after-a-flow-entry.md](./task.238.bug.19.open-coverage-reads-keys-after-a-flow-entry.md)
- **Observation**: A flow entry followed by an indented `provenance: pre-existing` prints `0`. PyYAML rejects that block.
- **Impact**: A malformed review is read as exempt instead of failed. Measured exposure: none of 184 reports.
- **Recommendation**: Refuse a deeper line after a flow entry. Add a fixture.
- **Priority**: P2

### LOW Severity Issues (2)

- CR9-3: a findings list truncated by a column-0 `## ` line reads `0` (advisory, `recommendations.future`).
- The task document's Overview and Phase 1 checkbox still describe the deleted `pre-existing red` outcome.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
Unchanged. The value allow-list adds one regex match per `category:` key.

### Reliability — CONCERNS
CR9-1: at the routing arm, an awk failure looks the same as a clean zero. CR7-4 is still carried.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 20 (escaped 0), record `task.238.qa.9.security.run.json`
- Boundary: `boundary: true`. The §5c open-coverage block is a fenced block that refuses on repository
  state, probed with `--entry 'fence:shared/resources/develop-pipeline-step-5-6-qa-loop.md#Verdict branching'`.
- Controls:
  - `open-coverage-shapes-9` (`task.238.qa.9.security.cases.1.json`, 12 cases): 10 pass. Reproduced:
    `oc9-flow-then-key-exempt` (CR9-2) and `oc9-truncated-by-hash-heading` (CR9-3). All 5 legitimate
    controls pass: uppercase, quoted provenance, flow exempt, nested category and quoted ` #`.
  - `open-coverage-shapes-8` (the gate 8 cases re-run, `task.238.qa.9.security.cases.2.json`, 8 cases):
    7 pass. The 5 bug.17 shapes are now refused. `oc8-provenance-continued` prints `unreadable`. Its
    `expected` is `1`, but its `correct` field reads "1 (or unreadable)", so this is not a reproduction.
- `fast-gate-outcome.sh` and `qa-ci-read.sh` are unchanged since gate 8, so their controls were not re-run.

### Maintainability — PASS
Each of the cycle 8 fix's four guards is mutation-proven (below). The awk has now drawn findings at
five gates. The structural recommendation, a bundled parser, is unchanged.

---

## Code Review

Advisory, except that `code_review_blocking=true` was passed by the pipeline.

**Correctness bugs (5):**
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1589`: when awk fails, the block prints an empty `OPEN_COVERAGE` at exit 0, which takes the Otherwise exit → normalise non-count values to `unreadable`. **Promoted: TASK-238-CR9-1.**
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1582`: block keys after a flow entry are read as its keys, so invalid YAML reads `0` → flag flow-opened entries. Not auto-promoted (medium confidence). **Entered by QA as TASK-238-CR9-2**: QA reproduced it independently with the probe engine, and PyYAML confirms the shape is invalid.
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1551`: a list truncated inside the fence reads its surviving entries → require a terminator. Reproduced (`oc9-truncated-by-hash-heading`). Advisory.
- [low/low] `evals/shared/tests/pr-review-loop-parity.test.mjs:861`: platform-variance: the fixtures run under one awk only → run each installed variant. Not reproduced: no mawk or BWK awk is on this host. Advisory.
- [low/low] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:37`: other consumers of a 5c `CONCERNS` verdict are not enumerated → list and qualify them. Advisory.

**Cleanups (0).**

All anchors `ok` (`finding-anchors.js --rev HEAD`).

Provenance (5b): CR9-1 and CR9-2 read the same at gate 8's head `a2a41ca1`, and `origin/develop` has
no open-coverage block. They are therefore branch-introduced and inside the task's named class, and
they stay in `top_issues[]`.

Mutation proofs, run in a scratch worktree at `51dc912e`. Each was snapshotted with `cp` and restored
from the snapshot, the baseline was green (76/76) before and after, and the edit was asserted applied
by diff line count:

mutation-proven: drop the category token allow-list → "a category that only contains the word…", "a tagged category", "an anchored category" went red → covered
mutation-proven: deeper line after category/provenance read as text again → "a provenance value continued on a deeper line" went red → covered
mutation-proven: drop the flow ` #` refusal → "a comment inside a flow entry before a readable category" went red → covered
mutation-proven: drop the duplicate-key check → "provenance given twice in one entry" went red → covered

4 of 4 cycle 8 guards covered.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (`npm run ci:fast`) | PASS: 6529 tests, 0 fail |
| Tracked PR review corpus (184 reports, old vs new block) | PASS: 0 changed |
| Bundle freshness | PASS |
| Skill validation (develop-task, develop-story) | PASS |
| PR CI on `51dc912e` | PASS (green) |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (§5c open-coverage block) and its two bundled copies
- `evals/shared/tests/pr-review-loop-parity.test.mjs`
- `CHANGELOG.md`

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle:check
npm run validate -- skills/develop-task/
npm run validate -- skills/develop-story/
node --test evals/shared/tests/pr-review-loop-parity.test.mjs   # scratch worktree, baseline + 4 mutations
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-5-6-qa-loop.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'fence:shared/resources/develop-pipeline-step-5-6-qa-loop.md#Verdict branching' --slot "{the PR review report this cycle's 5c wrote}" --cases-file task.238.qa.9.security.cases.{1,2}.json --record task.238.qa.9.security.run.json --name open-coverage-shapes-{9,8} --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770
```

### Coverage Report
Not measured. The deliverable is Markdown step docs and shell, and the repository has no coverage
tooling for either.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR9-1 / bug.18: normalise a non-count `OPEN_COVERAGE` to `unreadable` (P2).
2. CR9-2 / bug.19: refuse a deeper line after a flow entry (P2).

### Short-term Actions (Non-Blocking)
1. Replace the open-coverage awk with a bundled script that uses a real YAML parser. This is the
   eighth gap found in it.
2. Reword the task document's Overview and Phase 1 checkbox to the amended SC-2.
3. CR9-3, CR9-4 and CR9-5, plus the carried CR6/CR7 items.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH. Two MEDIUM correctness gaps remain in the §5c open-coverage check. Each lets
"could not look" read as "found none", which is the guarantee the check states. The cycle 8 fix
itself is verified.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: bug.18 and bug.19 fixed, or accepted as deferred work.

---

**QA Report**: co-located at `task.238.qa.9.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.9.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: 5b `/qa-fix` for CR9-1 and CR9-2. Cycle 9 is the granted budget's last, so the loop-limit trigger follows.
