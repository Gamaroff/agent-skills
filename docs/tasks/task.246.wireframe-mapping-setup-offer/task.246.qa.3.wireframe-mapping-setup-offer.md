# QA Report: Task 246 - Wireframe mapping setup offer and first-run candidates

**Task**: [task.246.wireframe-mapping-setup-offer.md](./task.246.wireframe-mapping-setup-offer.md)
**Gate File**: [task.246.gate.3.wireframe-mapping-setup-offer.yml](./task.246.gate.3.wireframe-mapping-setup-offer.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: CONCERNS
**QA Cycle**: 3 (re-review of `1f6477a9`, scoped to the changes since `11b1cfd2`)

---

## Executive Summary

All six cycle 2 findings are fixed, and QA reproduced each fix. BUG-2, BUG-3 and BUG-4 are closed.
The `configure` value guard changed this cycle, so the 17 probe cases were run again: all behave
correctly. The scoped review found two defects in BUG-5's own fix. When `configure` fills a blank
path key, it removes the list under it, but it stops at a blank line or a comment. A valid layout
then answers `write-failed` (medium). The same code deletes a comment indented under the key (low).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR3-1 fixed and re-reviewed)

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-246-CR2-1: a wildcard alias proposed as a bare prefix (BUG-3) | medium | ✅ FIXED | `@ui/*` → `null`, with evidence naming the alias; test "detect proposes only an exact tsconfig alias…". BUG-3 closed |
| TASK-246-CR2-2: `False` does not decline (BUG-4) | medium | ✅ FIXED | `False`/`FALSE`/`"false"` → `declined`; `configure --map false` exits 2. BUG-4 closed |
| TASK-246-CR2-3: a block-list path key crashes `detect` (BUG-5) | medium | ⚠️ PARTIAL | `detect` → `partial`; `configure` needs `--barrel` and replaces the list. A blank line or comment before the list defeats the removal (CR3-1). BUG-5 reopened |
| TASK-246-CR2-4: a BOM hides `ui:` | low | ✅ FIXED | BOM, single-quoted and double-quoted keys each → `partial` → `ok` → `configured` |
| TASK-246-CR2-5: the indent taken from a comment (BUG-2) | low | ✅ FIXED | fill and insert both `ok` after a deeper first comment. BUG-2 closed |
| TASK-246-CR2-6: NEL in the shared terminator set | low | ✅ FIXED | `record --label "Save<NEL>now"` → `ok`; `configure` still refuses NEL |

---

## New Findings This Cycle

- **[medium]** `shared/resources/wireframe-map.js:1450`: when a blank path key is filled, the
  list removal stops at a blank line or a same-indent comment, both of which yaml-subset skips. The
  list is left under the new scalar, and `configure` answers `write-failed` on a valid file. →
  Skip blank and comment lines while removing; stop at the first line that is neither deeper nor a
  same-indent list item. (CR3-1, BUG-5 reopened)
- **[low]** `shared/resources/wireframe-map.js:1443`: the `under` pattern matches a comment
  indented below the blank key, so filling the key deletes the comment. → Remove only list items
  and nested values. (CR3-2)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document status `ready-for-review`; 5/5 phases ticked
- [x] Fix commit `1f6477a9` pushed. The tree outside the work item is clean; only the deferred implementation report is modified
- [x] Open PR #793

### Review Methodology

- Re-review, cycle 3: the scope is the files changed since gate 2's head (`11b1cfd2..HEAD`). `SAFETY_REPROBE=false`: gate 2's security axis passed.
- Diff scope: 4 files, a 533-line patch. The bundled copies and `docs/tasks` were left out; `bundle:check` is clean.
- Independent Explore reviewer, read-only, given the shared prompt verbatim. Measured: 119,600 ms (completion `duration_ms`). It returned 2 findings. The `line_text` of both matches the file.
- Code-review blocking: on (`code_review_blocking=true`). CR3-1 is high-confidence and is promoted. CR3-2 had medium reviewer confidence; QA reproduced it and entered it as a QA-verified low finding.
- CI on 1f6477a9b51f: pending (`qa-ci-read.sh`, read twice; nothing enters the gate). The qa-fix fast gate on the same tree ran 6889 tests with 0 failures.
- Step 4b: the only changed executable prose is one table row in `wireframe-component-mapping.md`, which has no fenced block. Nothing to execute.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: decline, `detect`, `configure` | CONCERNS | 32 tests pass | CR3-1, CR3-2 |
| Phase 2: catalogue candidates | PASS | 4 tests pass | unchanged |
| Phase 3: setup offer in create-story / create-task | PASS | hooks pass | unchanged |
| Phase 4: hand-written rows guide | PASS | links ok | the `usage` row names a decline `--map` |
| Phase 5: bundle, changelog, gate | PASS | `ci:fast` 6889 / 0 fail | the CHANGELOG names the cycle 2 fixes |

**Overall Phase Completion**: 4/5 phases pass; Phase 1 carries one medium finding.

---

## Success Criteria Verification

### Functional

| Criterion | Evidence | Status |
| --- | --- | --- |
| `resolve`, `ensure`, `record` answer `declined` and write nothing | decline test, seven spellings | PASS |
| `detect` with no `ui:` → `unset` with a proposal | tests; the wildcard case gives `null` | PASS |
| `detect` writes no file in any state | test; the block-list case no longer throws | PASS |
| `configure` appends a block and refuses `exists` | tests | PASS |
| `configure --decline` → `declined` | test | PASS |
| Partial block → `configure` inserts the missing keys → `configured` | tests (BOM, quoted key, comment indent) | **CONCERNS**: a blank line or comment before a list under a blank key (CR3-1) |
| Catalogue candidates on an empty map, with `source` | tests | PASS |
| create-* step 3 runs `detect` and branches on four states | hooks test | PASS |
| No develop step calls `detect`/`configure` | hooks test | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Changed suites | all pass | 138/138 | PASS |
| `npm run ci:fast` (symlinks aside), on `1f6477a9` | green | 6889 tests, 0 fail, 14 skipped (qa-fix gate run) | PASS |
| `bundle:check` | clean | 128 skills, 0 problems | PASS |
| `npm run validate` create-story, create-task | pass | ✓ ✓ | PASS |
| Every new branch tested | yes | the list removal has no blank-line or comment case | CONCERNS |

---

## Breaking Changes Validation

### Breaking Change 1: `false` and `off` decline
Documented: Yes · Migration Path Provided: Yes · Consumer Code Updated: N/A.
Notes: the any-case claim now holds for both words.

### Breaking Change 2: candidates carry `source`
Documented: Yes · Migration Path Provided: Yes · Consumer Code Updated: Yes (the procedure).

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the list under a blank key survives a blank line or comment**
- **Severity**: MEDIUM · **Category**: Reliability
- **Bug Report**: [task.246.bug.5.block-list-path-key-crashes-detect.md](./task.246.bug.5.block-list-path-key-crashes-detect.md) (reopened)
- **Observation**: `ui:` / `  componentBarrel:` / *(blank)* / `    - src/x.ts` / `  componentCatalogue: c.md` → `configure --barrel b.ts --map m.md` answers `write-failed`, and the file is restored. The same happens with `  # note` in place of the blank line.
- **Impact**: setup cannot complete on a valid layout. Nothing is corrupted.

### LOW Severity Issues (1)

- CR3-2: filling `componentBarrel:` deletes `    # set me later` beneath it.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
The blank-key loop rescans the block once per blank key, at most six keys.

### Reliability — CONCERNS
CR3-1 leaves setup unable to complete on a valid layout. `configure` restores the file, so nothing
is corrupted.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 17 (record `totals.executed`); escaped 0
- `boundary: true`. The `configure --map` value guard changed this cycle (the decline refusal and `YAML_LINE_BREAK`), so the cycle 2 cases were re-run with the `cli:` form.
  - Cases: [task.246.qa.2.configure-value-cases.json](./task.246.qa.2.configure-value-cases.json).
  - Record: [task.246.qa.3.security.run.json](./task.246.qa.3.security.run.json).
  - Result: all 10 hostile cases refused; all 7 legitimate cases accepted; verdict `engages`.
  - Map paths are still not checked for containment. This is pre-existing and recorded as a future item.

### Maintainability — PASS
`detect`, `configure` and `readUiConfig` now share one presence rule, one decline rule and one `ui:`
line pattern.

---

## Code Review

Independent Explore reviewer over the 533-line scoped patch. Provenance: both findings are in the
cycle 2 list-removal code (`under`, and the `while` loop in `configure`), so neither is pre-existing.

**Correctness bugs (2):**
- [medium/high] `shared/resources/wireframe-map.js:1450`: the list removal stops at a blank line or comment. Promoted as TASK-246-CR3-1.
- [low/medium] `shared/resources/wireframe-map.js:1443`: `under` matches comment lines. QA reproduced it and entered it as TASK-246-CR3-2.

**Cleanups (0).**

QA reproductions (scratch projects, against the committed engine):

| Finding | Input | Result |
| --- | --- | --- |
| CR3-1 | `componentBarrel:` / blank / `    - src/x.ts` / `componentCatalogue` / `other` | `detect` → `partial`; `configure` → `write-failed`, file restored |
| CR3-1 | the same with `  # note` in place of the blank | `write-failed`, file restored |
| CR3-2 | `componentBarrel:` / `    # set me later` / `componentCatalogue` | `ok`; the comment is gone |

The cycle 2 reproductions (`qa2-repro.cjs`) all give the fixed result. The 10 qa-fix mutation
proofs for the cycle 2 fixes are recorded in the implementation report.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Hook skills (create-*, develop-*, qa-*, review-*) | `wireframe-mapping-hooks.test.mjs` passes |
| Skill protocol | `tests/skill-protocol.test.js` passes |
| Full fast gate on `1f6477a9` | 6889 / 0 fail |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/wireframe-map.test.mjs evals/shared/tests/wireframe-mapping-hooks.test.mjs tests/skill-protocol.test.js
python3 skills/create-skill/scripts/quick_validate.py skills/create-story
python3 skills/create-skill/scripts/quick_validate.py skills/create-task
npm run bundle:check
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'cli:shared/resources/wireframe-map.js' --name 'configure --map' --argv '[…]' --cases-file task.246.qa.2.configure-value-cases.json --record task.246.qa.3.security.run.json --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 793
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR3-1 (BUG-5 reopened).

### Short-term Actions (Non-Blocking)
1. CR3-2, in the same fix: it is the same loop.
2. Path containment for map and catalogue paths. This is pre-existing and needs its own task.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium finding, no high finding, and reliability CONCERNS.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR3-1 fixed and re-reviewed.

---

**Next Steps**: qa-fix cycle 3, then QA cycle 4 (scoped to the files changed since `1f6477a9`).
