# QA Report: Task 227 - Step 8 checklist block mixes rm with must-pass checks; host refuses the whole block

**Task**: [Link to task document](./task.227.step-8-checklist-no-rm.md)
**Gate File**: [task.227.gate.1.step-8-checklist-no-rm.yml](./task.227.gate.1.step-8-checklist-no-rm.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-24
**Testing Completed**: 2026-10-24
**Gate Status**: CONCERNS

---

## Executive Summary

The change moves the five state-file removals from the Step 8 Completion Checklist block into `advance-pipeline-lock.sh --complete` and adds a guard test that keeps `rm` out of any block that calls `--complete`. All three phases are delivered. CI is green, and both development mutations go red on committed tests when re-run in a clean worktree. Two medium findings remain. First, the guard's `rm` matcher misses common shell forms, so criterion 4 does not fully hold. Second, `--complete` now deletes the hold-dir record even while held files are still in the hold directory.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (13/13 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#746, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration, e2e)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools. This is a small task (3 phases, one script plus one step doc), and the first review of it. One read-only Explore code reviewer ran over the whole branch diff, `origin/develop...HEAD`, 1504 patch lines. It was dispatched at 07:32:20Z, and its completion notice gave `duration_ms` 109869. The diff contained no SKILL.md change, so Step 4b ran over `shared/resources/develop-pipeline-step-8-commit.md`.

---

## Implementation Verification

| Phase                           | Status | Test Result | Notes |
| ------------------------------- | ------ | ----------- | ----- |
| Phase 1: Tests first            | PASS   | Verified    | Scenario 15 (both arms), the 5c records in the records test, the guard and its RM_WORD control. The guard has gaps (QA1-1). |
| Phase 2: Move the removals      | CONCERNS | Verified  | The removal block sits before the no-lock exit (`advance-pipeline-lock.sh:173`). The block's `rm -f` lines are gone. The hold-dir record is removed with no condition (QA1-2). |
| Phase 3: Bundle, docs, changelog | PASS  | Verified    | Header, `usage()` and the CHANGELOG entry. 13 + 3 bundled copies; `bundle:check` clean. |

**Overall Phase Completion**: 3/3 phases delivered, 2 with findings.

---

## Success Criteria Verification

**Functional:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| `--complete` with a lock removes the five records and the lock | `advance-pipeline-lock.test.sh` scenario 15, lock arm; mutation 2 shows the arm is tested | PASS |
| With no lock, `--complete` removes the same five and exits 0 | scenario 15, no-lock arm (`[bash] --complete (no-lock arm) removes the five records`) | PASS |
| An unrelated file in `.claude/state/` survives | scenario 15 `keeps an unrelated file and the halt snapshot` (both arms) | PASS |
| The block contains no `rm`, and the guard fails if one is added | No `rm` in the block: verified. The guard fails on `rm` at line start or after `;&\|({` (mutation 1 is covered). It **misses** `then rm`, `do rm`, `! rm`, `command`/`xargs`/`sudo rm` and `/bin/rm` (measured) | **CONCERNS** (QA1-1) |

**Performance:** Not applicable, as the task states. No performance-sensitive path changed.

**Code Quality:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| `npm run ci` passes | Local `npm run ci` exit 0 at the committed tree (`.agents/skills` symlink moved aside) | PASS |
| `bundle:check` clean, no `UNREACHED` | `128 skill(s) checked, 0 problems`; the pre-commit bundle check is clean too | PASS |
| The implementation report records both mutations and their reverts | Implementation report, Step 3 Decisions Log | PASS |

**Migration:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| CHANGELOG names the `--complete` behaviour change | `CHANGELOG.md` `### Changed` under Unreleased | PASS. The wording needs a correction if QA1-2 changes the behaviour |
| `--complete` usage lists the five records | `advance-pipeline-lock.sh` `usage()` and header | PASS |

---

## Breaking Changes Validation

### Breaking Change: `--complete` removes five records beside the lock

Documented: Yes
Migration Path Provided: Yes ("none")
Migration Tested: Yes (scenario 15)
Consumer Code Updated: Yes. The only pipeline caller is the Step 8 checklist. The post-Step-8 transition `--complete` runs after the records are already gone (`git grep` over `shared/resources`, `skills/*/SKILL.md`, `scripts`, `evals`).
Notes: The claim "No caller sees a different end state" is false for `step4-hold-dir.txt`. A no-lock `--complete` after a HALT, before Restore Held Files, now deletes the only pointer to the held files (QA1-2).

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: The no-rm guard misses `rm` after a shell keyword or a prefix command**
- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.227.bug.1.rm-word-misses-keyword-forms.md](./task.227.bug.1.rm-word-misses-keyword-forms.md)
- **Observation**: `RM_WORD` sees `rm` only at line start or after `;&|({`. Measured misses: `if true; then rm a; fi`, `do rm a; done`, `! rm a`, `command rm -f a`, `xargs rm -f`, `sudo rm a`, `/bin/rm a`.
- **Impact**: A removal written in the repository's most common shape (`if …; then rm -f x; fi`) passes the guard, which brings back the obs #87 failure.
- **Recommendation**: Widen the matcher, add those forms to the control test, and export the matcher so the probe can reach it.
- **Priority**: P2

**Issue: `--complete` removes the hold-dir record while held files are still held**
- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Bug Report**: [task.227.bug.2.complete-drops-hold-dir-pointer.md](./task.227.bug.2.complete-drops-hold-dir-pointer.md)
- **Observation**: Reproduced as follows. With no lock, and the record naming a directory that holds `held.txt`, `--complete` exits 0 and the record is gone.
- **Impact**: Held files are stranded in `/tmp` with nothing pointing to them.
- **Recommendation**: Keep the record, and warn on stderr, when the directory it names is non-empty. Add both-arm cases.
- **Priority**: P2

### LOW Severity Issues (1)

- CR-3 (cleanup, advisory). The guard's floor is `seen >= 1` over `developPipelineDocs()`. It does not pin the Step 8 checklist block itself.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS

Five `rm -f` calls move from the checklist shell into the script. The test suite gains one doc scan.

### Reliability — CONCERNS

QA1-2: a no-lock `--complete` can strand Step 4's held files by deleting the hold-dir record.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: true`. `RM_WORD` is a deny matcher: its input is step docs that agents edit, and its verdict backs a guard assertion. Test code is not exempt by location (Step 1b). It is a module-private `const`, so no engine form reaches it, and QA1-1 names the remedy (export it as a function).
- Candidates considered and not boundaries: the new `--complete` removal decides nothing. It removes five literal names in `dirname "$LOCK"`, uses no glob, and takes no caller-supplied name. The script's refusals (non-object lock, `--restore`) are unchanged by this diff.

### Maintainability — PASS

The header, `usage()` and the checklist comment name the records. The bundled copies match their sources.

---

## Code Review

Reviewer: one Explore subagent over the whole branch diff. `finding-anchors`: `ok` (3/3 anchors verified, `--rev HEAD`). `code_review_blocking` resolved `true` (pipeline override; no frontmatter flag). Neither bug finding is `confidence: high`, so neither was promoted automatically. QA reproduced both and raised them as QA1-1 and QA1-2. The reviewer's severity and confidence are recorded unchanged below.

**Correctness bugs (2):**

- [medium/medium] `shared/resources/advance-pipeline-lock.sh:175`: `--complete` deletes `step4-hold-dir.txt` in both arms with no check that the hold directory is empty. A hand-run or no-lock `--complete` after a HALT before Restore Held Files loses the pointer. Suggested fix: keep the record and warn when the directory is non-empty. Raised as **TASK-227-QA1-2** (reproduced).
- [low/medium] `shared/resources/tests/step-8-completion-checklist.test.mjs:672`: `RM_WORD` misses `then rm`, `do rm`, `xargs rm`, `command rm` and `/bin/rm`, and its self-test lists only forms it already matches. Suggested fix: widen the pattern and extend the hit list. Raised as **TASK-227-QA1-1** at medium, because the task's own criterion 4 depends on it (measured).

**Cleanups (1):**

- `shared/resources/tests/step-8-completion-checklist.test.mjs:713`: the floor `seen >= 1` passes while any one doc keeps a `--complete` block. The vendored step-8 copies are not scanned. They are byte copies checked by `bundle:check`, so scanning the source is enough. Pinning the floor to the Step 8 block is still stronger.

**Boundary:** `boundary: true` (`RM_WORD`; see Security), `probes_executed: 0`, `escaped: 0`. No run record was written, because the matcher is not reachable. The remedy is part of QA1-1.

**Mutation proofs** (re-run by QA in a scratch worktree at `9236848`, no `.agents/skills` symlink):

```text
mutation-proven: an rm -f 5c line put back in the checklist block → no fenced block that calls --complete carries an rm invocation → covered
mutation-proven: record removal moved into the lock-present arm only → [bash] --complete (no-lock arm) removes the five records (75/76) → covered
```

**Step 4b** (`qa-execute-snippets.mjs`, `--diff-base` the merge base): 1 changed block (line 178, the checklist block), 0 executed. It was refused because `helper .agents/skills/{develop-story: not a literal path`, which raised `changed-blocks-not-executed` (medium confidence, advisory). The file has 5 bash blocks, all refused as mutating (`no-executable-blocks`). The changed block is executed by the committed suite `step-8-completion-checklist.test.mjs` (62/62), which fills the template and runs it under bash. zsh is not installed on this host.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `advance-pipeline-lock.test.sh` (all modes, 76 cases) | PASS |
| `step-8-completion-checklist.test.mjs` (62 tests) | PASS |
| Full suite `npm run ci:fast` (6289 tests) and `npm run ci` | PASS |
| Other `--complete` callers (`git grep`) | None outside Step 8 and the post-Step-8 transition |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/advance-pipeline-lock.sh`
- `shared/resources/advance-pipeline-lock.test.sh`
- `shared/resources/develop-pipeline-step-8-commit.md`
- `shared/resources/tests/step-8-completion-checklist.test.mjs`
- `CHANGELOG.md`

### Test Commands Executed

```bash
bash shared/resources/advance-pipeline-lock.test.sh
timeout 600 "$(type -P node)" --test --test-reporter=tap shared/resources/tests/step-8-completion-checklist.test.mjs
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-8-commit.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings.json> --root "$(git rev-parse --show-toplevel)" --rev HEAD --annotate <findings.json> --json
# mutations, in a scratch worktree: mut227.py 1 and 2, each reverted with git checkout
```

Standards-named validation: `npm run validate:all` ran inside `npm run ci` (exit 0). It covers every changed skill.

### Coverage Report

Not measured. The repository has no coverage tooling for shell or Node tests.

---

## Recommendations

### Immediate Actions (Blocking)

1. QA1-1: widen `RM_WORD`, extend its control test, and export it so the probe can reach it.
2. QA1-2: keep the hold-dir record while the hold directory is non-empty, and add both-arm cases.

### Short-term Actions (Non-Blocking)

1. CR-3: pin the guard's floor to the Step 8 checklist block.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The delivery is complete and green, but two medium findings each contradict a claim the task makes: criterion 4, and "No caller sees a different end state".
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA1-1 and QA1-2 fixed and re-reviewed.

---

**QA Report**: co-located at `task.227.qa.1.step-8-checklist-no-rm.md`
**Gate File**: co-located at `task.227.gate.1.step-8-checklist-no-rm.yml`
**Next Steps**: `/qa-fix` for QA1-1 and QA1-2, then QA cycle 2.
