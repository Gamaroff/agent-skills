# QA Report: Task 68 — re-review (cycle 2)

**Task**: [task.68.review-code-vcs-branch.md](./task.68.review-code-vcs-branch.md)
**Gate File**: [task.68.gate.2.review-code-vcs-branch.yml](./task.68.gate.2.review-code-vcs-branch.yml)
**Previous Gate**: [task.68.gate.1.review-code-vcs-branch.yml](./task.68.gate.1.review-code-vcs-branch.yml) — CONCERNS, 90/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-01
**PR**: [#294](https://github.com/Gamaroff/agent-skills/pull/294) (OPEN, head `ccbcd2e`)
**Gate Status**: PASS

---

## Re-Review Context

Triggered because gate 1 was CONCERNS with one open issue. Per the Step 3b protocol, **cycle 2 is a full refute pass over the whole branch diff**, not a narrowed one — the files changed since gate 1 are precisely cycle 1's own fixes, and a narrowed pass would read only the repairs and never re-read the original change with what cycle 1 taught.

### Previous issue status

| ID | Severity | Status |
|---|---|---|
| TASK68-001 — shipped test suite fails outside this repository | MEDIUM | ✅ **FIXED** |

---

## Verification of TASK68-001

The fix adds a `readSibling()` helper and makes both cross-skill tests `t.skip(...)` when the sibling is absent. **Both assertions were kept** — deleting them would have been the cheaper, worse fix, since the drift guard between `review-pr` and `review-code` is exactly what stops the two skills disagreeing about the same decision again.

The specific risk in a fix of this shape is that it silently deletes the guard: skip everywhere, suite still green, nobody notices. QA therefore verified all three properties rather than the obvious one.

| Check | Result | What it rules out |
|---|---|---|
| In-repo run | **12 pass, 0 skipped** | The guards did not become skip-everywhere |
| Standalone install (`SKILL.md` + `tests/` alone in a temp dir) | **10 pass, 0 fail, 2 skipped** — was 2 failing | The original ENOENT defect |
| Mutation: reword `review-pr`'s rule with siblings present | **1 red, 0 skipped** | That the surviving assertion is vacuous |

`skills/review-pr/SKILL.md` confirmed unchanged after the mutation was reverted.

**Adversarial reading of the fix itself** (a fix is new code, not the closure of a finding):

- **Error path** — `readSibling` returns `null` only on `ENOENT` and **rethrows everything else**. A bare `try/catch` would have swallowed `EACCES`/`EISDIR` and converted a real fault into a silent skip. Correct, and the more tempting version was the wrong one.
- **The skill's own files are unaffected** — `read()` still throws for `SKILL.md`, which is right: a missing own `SKILL.md` is a genuine failure, not a portability case.
- **Control flow** — `return t.skip(...)` ensures nothing after the guard executes. Confirmed by the standalone run reporting 2 skipped rather than 2 failing.
- **Combination with the original change** — the fix touches only the test file; the original touches `SKILL.md`, `package.json`, `CHANGELOG.md`. The single interaction is the tests asserting on `SKILL.md` content, which did not change in cycle 1.

---

## Refute Pass Over the Original Change

The cycle-2 directive is to find the claim that is **false**, starting with the least-reviewed code. Having cleared the fix, the pass returned to the original change and targeted its highest-risk claim — the one in the same defect class as the bug being fixed:

> *"The Bitbucket arm names a recipe that actually exists."*

This is precisely what the old text got wrong (`mirror /qa-story step 6` named a step that does not exist), so a replacement that named a *file* that does not exist would be the same defect wearing new clothes. Probed:

- `skills/review-code/references/bitbucket-auth.sh` — **present**, and `git ls-tree develop` confirms it was already bundled before this branch. The pointer resolves, and does so independently of this change.
- `skills/finalise/SKILL.md` Step 7 — present, with both a GitHub arm and a Bitbucket arm, asserted by a test that itself fails if the section is renamed.
- The pre-commit `npm run bundle` reported `review-code: in sync`, so the bundled `references/` copies have not drifted from source.

**The refute failed — the claim holds.** Recorded because a refute pass that finds nothing is only worth having if what it attacked is written down.

---

## Success Criteria — Final

All 6 criteria met. Notably:

- **"`skills/review-code/tests/` exists and runs under `npm test`"** — verified in the gate log that the suite *actually ran*, not merely that the glob was added. That distinction matters in this repo: a hand-listed glob is how 232 tests once ran nowhere.
- **"Every fix is mutation-proved"** — 5 reverts by the developer in Phase 2, 1 independent revert by QA in cycle 1, 1 further revert of the *fix* in cycle 2. Every one confirmed to have actually applied before its red was counted.
- **"The sweep's classification is recorded, including hits left alone"** — full table in the implementation report.

---

## NFR Assessment

| NFR | Cycle 1 | Cycle 2 |
|---|---|---|
| Security | PASS | **PASS** — the fix rethrows non-ENOENT errors rather than masking them |
| Performance | PASS | **PASS** |
| Reliability | PASS | **PASS** |
| Maintainability | CONCERNS | **PASS** — TASK68-001 closed |

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite | PASS — 2116 tests, 0 failures |
| Formatting | PASS — prettier clean |
| Standalone portability | PASS — 0 failures (was 2) |
| `review-pr` / `finalise` unchanged | PASS — verified after the mutation revert |
| Bundled `references/` drift | PASS — `npm run bundle` reports review-code in sync |

---

## Issues Found (cycle 2)

**None.** No new findings.

The two LOW observations from cycle 1 stand and are **accepted, not deferred silently**:

1. The Bitbucket arm names `${BB_API}` / `${BB_WORKSPACE}` / `${BB_REPO}` / `${PR_ID}` without deriving them. The `finalise` Step 7 pointer covers it and the referenced auth helper is confirmed present. Recorded as a future recommendation.
2. Step 4b's `zero-blocks-executed` — verified pre-existing against a byte-identical `develop` baseline. Out of scope for this task; worth its own if `review-code`'s snippets should be executable.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The sole MEDIUM is closed and verified in the way that matters. Zero HIGH findings across both cycles, all four NFRs PASS, full suite green, and the refute pass found nothing new.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: `/finalise` — Definition of Done verification.
