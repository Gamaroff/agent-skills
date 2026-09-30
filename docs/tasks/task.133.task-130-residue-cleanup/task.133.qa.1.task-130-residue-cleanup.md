# QA Report: Task 133 - Residue of task.130's seven QA cycles

**Task**: [Link to task document](./task.133.task-130-residue-cleanup.md)
**Gate File**: [task.133.gate.1.task-130-residue-cleanup.yml](./task.133.gate.1.task-130-residue-cleanup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: FAIL

---

## Executive Summary

All five phases were verified against the diff. Every suite is green, and every develop-time mutation proof QA re-ran went red as claimed. The independent diff review reproduced one HIGH in the new Phase 5 check: `--check-append-only --against ""` reads the index and reports a clean log. The 5c TRAIL lens builds `--against` from `$(git merge-base …)`, so an unresolvable base fails open. Under `code_review_blocking` that finding gates.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED until TASK-133-QA-1 is fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (5/5 checked)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#528, OPEN)

### Testing Approach

- [x] Automated Testing (unit, contract, eval replay)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review (independent Explore subagent)

### Review Methodology

Direct tools, plus one dispatched Explore subagent for the Step 3b diff review. It ran 105 s (the agent's own reported duration) and returned by 08:47:52Z (output-file mtime), well inside the 10-minute budget. This was the first review, so the scope was the whole branch diff against `origin/develop`, 2169 lines. Generated `skills/*/references/` copies were excluded, because they are byte copies of `shared/resources/*` and `bundle:check` verifies them. Traceability mapper skipped: the Success Criteria are checklists, not a table (`HAS_SUCCESS_CRITERIA_TABLE=false`).

Step 4b runnable prose: 9 changed files executed under bash and zsh. See Code Review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: lock script | PASS | 99/99 both shells | falsifiable no-overwrite; advice only when nothing restores; header bullet corrected; stamp in 3 mirrors |
| Phase 2: contract delete block | PASS | stale-snapshot-delete 42/42 | R (three HALT texts), S (unrecognised label), P with a space |
| Phase 3: detector prompt | PASS | detector-candidate-rule 4/4 | rules at markers; script agreement; listing under zsh |
| Phase 4: citations and messages | PASS | who-restores 5/5, report-lint-call-sites 5/5 | 5 conditional sites; 7 arms cite one statement; token-floor test D |
| Phase 5: change-log append-only | CONCERNS | change-log 85/85 | TASK-133-QA-1: empty `--against` fails open |

**Overall Phase Completion**: 5/5 implemented, 4/5 clean

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No-overwrite scenario red under an unconditional overwrite | red | red ×2 shells (develop proof) | PASS |
| Matched claim + bystander legacy: exit 0, no advice; legacy-only prints it | yes | scenario passes; legacy-only prints the advice exactly once | PASS |
| Three delete-block outcomes each have their own message, nothing deleted | 3 distinct | test R asserts 3 distinct HALT lines, snapshot kept | PASS |
| Detector Step 1 states both rules; listing works under `zsh -f` | yes | test A + C | PASS |
| `--check-append-only` reports exactly six rows for fdba78d9; none for append and migration | 6 / 0 | J1 six; J2/J3 none; J4 CLI exit 1/0 | PASS, with QA-1 against the unresolvable-base path |
| Every `2)` arm cites the step-8 sentence, which names every `usage(` cause | 7 arms, 6 causes | test D | PASS |

**Code quality**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| ci:fast | green | 4626/4629; 2 LOAD-SENSITIVE timing tests over budget under a parallel sweep, 7/7 and 13/13 alone | PASS |
| eval:develop-task | green | 17/17 fixtures | PASS |
| shell suites | green | lock 99/99, grant 46/46 | PASS |
| bundle:check / lint:shell / Prettier | clean | 0 problems / clean / clean | PASS |
| validate (standards-named) | pass | develop-task, develop-story, develop-bug, review-pr ✓ | PASS |
| mutation proofs recorded | yes | 15 in the implementation report | PASS |

**Migration**: CHANGELOG `[Unreleased]` has an Added entry (append-only check, recovery named) and a Fixed entry. task.130's Deferred Work is annotated item by item. PASS.

---

## Breaking Changes Validation

None declared, and none found. `upsertChangeLog` is untouched. The `legacy-snapshot:` stderr text changed its tail from "refusing to restore from it; pass --accept-legacy…" to "skipped", and the advice moved to the final line. `git grep` finds no consumer that parses the old text; every reader greps `legacy-snapshot`, which is kept.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: `--check-append-only --against ""` reads the index and reports a clean log**
- **Severity**: HIGH
- **Category**: Reliability / correctness
- **Bug Report**: [task.133.bug.1.check-append-only-empty-against-reads-index.md](./task.133.bug.1.check-append-only-empty-against-reads-index.md)
- **Observation**: `--against "$(git merge-base HEAD origin/nonexistent)"` → `{"reason":"ok"}`, rc 0. Reproduced by QA.
- **Impact**: the 5c TRAIL check says "no row lost" whenever the base cannot be resolved.
- **Recommendation**: refuse an empty or whitespace `--against` as usage (exit 2); add J4 cases; mutation-prove.
- **Priority**: P1

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

- **TASK-133-QA-2**: the bind-block comment claims "Every `{doc-directory}` substitution is QUOTED". It holds only for the two § Consume Output blocks, and the task scoped out the others at `:350` and `:510`. Narrow the comment.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
One extra `jq -e` per stale delta. The append-only check is one `git show` per document, and only the 5c lens runs it.

### Reliability — CONCERNS
TASK-133-QA-1: the new check fails open on an unresolvable base. Everything else fails closed: the three Pass 2 HALTs and the reported unrecognised label.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The one boundary the diff touches is `advance-pipeline-lock.sh` `choose_candidate()`. Only its stderr message placement changed. It has no probe-engine entry form: it is a flag-moded executable, so neither the one-positional `shell:` form nor the sourced-library `shell-fn:` form applies. Its hostile cases run in its own suite on both shells, and in detector-candidate-rule B. `rowsDropped` returns a diff, and its result does not prevent any action. Its callers are a CLI exit code and an advisory review lens, so `boundary: false`. No new input reaches a shell: `contentAt` uses `execFileSync` with an argv array.

### Maintainability — PASS
Each rule is stated once and the other sites cite it. Tests read the populations: 5 citation sites, 7 arms, 6 `usage(` causes, 128 corpus documents.

---

## Code Review

Step 3b: independent Explore reviewer over the whole branch diff. `code_review_blocking=true` came from the run-level override, so bug + high-confidence findings gate.

**Correctness bugs (3):**
- [high/high] `shared/resources/change-log.js:1018`: an empty `--against` reads the index, and the check reports ok/exit 0 → refuse empty as usage. **Promoted to TASK-133-QA-1.** Reproduced by QA.
- [medium/medium] `shared/resources/develop-pipeline-resume-contract.md:37`: population risk. Other `{doc-directory}` fences in the contract and step-0 are still unquoted, but the comment says "every". Advisory. The task scoped quoting to § Consume Output (Important Clarifications), so QA files the over-wide comment as TASK-133-QA-2 (LOW) and the population as `recommendations.future`.
- [low/low] `shared/resources/change-log.js:1049`: `new-document` also covers a renamed document. Advisory, filed in `recommendations.future`.

**Cleanups (0).**

**Step 3c: mutation spot check** (QA re-ran two of develop's 15 proofs independently):
- mutation-proven: `rowsDropped` never pushes a dropped row → J1, J3 red → covered
- mutation-proven: unrecognised-label pass made silent → S [bash], S [zsh] red → covered

**Platform variance:** `TMPDIR=/tmp command node --test` over the 5 changed/new suites → 141/141. `TMPDIR=/tmp bash advance-pipeline-lock.test.sh` → 99/99.

**Step 4b: executed documented commands** (bash + zsh):
- 9 files. Runnable blocks were 1/1/1 in the three SKILL.md files, 2 in the contract and 1 in the detector prompt. The rest were refused as placeholder or mutating: step-0 had 3 placeholder and 11 mutating; step-8 and pr-conformance hit `no-executable-blocks` (information).
- 3 execution failures on the first run, each a `cat` of a path that the empty temp dir lacked: `.agents/skills/develop-*/SKILL.md` at SKILL.md:48/51/53 and `.claude/state/develop-pipeline.lock` at the detector prompt :69. All are in blocks this diff did not change. Re-run seeded (`--copy-as skills:.agents/skills`; `--copy` of a lock fixture): 0 findings. These are harness findings, not prose findings.
- `develop-pipeline-step-0-resolve-and-prepare.md`: `zero-blocks-executed` (medium, under-configured). None of its runnable-shaped blocks changed in this diff, so it is recorded here and not promoted.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full node suite (`npm test`) | 4626/4629, both failures load-sensitive and green alone |
| Resume evals (`eval:develop-task` fixtures 16/17 touch the delete block) | 17/17 |
| grant-qa-cycles (relays `--restore` stderr) | 46/46 |
| Change Log writers (`upsertChangeLog` unchanged) | change-log 85/85; corpus 128 docs, 0 flagged |
| CI on PR head | 5/5 SUCCESS (informational) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/{advance-pipeline-lock.sh,advance-pipeline-lock.test.sh,grant-qa-cycles.sh,develop-pipeline-resume-contract.md,pipeline-resume-detector-prompt.md,develop-pipeline-step-0-resolve-and-prepare.md,develop-pipeline-step-8-commit.md,develop-pipeline-pause.md,change-log.js,pr-conformance-prompt.md}`, `shared/resources/tests/{stale-snapshot-delete,detector-candidate-rule,who-restores-single-statement,report-lint-call-sites,change-log}.test.mjs`, `skills/develop-{task,story,bug}/SKILL.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
npm run ci:fast
bash shared/resources/advance-pipeline-lock.test.sh
bash shared/resources/grant-qa-cycles.test.sh
npm run eval:develop-task
npm run lint:shell && npm run bundle:check && npm run check:generated
npm run validate -- skills/develop-task/   # + develop-story, develop-bug, review-pr
TMPDIR=/tmp command node --test shared/resources/tests/{detector-candidate-rule,stale-snapshot-delete,change-log,who-restores-single-statement,report-lint-call-sites}.test.mjs
command node shared/resources/qa-execute-snippets.mjs --file <each changed prose file> --json
command node shared/resources/change-log.js --check-append-only --file <task.130 doc> --against "" --json   # QA-1 reproduction
```

### Coverage Report
Not measured. This repository's gate is test-count based, with mutation proofs; there is no coverage tooling.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-133-QA-1: refuse an empty or whitespace `--against` (P1).

### Short-term Actions (Non-Blocking)
1. TASK-133-QA-2: narrow the bind-block comment to § Consume Output.
2. Follow-up: quote every fenced `*-directory` placeholder, with a population test (CR-2).
3. Follow-up: rename detection for `new-document` (CR-3).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence HIGH correctness bug in new code (`code_review_blocking`), reproduced by QA.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK-133-QA-1 fixed

---

**QA Report**: co-located at `task.133.qa.1.task-130-residue-cleanup.md`
**Gate File**: co-located at `task.133.gate.1.task-130-residue-cleanup.yml`
**Next Steps**: `/qa-fix` for TASK-133-QA-1 and QA-2, then re-review
