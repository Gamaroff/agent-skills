# QA Report: Task 142 - Pin the hand-written reference docs to the skills they describe

**Task**: [Link to task document](./task.142.reference-doc-skill-pinning.md)
**Gate File**: [task.142.gate.1.reference-doc-skill-pinning.yml](./task.142.gate.1.reference-doc-skill-pinning.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: PASS

---

## Executive Summary

The new guard does what the task promised: every command, flag and activation-table skill in the two reference pages is checked against `skills/`, each group has a floor, and the one real defect its first run found (`/session-handoff --read`) is fixed. Two low advisory findings from the diff review — a prefix-matching flag check and an unused field — are recorded as follow-ups.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (13/13 plan checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#534, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit fixtures + live-corpus assertions)
- [x] Performance Testing (file run time)
- [x] Regression Testing (full `ci:fast` suite, PR CI)
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools (small task: 3 phases, one module, low risk), plus the Step 3b diff reviewer as one read-only Explore subagent over the whole `origin/develop...HEAD` diff (first review). Traceability matrix supplied by the pipeline (`.summaries/qa-traceability-matrix.md`: 17 criteria — 11 full, 4 partial, 1 unit, 1 none).

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` touched).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :--- | :--- | :--- | :--- |
| Phase 1: The extractors | PASS | Verified | `extractCommandRows` (unescaped-pipe split, last word-start `/name`), `extractActivationSkills` (head-token rule), `NON_SKILL_ROWS` asserted exactly |
| Phase 2: Assertions and floors | PASS | Verified | Three groups; floors ≥ 70 rows, ≥ 16 flags, ≥ 58 activation mentions; messages blame the extractor |
| Phase 3: First run | PASS | Verified | One real finding fixed (`commands.md:143`); header comment names the limits; 10 dev mutations recorded |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| :--- | :--- | :--- | :--- |
| Commands resolve to a skill or `NON_SKILL_ROWS` | all | 76 slash rows resolve; 4 non-skill rows match exactly | PASS |
| Every row `--flag` exists in the skill | all | 20 assertions, 0 failures | PASS |
| Every activation-table skill exists | all | 67 mentions, 0 failures | PASS |
| `/loop /develop-next` → `develop-next` | yes | fixture test | PASS |
| Deleted skill fails the test | mutation | QA re-proved with `skills/develop-batch` moved: 2 tests red | PASS |
| Non-existent flag fails the test | mutation | QA re-proved with `/develop-batch --dry-run --nope`: flag test red | PASS |
| No spawn / network | none | code read: `fs` only | PASS |
| `SKILL.md` reads memoised | yes | `skillMdCache` (code read) | PASS |
| No measurable `npm test` wall-clock change | none | file ~170 ms | PASS |
| `node:test` + `node:assert` only | yes | yes | PASS |
| Three floors with extractor-blaming messages | 3 | 3 | PASS |
| Failure messages carry file, line, token | yes | yes | PASS |
| Header states what is not pinned | yes | yes, names the story→function case | PASS |
| Prettier clean; `npm test` green with symlinks aside | yes | prettier clean; 4712 pass / 0 fail (recorded run) | PASS |
| CHANGELOG `[Unreleased]` records the guard | yes | yes | PASS |
| Obs #159 → `actioned` | post-merge | not yet — correctly unchecked | N/A (post-merge) |
| No consumer-facing change | none | none | PASS |

---

## Breaking Changes Validation

None — one new test file and a one-row doc correction.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **CR-1** (bug, low/medium) — `tests/reference-doc-skill-pinning.test.js:265`: the flag check is `body.includes(flag)`, a bare substring, so a flag a skill never documents passes when `SKILL.md` has a longer flag that starts with it. Reproduced: `"use --read-only here".includes("--read")` → `true`. No row in today's corpus passes only through a prefix. Provenance: new to this change (the file is new).
- **CR-2** (cleanup, low/high) — `tests/reference-doc-skill-pinning.test.js:121`: `extractActivationSkills` returns a `flags` field no corpus assertion reads.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

~170 ms for the file; per-skill memoisation; two document reads.

### Reliability — PASS

Floors and the exact `NON_SKILL_ROWS` equality make a silent extractor failure red.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. Candidates considered: `SKILL_HEAD.test`, `COMMAND_TOKEN`, `extractCommandRows`, `extractActivationSkills`. Each classifies spans of two tracked repository documents so a test can assert on them; none gates an action on external input, so the "a `false` prevents an action" signal is absent.

### Maintainability — PASS

Header comment, fixture tests, one-direction contract stated; CR-2 is a clarity cleanup.

---

## Code Review

Advisory — `code_review_blocking=true` was set, but neither finding is `category: bug` + `confidence: high`, so none entered `top_issues[]`.

**Correctness bugs (1):**

- [low/medium] `tests/reference-doc-skill-pinning.test.js:265` — flag check is a substring match; `--read` passes on `--read-only` → match with a trailing boundary and add a fixture.

**Cleanups (1):**

- `tests/reference-doc-skill-pinning.test.js:121` — unused activation `flags` field → drop it or assert it with a floor.

mutation-proven: `/develop-batch --dry-run` row given `--nope` → "every flag a row advertises is documented by that skill" → covered
mutation-proven: `skills/develop-batch` moved aside → "every row resolves to a skill" + "every named skill exists" → covered

Both on a different skill from the dev's own proofs (`qa-next`); snapshot-and-restore, baseline green between, `git status --porcelain` unchanged afterwards.

---

## Regression Testing

- `npm run ci:fast` (dev run, symlinks aside): 4713 tests, 4712 pass, 0 fail, 1 skipped (pre-existing) — PASS
- PR #534 CI at `45d685d0`: test, link-check, shellcheck, branch policy — all SUCCESS
- `doc-links.js` over `commands.md`: 96 relative links resolve — PASS

---

## Test Artifacts

### Files Reviewed

- `tests/reference-doc-skill-pinning.test.js`
- `docs/reference/commands.md` (row 143)
- `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test tests/reference-doc-skill-pinning.test.js
command node .agents/skills/qa-task/references/doc-links.js --file docs/reference/commands.md
gh pr view 534 --json statusCheckRollup
```

Standards-named validation commands: none apply — no skill, shared resource or `.sh` file changed (`coding-standards.md` § Validation before commit); `npm test` ran.

### Coverage Report

Not measured — the change is itself a test; its extractors are covered by nine fixture tests.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1 — word-boundary flag match plus a prefix fixture.
2. CR-2 — drop or assert the activation `flags` field.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every phase and success criterion verified; no HIGH/MEDIUM finding; all NFRs PASS.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.142.qa.1.reference-doc-skill-pinning.md`
**Gate File**: co-located at `task.142.gate.1.reference-doc-skill-pinning.yml`
**Next Steps**: Step 5c PR conformance review.
