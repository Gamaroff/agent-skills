# QA Report: Task 243 - Link Wireloom wireframe nodes to the project's UI components, and ask when unsure

**Task**: [Link to task document](./task.243.wireframe-component-mapping.md)
**Gate File**: [task.243.gate.1.wireframe-component-mapping.yml](./task.243.gate.1.wireframe-component-mapping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Executive Summary

This is the first QA cycle of PR #785. It covers the engine, the procedure, the eight skill hooks,
the Phase 0 and Step 3 step-doc changes, and the two new suites. All five phases are delivered and
the 23 new tests pass. The diff review found five high-confidence bugs. QA reproduced three of them
by execution. It also reproduced a Phase 0 block that fails on a fresh checkout.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete; status `ready-for-review`
- [x] All implementation phases completed (5/5 marked done)
- [x] Tests passing (fast gate at Step 3: 6825 tests, 0 failed; the two new suites 23/23 here)
- [x] Breaking changes documented: none; the feature is off without `ui.wireframeMap`
- [x] Code on feature branch with open PR (#785, OPEN)

### Testing Approach

- [x] Automated Testing (unit, eval)
- [x] Manual Testing (fixture runs of the changed blocks)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore subagent for the diff review (Step 3b). This is the
default rule: 5 phases, risk not set, no auth, payments or security surface.

CI on 716d2a9c97f8: pending

Code reviewer: dispatched 13:49:52Z, returned 13:53:44Z (`date -u`); `duration_ms` 165287.

Diff scope: `git diff origin/develop...HEAD`, 1796 lines across 21 files. It excludes
`skills/*/references/*`, which are generated copies held by `bundle:check`, and `docs/tasks/*`.

Step 4b ran over every changed `SKILL.md` and `shared/resources/*.md` (results below).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine and its tests | CONCERNS | 11/11 pass | CR-1, CR-2, CR-3, CR-4, CR-7 in the engine |
| Phase 2: Procedure and configuration reference | PASS | Verified | Procedure's `record` block ran in a fixture |
| Phase 3: Skill hooks and bundle | CONCERNS | Verified | 4B-1: `0c-wire` fails on a fresh checkout; `bundle:check` held at Step 3 |
| Phase 4: Hook-presence test | PASS | 12/12 pass | |
| Phase 5: Verification | PASS | Verified | Fast gate green at Step 3; `validate` exit 0 for all nine changed skills |

**Overall Phase Completion**: 5/5 delivered; 2 with findings

---

## Success Criteria Verification

| Criterion | Evidence | Status | Notes |
| --- | --- | --- | --- |
| SC-1 no `ui:` → `unset`, nothing written | `wireframe-map.test.mjs` "ensure is a no-op without a ui: block" | PASS | |
| SC-2 seed, then second run `unchanged` | `wireframe-map.test.mjs` | CONCERNS | Holds for a `##` section only; a `###` section updates on every run (CR-1) |
| SC-3 additive, never loses a row | `wireframe-map.test.mjs` | PASS | No row lost; CR-1 duplicates rows, which SC-3 does not name |
| SC-4 most specific row wins | `wireframe-map.test.mjs` "resolve picks the most specific…" | PASS | mutation-proven (below) |
| SC-5 `record` adds, then replaces | `wireframe-map.test.mjs` "record adds a row, then replaces it…" | PASS | mutation-proven (below) |
| SC-6 eight skills carry hook + bundled files | `wireframe-mapping-hooks.test.mjs` | PASS | |
| SC-7 documentation criterion | `wireframe-mapping-hooks.test.mjs` | PASS | Documentation kind; the test reads the prose, as the criterion states |

The develop pipeline gave no traceability matrix. The Success Criteria are a checklist, not a
table, so the matrix was skipped and each criterion was mapped here by hand.

---

## Breaking Changes Validation

None declared. Verified: without a `ui:` block, every command answers `unset` (SC-1 test), and each
hook gates on `ui.wireframeMap` (SC-6 test). **Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (5)

**Issue: `ensure` duplicates rows under a level-3 section (TASK-243-CR-1)**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.243.bug.1.ensure-duplicates-rows-under-a-level-3-section.md](./task.243.bug.1.ensure-duplicates-rows-under-a-level-3-section.md)
- **Observation**: with `catalogueSection: '### Components'`, three runs left 3 Added headings and 3 `Button` rows
- **Recommendation**: nest the Added heading below the section level; test two runs at `###`

**Issue: a `#` in a quoted label truncates it (TASK-243-CR-2)**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.243.bug.2.hash-in-a-quoted-label-truncates-it.md](./task.243.bug.2.hash-in-a-quoted-label-truncates-it.md)
- **Observation**: `text "Order #1234"` resolved with label `Orde`
- **Recommendation**: strip only an unquoted `#`

**Issue: documented flow-list `componentExclude` is ignored (TASK-243-CR-3)**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.243.bug.3.flow-list-component-exclude-is-silently-ignored.md](./task.243.bug.3.flow-list-component-exclude-is-silently-ignored.md)
- **Observation**: the header's own example parses as a string and becomes `[]`
- **Recommendation**: parse or refuse it; fix the example

**Issue: names with two leading capitals are dropped (TASK-243-CR-4)**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.243.bug.4.component-names-with-two-leading-capitals-are-dropped.md](./task.243.bug.4.component-names-with-two-leading-capitals-are-dropped.md)
- **Observation**: a barrel exporting `HStack` seeded no `HStack` row
- **Recommendation**: widen both regexes; reject only all-caps constants

**Issue: `0c-wire` fails on a fresh checkout (TASK-243-4B-1)**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.243.bug.5.0c-wire-fails-on-a-fresh-checkout.md](./task.243.bug.5.0c-wire-fails-on-a-fresh-checkout.md)
- **Observation**: run as delivered with no `.claude/state`, exit 1, `No such file or directory`
- **Recommendation**: `mkdir -p .claude/state` at the top of the block

### LOW Severity Issues (1)

- **TASK-243-CR-7**: `purposeOf` crosses `*/`, so a file header doc comment becomes the component's purpose.

**Total Issues**: HIGH: 0, MEDIUM: 5, LOW: 1

---

## NFR Assessment

### Performance — PASS
Offline, with one pass over each file. The real-world dry run in the task document read 99 exports
and 37 nodes.

### Reliability — CONCERNS
CR-1 breaks the never-duplicate contract for `###` sections. 4B-1 fails the first develop run in a
consumer that enables the feature. CR-6 (advisory) reports an unreadable map as `ok`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No secrets, no network, no shell-out. Every path comes from the consumer's own `skills-config.yaml`.

### Maintainability — PASS
There is one engine and one procedure, and every hook cites them. The header documents every
`reason` value and exit code.

---

## Code Review

Code-review blocking is on: `code_review_blocking=true` was passed by `/develop-task`, and the task
sets no `false`. All nine anchors were checked `ok` against `716d2a9c`.

**Correctness bugs (8):**
- [medium/high] `shared/resources/wireframe-map.js:565` — a level-3 `catalogueSection` is ended by the inserted Added heading, so every run duplicates the added rows → nest the heading below the section level. **Promoted: TASK-243-CR-1.** Reproduced.
- [medium/high] `shared/resources/wireframe-map.js:174` — comment stripping cuts inside quotes; `Order #1234` → `Orde` → strip only an unquoted `#`. **Promoted: TASK-243-CR-2.** Reproduced.
- [medium/high] `shared/resources/wireframe-map.js:116` — `componentExclude: [A]` parses as a string and is dropped → parse or refuse; fix the header example. **Promoted: TASK-243-CR-3.**
- [medium/high] `shared/resources/wireframe-map.js:494` — the PascalCase filter drops `HStack`, `QRCode` (also line 501) → widen both regexes. **Promoted: TASK-243-CR-4.** Reproduced.
- [medium/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:630` — `0c-wire` writes under `.claude/state` before it exists → add `mkdir -p`. The reviewer's confidence stays medium. QA reproduced it by execution, and that Step 4b failure is what reached the gate, as **TASK-243-4B-1**.
- [medium/medium] `shared/resources/wireframe-map.js:631` — an unreadable map and an empty map both answer `ok`, and no caller reads `mapState` → return a non-ok reason. Advisory; `recommendations.future`.
- [low/high] `shared/resources/wireframe-map.js:448` — `purposeOf` crosses `*/` → stop at a terminator. **Promoted: TASK-243-CR-7.**
- [low/low] `shared/resources/wireframe-map.js:720` — `record` matches by exact signature string, so an equivalent hand-written row is duplicated → compare normalised patterns. Advisory.

**Cleanups (1):**
- `shared/resources/wireframe-map.js:666` — the candidate filter uses substring containment (`ButtonGroup` passes) → compare the leading name exactly.

Provenance: every finding is in a file or block this branch adds. Nothing exists on base to compare
against, so none is `pre-existing`.

**Boundary decision: `boundary: false`.** `classifyBoundaryText` matched no signal in the engine
header or in the Success Criteria. These candidates were named and checked:
- `match`/`score`: a matcher. A miss leads to a question, not a refusal.
- `readMap` returning null: a parse fallback that writes nothing. `record` reports `unparseable`.
- `labelMatches`: compiles a `/re/` from the project's own map, which a person edits. The input is
  trusted and local. No corpus sink models the map.

`probes_executed: 0`, `escaped: 0`.

**Platform variance:** not applicable. The suites build fixtures under `os.tmpdir()`, but they pass
no fixture path to a validating consumer.

mutation-proven: removed the flag constraint in `score()` (`wireframe-map.js:352`) → "resolve picks the most specific matching row and lists the open nodes" went red → covered
mutation-proven: disabled the replace branch in `record()` (`if (same)` → `if (false && same)`) → "record adds a row, then replaces it for the same signature and label" went red → covered

Both proofs ran in a scratch worktree at `716d2a9c`, which was removed afterwards. Baseline 11/11 green after each.

### Step 4b — documented commands

| File | Changed blocks | Executed | Result |
| --- | --- | --- | --- |
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | 1 (0c-wire) | 0 by the engine (`mutating`: redirect) | Run by hand in a fixture, bash: works when `.claude/state` exists; **exit 1 on a fresh checkout** (4B-1) |
| `shared/resources/wireframe-component-mapping.md` | 1 | 0 by the engine (`mutating`) | Run by hand in a fixture, bash: `ensure` created both files, `record` + `resolve` resolved the recorded node (open 3 → 2) |
| `shared/resources/develop-pipeline-step-3-develop-loop.md` | 0 | — | file-level `zero-blocks-executed` (2 placeholder blocks, none changed) |
| `skills/{create-story,review-story,review-task}/SKILL.md` | 0 | — | file-level `zero-blocks-executed`, no changed block |
| `shared/resources/pr-conformance-prompt.md`, `skills/{create-task,develop-*,qa-*}/SKILL.md` | 0 | — | clean |
| `shared/resources/develop-pipeline-autonomous-defaults.md` | — | — | no bash fence |

Shells: bash only. `zsh-unavailable`: this host has no zsh. That reduces nothing the engine counts
as runnable. The file-level `zero-blocks-executed` records describe blocks this change did not
touch. The engine's `changed-blocks-not-executed` for the two changed blocks is closed by the hand
runs above, which are recorded and not counted as engine executions.

Standards-named validation: `npm run validate -- skills/<s>/` exit 0 for each of create-story,
create-task, develop-story, develop-task, qa-story, qa-task, review-story, review-task and review-pr.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full fast gate (`npm run ci:fast`, symlink aside) at Step 3, same code | PASS: 6825 tests, 0 failed |
| The two new suites at `716d2a9c` (symlink aside) | PASS: 23/23 |
| Phase 0d question count with the feature off | PASS: unchanged; hooks gate on `ui.wireframeMap` |

---

## Test Artifacts

### Files Reviewed
`shared/resources/wireframe-map.js`, `shared/resources/wireframe-component-mapping.md`, the 0c-wire / 0d / Step 3 /
autonomous-defaults / conformance hunks, the eight `SKILL.md` hooks, `docs/reference/configuration.md`, both new suites.

### Test Commands Executed
```bash
command node --test shared/resources/tests/wireframe-map.test.mjs evals/shared/tests/wireframe-mapping-hooks.test.mjs
npm run -s validate -- skills/<changed-skill>/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed.md> --diff-base <merge-base> --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 785
```

### Coverage Report
Not measured. This repository's test runner (`node --test`) collects no coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix TASK-243-CR-1, CR-2, CR-3, CR-4 and 4B-1 (P2), and CR-7. Give each a regression test that goes red without the fix.

### Short-term Actions (Non-Blocking)
1. CR-6: give an unreadable map a non-ok `reason`.
2. CR-8 and CR-9: compare normalised signatures and exact names.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The feature is delivered and tested, but four engine defects and one Phase 0 defect,
each reproduced, would reach consumers.
**Quality Score**: 50/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the five medium findings fixed and re-gated.

---

**QA Report**: co-located at `task.243.qa.1.wireframe-component-mapping.md`
**Gate File**: co-located at `task.243.gate.1.wireframe-component-mapping.yml`
**Next Steps**: `/qa-fix` cycle 1, then QA cycle 2 (refute pass).
