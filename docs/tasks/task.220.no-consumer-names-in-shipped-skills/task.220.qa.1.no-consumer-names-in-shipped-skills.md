---
type: qa-report
task: task.220
cycle: 1
gate: PASS
---

# QA Report: Task 220 - No consumer names in shipped skills

**Task**: [task.220.no-consumer-names-in-shipped-skills.md](./task.220.no-consumer-names-in-shipped-skills.md)
**Gate File**: [task.220.gate.1.no-consumer-names-in-shipped-skills.yml](./task.220.gate.1.no-consumer-names-in-shipped-skills.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: PASS

---

## Executive Summary

QA reviewed PR #710 at head `56b6f2c7`. The change has four parts: a guard that fails CI when a shipped file names the consumer project; 20 source files rewritten to neutral placeholders; 10 fixtures renamed; and the wireframe skill's one format profile removed. Every phase is verified. The guard is mutation-proven against five ways a name can come back. The diff review found no bugs.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4, every checkbox ticked)
- [x] Tests passing
- [x] Breaking change documented, with a migration path
- [x] Code on feature branch with open PR (#710, OPEN, MERGEABLE)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [x] Performance Testing (guard wall time)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore subagent for the Step 3b diff review. The task has 4 phases and touches documentation, tests and comments only, so the small-task rule applies. The reviewer ran 161.9 s (from the completion notice's `duration_ms`) over the whole branch diff, `origin/develop...HEAD`, which is 5,011 patch lines. Mutation proofs ran in a scratch worktree, so the tree the reviewer was reading never changed.

Step 4b ran over the six changed Markdown files that contain fenced bash: `develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-step-2-review.md`, `platform-detection.md`, and the `finalise`, `review-pr` and `wireframe` SKILL.md files. Across them, one changed block was found: in step-0, classified `mutating`, and its change is a comment. No changed block executed, so the engine reported `changed-blocks-not-executed` for step-0. Every other changed line in these files is prose. One pre-existing block failed in `platform-detection.md`: line 538, `grep: skills/*/SKILL.md: No such file or directory`. That block is untouched by this diff, and it fails only because the temp copy holds no `skills/` tree, so this is a harness seeding note, not a finding.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Guard | PASS | Verified | `tests/no-consumer-names.test.js`, 4 tests. Red before any source edit (346 lines in 146 files, 11 paths), green at head. |
| Phase 2: Neutralise sources and fixtures | PASS | Verified | 20 files; every changed line in shipped `.js`/`.sh` sources is a comment (a `git diff -U0` filter over non-comment lines prints nothing). 10 fixtures renamed with history. |
| Phase 3: Wireframe profile | PASS | Verified | Profile and table row removed. Step 2 rewritten. The two profile tests are gone, and nothing in the tree still names `html-formats/`. |
| Phase 4: Bundle, docs, gates | PASS | Verified | `bundle:check` 0 problems; CHANGELOG Added and Removed entries; `ci:fast` exit 0. |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| No shipped line names the consumer | 0 hits | 0 | PASS | Guard test 3 (committed, per-PR); mutation M1, M2, M5 → covered |
| No shipped path names the consumer | 0 hits | 0 | PASS | Guard test 4; mutation M3 → covered |
| Guard walks the whole shipped tree | ≥ 500 files + anchors | pass | PASS | Guard test 2; mutation M4 → covered |
| Scanner flags each shape, ignores look-alikes | all samples | pass | PASS | Guard test 1; dev-time mutants of the key pattern in both directions (recorded in the implementation report) |
| Wireframe ships no profile | directory absent | absent | PASS | `skills/wireframe/SKILL.md` step 2; `git grep html-formats` empty outside history |
| Per-file test counts unchanged except wireframe −2 | match | match | PASS | Before/after table in the implementation report |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Guard wall time | < 2 s | 0.868 s at load 7.32 | PASS | `uptime; time command node --test tests/no-consumer-names.test.js` on head `56b6f2c7` |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Full fast gate | exit 0 | exit 0 | PASS | `npm run ci:fast` with `.agents/skills` moved aside: 5993 pass / 0 fail / 14 skipped |
| Bundle freshness | 0 problems | 0 | PASS | `npm run bundle:check`, 128 skills |
| Skill validation | 0 failures | 0 / 43 | PASS | `npm run validate -- skills/<s>` for every skill the diff touches (43) |
| Formatting | clean | clean | PASS | `npm run format:check` |

---

## Breaking Changes Validation

### Breaking Change: the wireframe skill ships no format profile

Documented: Yes (CHANGELOG `[Unreleased]` → Removed; task § Breaking Changes)
Migration Path Provided: Yes. Copy the profile into the consumer's own tree before running `setup-consumer.sh --update`, or recover it from history.
Migration Tested: Reasoned. `scripts/setup-consumer.sh:1663` replaces an installed skill with `rm -rf` and then `cp -r`, so the CHANGELOG is right that `--update` removes the file.
Consumer Code Updated: N/A (consumer-owned)
Notes: The conversion rules in the skill are unchanged, so a consumer with no profile keeps the same behaviour.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2, advisory, no bug file)

- **Out-of-scope residue.** Two tracked files outside `skills/` and `shared/` still carry the consumer key: `docs/reference/activation-phrases.md` (1 line) and `tests/key-lookup-single-statement.test.js` (9 lines). Neither is distributed to consumers, and the task's scope is the shipped tree. Routed to `recommendations.future`.
- **CR-1**, cleanup (see Code Review).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

The guard costs 0.868 s at load average 7.32, against a 2 s bound. The rest of the change is text, so it has no runtime cost.

### Reliability — PASS

The guard cannot pass vacuously. Test 2 requires at least 500 files plus named anchors, including a bundled copy, and test 1 calibrates the scanner. Five mutations each turned exactly the predicted committed test red.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No executable logic changed in a shipped script; every changed line in `shared/resources/*.js|*.sh` and `skills/*/scripts/*` is a comment. `boundary: false` (see Code Review).

### Maintainability — PASS

Every bundled copy is regenerated from its source, not hand-edited, so the copies and sources cannot drift apart unseen. The older task.201 guard's exemption list is now empty.

---

## Code Review

Advisory except where promoted; `code_review_blocking` resolved **true** (pipeline override, no doc flag). No finding qualified for `top_issues[]`.

**Correctness bugs (0):** none. The reviewer read 41 files (sources, tests, fixture renames and the guard). It checked the renamed `BOARD_*` constants and the new PROJ values against the existing PROJ fixtures and found no collision. It also found no leftover reference to the old fixture names or to `html-formats/`.

**Cleanups (1):**

- `tests/no-consumer-names.test.js:47` (anchor `ok`). The guard exempts all of `pipeline-answers-generic.test.mjs` to tolerate its calibration samples, so a name added elsewhere in that file goes unflagged, and that file keeps its own copy of the weaker `\b<KEY>\b` pattern. Suggested fix: share one `CONSUMER_NAMES` list, or exempt only the calibration lines by exact text. Routed to `recommendations.future`.

**Boundary rule:** `boundary: false`. The one predicate-shaped function the diff adds is the guard's line and path scanner in `tests/no-consumer-names.test.js`. It lacks the signals that would make it a boundary: it is test code, never shipped or installed, it takes no external input, and its `false` blocks nothing a consumer does. Its own calibration test is the check on it. No shipped predicate changed. `probes_executed: 0`, `escaped: 0`.

**Platform variance:** no environment-derived value reaches a validating consumer in this diff.

**Mutation proofs** (scratch worktree at `56b6f2c7`, snapshot and restore by `cp`, baseline green between each):

```
mutation-proven: consumer name appended to shared/resources/platform-detection.md → test 3 → covered
mutation-proven: consumer key appended only to skills/develop-task/references/platform-detection.md → test 3 → covered
mutation-proven: one fixture renamed back to the consumer prefix (git mv) → test 4 → covered
mutation-proven: SCOPE narrowed to ["shared"] → test 2 → covered
mutation-proven: underscore-joined consumer identifier appended to shared/resources/jira-stage.js → test 3 → covered
```

Five of five covered. The scanner's two key-pattern mutants (case-sensitive `\b`, and unbounded) were run during development and are recorded in the implementation report. They count as `dev-only`, because they were run against the uncommitted guard.

---

## Regression Testing

| Area | Result |
| --- | --- |
| The 12 suites touched by the rename (jira-stage, jira-sync, review-pr, scaffold-tracker-workflow, sync-jira-*) | PASS: pass counts identical to the pre-edit baseline |
| Wireframe suite | PASS: 42/42 (44 before, minus the two removed profile tests) |
| Whole repository fast gate | PASS: `ci:fast` exit 0 |

---

## Test Artifacts

### Files Reviewed

`tests/no-consumer-names.test.js`; the 20 neutralised sources (listed in the implementation report); `skills/wireframe/SKILL.md`; `skills/wireframe/tests/wireframe.test.js`; `CHANGELOG.md`; `scripts/setup-consumer.sh` (migration claim).

### Test Commands Executed

```bash
npm run ci:fast                                   # .agents/skills moved aside
npm run bundle:check
npm run validate -- skills/<s>                     # each of the 43 changed skills
uptime; time command node --test tests/no-consumer-names.test.js
command node --test --test-reporter=tap tests/no-consumer-names.test.js   # per mutation, in a worktree
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <f> --diff-base <merge-base> --copy-as skills:.agents/skills --json
```

### Coverage Report

Not applicable: the change adds a repository-scan test and edits text. Coverage is expressed as the mutation proofs above.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1: one shared `CONSUMER_NAMES` list, or a line-exact exemption for the older guard's calibration samples.
2. Neutralise the two out-of-scope files and consider widening the guard to `docs/reference/` and `tests/`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All success criteria hold on evidence that runs on every PR, the breaking change carries a verified migration path, and no correctness finding was raised.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.220.qa.1.no-consumer-names-in-shipped-skills.md`
**Gate File**: co-located at `task.220.gate.1.no-consumer-names-in-shipped-skills.yml`
**Next Steps**: Step 5c PR conformance review (`/review-pr`).
