# QA Report: Task 248 - QA applies the finalise DoD's rules before finalise does

**Task**: [task.248.qa-applies-finalise-rules.md](./task.248.qa-applies-finalise-rules.md)
**Gate File**: [task.248.gate.3.qa-applies-finalise-rules.yml](./task.248.gate.3.qa-applies-finalise-rules.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-01
**Testing Completed**: 2026-11-01
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [task.248.gate.2.qa-applies-finalise-rules.yml](./task.248.gate.2.qa-applies-finalise-rules.yml), FAIL 40/100.

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T248-QA2-1: 6d reads an unbound `STEM` | ✅ FIXED | 6d binds `STEM` from a placeholder and HALTs on an unsubstituted one; re-proved this cycle: removing the guard turns "6d binds STEM itself" red |
| T248-QA2-2: a co-located bug's review becomes the base | ✅ FIXED | `reviewPrefix` keeps only the document's own reports; test "a co-located bug's review report is the bug's base, never the task's" |
| T248-QA2-3: a symlinked path reads as `new-document` | ✅ FIXED | `repoPath` uses realpath; test "a document path through a symlink reads the same as its real path" |
| T248-QA2-4: the read-back trusts the gate's drift block | ⚠️ PARTIAL | Re-derived when the gate carries a task.248 key; re-proved this cycle (2 tests red with it off). A gate with neither key still skips it: T248-QA3-1 |
| T248-QA2-5: stem refusals run before the opt-in | ✅ FIXED | Test "3 not applicable: a refused stem is not a usage error when enforcement is off"; re-probed with enforcement on (8 cases) |

---

## Executive Summary

Cycle 3 is a scoped re-review of the 31 files changed since gate 2's head. Four of the five cycle-2 findings are fixed outright. The fifth is fixed for any gate that carries a task.248 key, but a gate that leaves both keys out still skips the drift re-derivation: one MEDIUM, T248-QA3-1. CI is green on 080430fd.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools, plus one Explore reviewer over the scoped diff (5,536 lines; the `references/` copies and the QA documents skipped as generated or QA output). Dispatched at 19:44:53Z; returned after 122.9 s (`duration_ms` 122891), with 3 bugs and 1 cleanup.

Re-review scope: files changed since gate 2 (head 1da9f7f025b7; 31 files) — default

CI on 080430fd4a85: green

Step 4b: all changed blocks (finalise 1, qa-task 5, qa-story 5, step-5-6 QA loop 1) refused as `mutating`, because they call `gh` and `node`. Committed tests run them instead: `finalise-publish-boundary.test.mjs` runs 6d as shipped, and `tests/qa-read-back-block.test.js` runs the 12b block in a consumer repository.

---

## New Findings This Cycle

- **[medium]** `shared/resources/qa-read-back.js:248` — the drift re-derivation is gated on keys the gate chooses to write, so a key-less gate reads clean over an amended criterion → re-derive whenever the document has criteria (T248-QA3-1)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| 1: Boundary signal | PASS | |
| 2: Criterion amendments | CONCERNS | T248-QA3-1 |
| 3: CHANGELOG citation | PASS | |
| 4: Quantifier + read-back + qa-fix | PASS | |

---

## Success Criteria Verification

- `boundary_signals: ["never"]`
- `criteria-drift: clean (base: reviewed-blob)`
- `changelog: cites (task 248)`

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0. No bug report file was written, as in cycles 1 and 2; the gate entry carries the reproduction.

Reproduction of T248-QA3-1: the committed test "task.248: a gate with no task.248 key is not asked to re-derive (written before task.248)" builds an amended criterion (`amendedSinceBase`) with a gate that has neither key, and asserts exit 0. The exemption was meant for gates written before task.248, but nothing in the decision tells such a gate from a new one that left the keys out.

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
T248-QA3-1. CR-2 is advisory.
### Security — PASS
- **Evidence**: measured. **Probes executed**: 8 (escaped 0). Run record: `task.248.qa.3.security.run.json`, cases `task.248.qa.3.security.cases.json`. `boundary: true`, `boundary_signals: ["never"]`.
- The cycle-2 case file was not kept, so the cases were rebuilt. Each case now carries a fixture with `changelog.enforce: true`: since T248-QA2-5, the stem checks run only when enforcement is on.
### Maintainability — PASS
CR-4 is advisory.

---

## Code Review

Code-review blocking is on (`code_review_blocking=true`). All four anchors checked `ok`.

**Correctness bugs (3):**
- [medium/high] `shared/resources/qa-read-back.js:248` — re-derivation gated on gate-written keys (→ T248-QA3-1, promoted)
- [low/medium] `shared/resources/changelog-cites.sh:66` — a doc-id.js, node or jq failure reads as a bad stem (exit 2); advisory
- [low/low] `skills/qa-task/SKILL.md:1078` — platform-variance: the `gh pr view` base derivation falls back to `develop` on Bitbucket, at 7 call sites; advisory

**Cleanups (1):**
- `shared/resources/criteria-drift.js:281` — a second `reviewed_blob` parser beside `reportReviewedBlob`; advisory

mutation-proven: read-back drift re-derivation switched off → "a gate that leaves out a criterion the engine reports changed halts" and "an engine that cannot resolve a base is could-not-look" → covered
mutation-proven: 6d's unsubstituted-placeholder guard removed → "6d binds STEM itself: run as shipped" → covered

The other three cycle-2 fixes (T248-QA2-2, -3, -5) were mutation-proved in fix cycle 2, on this same head and in this same session. They were not re-proved here, so for this cycle they count as `dev-only`: 2 of 5 re-proved.

---

## Regression Testing

Full `npm run ci` at 080430fd (fix cycle 2): 6964 pass, 0 fail, 14 skipped (zsh). Hosted CI on 080430fd: green.

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL
**Next Steps**: `/qa-fix` for T248-QA3-1
