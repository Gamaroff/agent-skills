# QA Report: Task 223 - Gap body: refuse an empty section; correct task.222's Deferred Work line

**Task**: [task.223.gap-body-empty-section-and-deferred-line.md](./task.223.gap-body-empty-section-and-deferred-line.md)
**Gate File**: [task.223.gate.1.gap-body-empty-section-and-deferred-line.yml](./task.223.gate.1.gap-body-empty-section-and-deferred-line.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: PASS

---

## Executive Summary

This was the first review of PR #720. It covers the `--body` empty-section guard in
`dod-gap-count.sh`, its tests, the bundled copy and the two record corrections. All 3 phases were
verified and every success criterion holds. The diff reviewer found nothing. The new refusal was
run through the probe engine (11 cases, 0 escapes), and a reverted guard turned both the committed
test and the probe red.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (None)
- [x] Code on feature branch with open PR (#720, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

I used direct tools: a small task with 3 low-risk phases in one module, so no parallel agents ran.

- **Step 3b diff review:** one read-only Explore subagent over the whole branch diff
  (`origin/develop...HEAD`, 8 files). Dispatched 17:33:18Z; it returned in 47.8 s (`duration_ms`
  47788). It returned no findings.
- **Step 3b.3 boundary rule:** fired. The engine ran in `shell-argv:` form and its run record is
  committed.
- **Step 3c:** the mutation proof ran in a scratch worktree, after the reviewer had returned.
- **Step 4b:** not applicable. The change set adds or changes no `SKILL.md` and no
  `shared/resources/*.md`, so it has no runnable prose.

---

## Implementation Verification

| Phase                 | Status | Test Result | Notes                                                                         |
| --------------------- | ------ | ----------- | ----------------------------------------------------------------------------- |
| Phase 1: Test first   | PASS   | Verified    | The new empty-section test covers three empty shapes plus a heading-only control. |
| Phase 2: Fix          | PASS   | Verified    | The guard is in `dod-gap-count.sh` `--body`, the header comment is updated, and the bundled copy matches. |
| Phase 3: Records      | PASS   | Verified    | task.222 line 493 names QA-222-13 and points at `## Deferred Work` (line 518). CHANGELOG has the entry. |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion                                                    | Status | Evidence                                                                                      |
| ------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------- |
| No-lines section: exit 1, empty stdout, `HALT:` "empty"       | PASS   | Test `dod-gap-count.sh --body refuses an empty section…` (`finalise-gaps-path.test.mjs:517`)   |
| Blank-lines-only section refused the same way                | PASS   | Same test (blank-lines shape). Probe cases `body.blank-lines` and `body.whitespace-lines`        |
| Heading-only section prints it with exit 0; count still HALTs | PASS   | Same test (control). Probe case `body.heading-only` accepted                                   |
| Existing `--body` test passes unchanged                      | PASS   | 18/18 in `finalise-gaps-path.test.mjs`                                                         |
| task.222 Deferred Work line corrected                        | PASS   | `task.222.finalise-gaps-path-fixes.md:493` (read)                                              |

**Performance Criteria:**

| Criterion                        | Status | Evidence                                                          |
| -------------------------------- | ------ | ----------------------------------------------------------------- |
| Not applicable (test-free kind)  | PASS   | `dod-gap-count.sh` `--body` branch: one `case` on captured `$OUT` |

**Code Quality Criteria:**

| Criterion                         | Status | Evidence                                                                                           |
| --------------------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| Guard mutation-proven             | PASS   | Re-proven by QA in a scratch worktree (see Code Review)                                             |
| bundle:check 0, shellcheck clean  | PASS   | `npm run bundle:check`: 128 skills, 0 problems. `shellcheck shared/resources/dod-gap-count.sh`: rc 0 |
| `npm test` passes                 | PASS   | Developer's `ci:fast` run: 1 load-sensitive timing failure, which passed when re-run alone. CI `test` job pending at the gate, to be checked at `/finalise` |
| CHANGELOG entry                   | PASS   | `CHANGELOG.md:96`                                                                                 |

---

## Breaking Changes Validation

None. `--body` now refuses an input it used to accept with a malformed output (`S`). Both callers
already halt on a non-zero exit.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS

The fix adds one shell `case` on output already captured, with no new pass over the input.

### Reliability — PASS

The refusal is a `HALT:` on stderr with exit 1, matching the script's other refusals. The callers at
`skills/finalise/SKILL.md:2655` and `:2666` already use `|| exit 1`.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (escaped: 0), copied from `task.223.qa.1.security.run.json` `totals`
- `boundary: true`. The script refuses input by its own header, and this change adds a refusal.
  Entry `shell-argv:shared/resources/dod-gap-count.sh`, argv `["{input}","--body"]`, cases
  `task.223.qa.1.security.cases.json`. The engine returned `hostile-rejected-legitimate-accepted`.
- The 9 hostile cases were 4 empty shapes, CRLF blank lines, a section inside a fence only, no
  section, a command-substitution path (`PWNED` absent) and an unsubstituted placeholder.
- The 2 legitimate cases were a populated section and a heading-only section.
- **Calibration:** with the guard reverted, the engine returned
  `a-hostile-case-passed-a-control-that-rejects-others` for `body.empty-next-heading`,
  `body.empty-eof`, `body.blank-lines` and `body.whitespace-lines`. The probe can see the defect.

### Maintainability — PASS

The header comment states the new refusal, and the bundled copy is regenerated.

---

## Code Review

The opt-in to blocking was resolved as `CR_BLOCKING=true` (run-level `code_review_blocking=true`;
the document sets no flag).

**Correctness bugs (0):** none.

**Cleanups (0):** none.

The reviewer read all 8 files in the 639-line patch. It checked both callers and confirmed that a
populated section's `--body` output is unchanged.

The engine run is boundary `true`, with `probes_executed: 11` and `escaped: 0`.

mutation-proven: `--body` guard → one-line `printf '%s\n' "${OUT#S$'\n'}"` → `[bash] dod-gap-count.sh --body refuses an empty section and prints a heading-only one` → covered

That is one proof of one. The other 17 tests stayed green under the mutation. Only bash ran,
because this host has no zsh; CI runs the zsh variants.

Platform variance: no environment-derived value reaches a validating consumer in this diff.

---

## Regression Testing

| Area                                     | Result | Notes                                     |
| ---------------------------------------- | ------ | ----------------------------------------- |
| `finalise-gaps-path.test.mjs` (count + body) | PASS   | 18/18                                     |
| `npm run validate -- skills/finalise/`   | PASS   | rc 0                                      |
| Prettier on changed Markdown and tests   | PASS   | All files formatted                       |
| CI on PR #720                            | —      | link-check, validate and shellcheck pass. The `test` job was pending |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/dod-gap-count.sh`, `skills/finalise/references/dod-gap-count.sh`
- `shared/resources/tests/finalise-gaps-path.test.mjs`
- `CHANGELOG.md`, `docs/tasks/task.222.finalise-gaps-path-fixes/task.222.finalise-gaps-path-fixes.md`

### Test Commands Executed

```bash
command node --test shared/resources/tests/finalise-gaps-path.test.mjs
npm run -s validate -- skills/finalise/
npm run -s bundle:check
shellcheck shared/resources/dod-gap-count.sh
./node_modules/.bin/prettier --check CHANGELOG.md shared/resources/tests/finalise-gaps-path.test.mjs <task docs>
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'shell-argv:shared/resources/dod-gap-count.sh' \
  --argv '["{input}","--body"]' --cases-file <task-dir>/task.223.qa.1.security.cases.json \
  --name dod-gap-count-body --repo-root <repo> --record <task-dir>/task.223.qa.1.security.run.json --json
```

### Coverage Report

No coverage tooling for shell helpers. Every branch of the changed guard is exercised: the refuse
arm by the empty shapes, the pass arm by the heading-only and populated cases.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

None.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The guard does what the task says. Its test and the probe both catch it when it is reverted, and nothing else changed.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.223.qa.1.gap-body-empty-section-and-deferred-line.md`
**Gate File**: co-located at `task.223.gate.1.gap-body-empty-section-and-deferred-line.yml`
**Next Steps**: 5c `/review-pr`, then `/finalise`
