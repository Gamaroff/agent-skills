# QA Report: Task 246 - Wireframe mapping setup offer and first-run candidates

**Task**: [task.246.wireframe-mapping-setup-offer.md](./task.246.wireframe-mapping-setup-offer.md)
**Gate File**: [task.246.gate.2.wireframe-mapping-setup-offer.yml](./task.246.gate.2.wireframe-mapping-setup-offer.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: CONCERNS
**QA Cycle**: 2 (re-review of `11b1cfd2`)

---

## Executive Summary

Cycle 1's five findings are fixed. Its two optional items (CR-3, CR-4) are fixed too. The
`configure` value guard now behaves correctly on all 17 security probe cases. The cycle 2 refute
pass read the whole branch again and found six new correctness bugs in `detect` and `configure`. QA
reproduced all six. Three are medium:

- a wildcard tsconfig alias is proposed as a bare prefix;
- `False` is not a decline;
- a block list under a path key crashes `detect`.

Two of the three low findings were introduced by cycle 1's own fixes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR2-1, CR2-2 and CR2-3 fixed and re-reviewed)

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-246-CR-1: tsconfig comment strip eats `/*` and `**` (BUG-1) | medium | ✅ FIXED | `stripJsonc`; test "detect reads tsconfig.json as JSONC…" passes; QA mutation (string copy disabled) turns it red. BUG-1 closed |
| TASK-246-CR-2: a blank `ui:` key; `detect` and `configure` disagree (BUG-2) | medium | ⚠️ PARTIAL | the five blank-key cases and `--decline` pass. A blank key under a deeper first comment is still not found (CR2-5). BUG-2 reopened |
| TASK-246-PROBE-1: NEL accepted in a `configure` value | low | ✅ FIXED | probe case `configure.nel` refused. The fix widened the shared constant (CR2-6) |
| TASK-246-PROBE-2: `"` refused as write-failed | low | ✅ FIXED | probe cases `double-quote`, `backslash`, `tab` and `unit-separator` are refused as usage errors; `astral` and `unicode` are accepted |
| TASK-246-QA-1: PR body omits the breaking changes | low | ✅ FIXED | PR #793 body lists both, with their migrations |
| Advisory CR-3: blank `--map` read as write-failed | — | ✅ FIXED | test "CLI: configure needs a non-blank --map…" |
| Advisory CR-4: configure flags accepted by other commands | — | ✅ FIXED | same test, three commands |

---

## New Findings This Cycle

- **[medium]** `shared/resources/wireframe-map.js:1135`: `importOf` proposes `@ui` for
  `"@ui/*": ["src/components/*"]`, a module name TypeScript does not resolve. The cycle 1 JSONC
  test pins this value. → Propose exact aliases only; a wildcard-only match gives `null` with
  evidence. (CR2-1, BUG-3)
- **[medium]** `shared/resources/wireframe-map.js:154`: `False`, `FALSE` and `"false"` read as a
  map path (`detect` → `configured`), and `configure --map false` writes `false` as the path. →
  Decline on trimmed lowercase `false`/`off`, and refuse such a `--map`. (CR2-2, BUG-4)
- **[medium]** `shared/resources/wireframe-map.js:1026`: `componentBarrel:` with a block list makes
  `detect` throw a `TypeError`, and `configure` answers `ok` over it. → Use one presence predicate
  that matches `readUiConfig`. (CR2-3, BUG-5)
- **[low]** `shared/resources/wireframe-map.js:995`: a BOM before `ui:` gives `detect` → `unset`
  and `configure` → `write-failed` on every run. → Strip U+FEFF before the key test. (CR2-4)
- **[low]** `shared/resources/wireframe-map.js:1406`: an indented comment as the block's first line
  sets the indent. A blank key is then not found (false `exists`), and inserted keys nest under the
  previous key (`write-failed`). → Take the indent from the first key line. (CR2-5)
- **[low]** `shared/resources/wireframe-map.js:410`: NEL in the shared `LINE_TERMINATOR` makes
  `record --label` refuse a value the map stores. → Use a configure-only constant. (CR2-6)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document status `ready-for-review`; 5/5 phases ticked
- [x] Fix commit `11b1cfd2` pushed; the tree outside the work item is clean (only the deferred implementation report is modified, inside the work item)
- [x] Open PR #793

### Review Methodology

- Re-review, cycle 2: `PRIOR_GATES=1`, so the scope is the whole branch (`origin/develop...HEAD`) and `REFUTE_PASS=true`.
- `SAFETY_REPROBE=false`: gate 1's security axis passed, and no Success Criterion is a safety claim.
- Diff scope: 9 files, a 2,243-line patch. The 16 bundled copies were left out; `bundle:check` (rc 0) shows they match their sources. The `docs/tasks` records were left out too.
- Independent Explore reviewer, read-only, given the shared prompt verbatim plus the refute directive. Measured: 270,985 ms (completion `duration_ms`). It returned 6 findings, and `finding-anchors` gave `ok` for all 6.
- Code-review blocking: on (the pipeline run-level `code_review_blocking=true`). CR2-1 to CR2-4 are high-confidence and promoted. CR2-5 and CR2-6 had medium reviewer confidence; QA reproduced both and entered them as QA-verified low findings.
- CI on 11b1cfd2900b: green (`qa-ci-read.sh`, read once; nothing enters the gate).
- Step 4b: run (runnable prose changed); results below.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: decline, `detect`, `configure` | CONCERNS | 26 tests pass | CR2-1 to CR2-6 |
| Phase 2: catalogue candidates | PASS | 4 tests pass | unchanged since cycle 1 |
| Phase 3: setup offer in create-story / create-task | PASS | hooks 24/24 | unchanged |
| Phase 4: hand-written rows guide | PASS | links ok | the procedure gained a `usage` row in the reason table |
| Phase 5: bundle, changelog, gate | PASS | `ci:fast` 6883 / 0 fail | the CHANGELOG entry names the fixes |

**Overall Phase Completion**: 4/5 phases pass; Phase 1 carries three medium findings.

---

## Success Criteria Verification

### Functional

| Criterion | Evidence | Status |
| --- | --- | --- |
| `resolve`, `ensure`, `record` answer `declined` and write nothing | test "a decline (false, off, OFF)…" | **CONCERNS**: `False`/`FALSE`/`"false"` do not decline (CR2-2) |
| `detect` with no `ui:` → `unset` with a proposal | test "detect proposes a src/components barrel…" | PASS. The proposed import for a wildcard alias is wrong (CR2-1) |
| `detect` writes no file in any state | test "detect writes nothing, in any state" | **CONCERNS**: it throws on a block-list barrel (CR2-3) |
| `configure` appends a block and refuses `exists` | tests "configure appends…", "configure refuses exists…" | PASS |
| `configure --decline` → `declined` | test "configure --decline round-trips…" | PASS |
| Partial block → `configure` inserts the missing keys → `configured` | tests "configure inserts only the missing keys…", "configure fills a key written with no value…" | **CONCERNS**: fails with a BOM (CR2-4) or a deeper first comment (CR2-5) |
| Catalogue candidates on an empty map, with `source` | tests "resolve offers catalogue candidates…" | PASS |
| create-* step 3 runs `detect` and branches on four states | hooks test | PASS |
| No develop step calls `detect`/`configure` | hooks test | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Changed suites | all pass | 132/132 | PASS |
| `npm run ci:fast` (symlinks aside), on `11b1cfd2` | green | 6883 tests, 0 fail, 14 skipped (qa-fix gate run) | PASS |
| `bundle:check` | clean | rc 0 | PASS |
| `npm run validate` create-story, create-task | pass | ✓ ✓ | PASS |
| Every new branch tested | yes | CR2-1 to CR2-6 are untested input shapes | CONCERNS |

---

## Breaking Changes Validation

### Breaking Change 1: `false` and `off` decline
Documented: Yes · Migration Path Provided: Yes · Consumer Code Updated: N/A.
Notes: the any-case claim holds for `off` only (CR2-2). The migration text is still correct.

### Breaking Change 2: candidates carry `source`
Documented: Yes · Migration Path Provided: Yes · Consumer Code Updated: Yes (the procedure).

**Overall Breaking Changes Assessment**: CONCERNS (CR2-2). The PR body now lists both changes.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (3)

**Issue: a wildcard alias is proposed as a bare prefix**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.246.bug.3.wildcard-alias-proposes-bare-prefix.md](./task.246.bug.3.wildcard-alias-proposes-bare-prefix.md)
- **Observation**: `"@ui/*": ["src/components/*"]` → `componentImport: @ui`.
- **Impact**: a setup that is accepted carries an import module no code can use.

**Issue: `False` does not decline**
- **Severity**: MEDIUM · **Category**: Functional
- **Bug Report**: [task.246.bug.4.decline-false-not-case-folded.md](./task.246.bug.4.decline-false-not-case-folded.md)
- **Observation**: `wireframeMap: False` → `detect` returns `configured`, and `ensure` creates a file named `False`.

**Issue: a block list under a path key crashes `detect`**
- **Severity**: MEDIUM · **Category**: Reliability
- **Bug Report**: [task.246.bug.5.block-list-path-key-crashes-detect.md](./task.246.bug.5.block-list-path-key-crashes-detect.md)
- **Observation**: `detect` throws `TypeError … Received null`, and `configure` answers `ok`.

### LOW Severity Issues (3)

- CR2-4: a BOM hides `ui:`, so setup never completes.
- CR2-5: the indent is taken from a comment line. This fails the fill and the insert.
- CR2-6: NEL in the shared terminator set makes `record --label` refuse it.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 3

---

## NFR Assessment

### Performance — PASS
`stripJsonc` is a single linear pass, and `detect` still reads only its bounded set.

### Reliability — CONCERNS
CR2-3 is an uncaught throw. CR2-4 and CR2-5 each leave setup unable to complete. `configure` still
restores the file every time, so no file is corrupted.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 17 (record `totals.executed`); escaped 0
- `boundary: true`. The `configure --map` value guard ran with the `cli:` form.
  - Cases: [task.246.qa.2.configure-value-cases.json](./task.246.qa.2.configure-value-cases.json).
  - Record: [task.246.qa.2.security.run.json](./task.246.qa.2.security.run.json).
  - Result: all 10 hostile cases refused; all 7 legitimate cases accepted, including accented and astral characters; verdict `engages`.
  - Command: `command node .agents/skills/qa-task/references/security-probe.mjs --entry 'cli:shared/resources/wireframe-map.js' --name 'configure --map' --argv '[…]' --cases-file <cases> --repo-root <root> --record <record> --json`.
  - A lone surrogate and NUL cannot pass through argv, so the unit test covers those two.
  - Map paths are still not checked for containment. This is pre-existing and recorded as a future item.

### Maintainability — PASS
CR2-2 and CR2-3 are both two definitions of one thing. A single decline predicate and a single
presence predicate would remove them.

---

## Code Review

Independent Explore reviewer, refute pass over the 2,243-line whole-branch patch. Every
`anchor_check` is `ok`. Provenance: all six are in code this branch adds (`importOf`, `isDecline`,
`presentKeys`, `UI_KEY`, `configure`, and the cycle 1 `LINE_TERMINATOR` change), so none is
pre-existing.

**Correctness bugs (6):**
- [medium/high] `shared/resources/wireframe-map.js:1135`: the wildcard alias is proposed as a bare prefix. Promoted as TASK-246-CR2-1.
- [medium/high] `shared/resources/wireframe-map.js:154`: only `off` is case-folded. Promoted as TASK-246-CR2-2.
- [medium/high] `shared/resources/wireframe-map.js:1026`: `presentKeys` counts a list for a string key. Promoted as TASK-246-CR2-3.
- [low/high] `shared/resources/wireframe-map.js:995`: a BOM hides `ui:`. Promoted as TASK-246-CR2-4.
- [low/medium] `shared/resources/wireframe-map.js:1406`: the indent is taken from a comment. QA reproduced it and entered it as TASK-246-CR2-5.
- [low/medium] `shared/resources/wireframe-map.js:410`: NEL is in the shared terminator set. QA reproduced it and entered it as TASK-246-CR2-6.

**Cleanups (0).**

QA reproductions (scratch projects, `qa2-repro.cjs` against the committed engine):

| Finding | Input | Result |
| --- | --- | --- |
| CR2-1 | `"@ui/*": ["src/components/*"]` | `{"value":"@ui"}`. The reviewer's `"@/*"` variant gives `null`, so it is not reproduced |
| CR2-2 | `wireframeMap: False` / `FALSE` / `"false"` / `Off` | `configured` ×3 / `declined`; `configure --map false` → `ok` |
| CR2-3 | `componentBarrel:` + `- src/components/index.ts` | `detect` throws `TypeError`; `configure` → `ok` |
| CR2-4 | BOM + `ui:` | `detect` → `unset`; `configure` → `write-failed` |
| CR2-5 | `ui:` / `    # note` / … | fill: `exists` (key `wireframeMap`); insert: `write-failed`, file restored |
| CR2-6 | `record --label "Save<NEL>now"` | exit 2, `--label must be one line` |

mutation-proven: `stripJsonc` string copy disabled → "detect reads tsconfig.json as JSONC…" → covered
(snapshot `cp`-restored; `git status` clean after). The nine qa-fix proofs for cycle 1's fixes are
recorded in the implementation report. This one spot check agrees with them.

**Step 4b (runnable prose):**
- `shared/resources/wireframe-component-mapping.md`: 1 changed block, 0 executed (`mutating`: it runs `configure`, which writes). The finding is `changed-blocks-not-executed`. The engine behind the block is covered by the probe and the unit tests.
- `skills/create-story/SKILL.md`: 0 changed blocks. At file level the result is `zero-blocks-executed`, on unchanged blocks, as in cycle 1.
- `skills/create-task/SKILL.md`: 0 changed blocks, and no findings.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Hook skills (create-*, develop-*, qa-*, review-*) | `wireframe-mapping-hooks.test.mjs` passes |
| Skill protocol | `tests/skill-protocol.test.js` passes |
| Full fast gate on `11b1cfd2` | 6883 / 0 fail |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/wireframe-map.test.mjs evals/shared/tests/wireframe-mapping-hooks.test.mjs tests/skill-protocol.test.js
python3 skills/create-skill/scripts/quick_validate.py skills/create-story
python3 skills/create-skill/scripts/quick_validate.py skills/create-task
npm run bundle:check
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'cli:shared/resources/wireframe-map.js' --name 'configure --map' --argv '[…]' --cases-file task.246.qa.2.configure-value-cases.json --record task.246.qa.2.security.run.json --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed-file> --diff-base <merge-base> --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 793
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR2-1, CR2-2, CR2-3 (BUG-3, BUG-4, BUG-5).

### Short-term Actions (Non-Blocking)
1. CR2-4, CR2-5 (BUG-2 reopened) and CR2-6, in the same fix cycle. Each is a one-predicate change.
2. Path containment for map and catalogue paths. This is pre-existing and needs its own task.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the gate has three medium findings, no high finding, and reliability CONCERNS.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR2-1, CR2-2 and CR2-3 fixed and re-reviewed.

---

**Next Steps**: qa-fix cycle 2, then QA cycle 3 (scoped to the files changed since `11b1cfd2`).
