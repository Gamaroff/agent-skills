# QA Report: Task 177 - /review-pr resolution edge cases (cycle 2)

**Task**: [Link to task document](./task.177.review-pr-resolution-edge-cases.md)
**Gate File**: [task.177.gate.2.review-pr-resolution-edge-cases.yml](./task.177.gate.2.review-pr-resolution-edge-cases.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate 1 finding | Status | Evidence |
| -------------- | ------ | -------- |
| CR-1 `.env` leading space | FIXED | Step 0b tests with `JIRA_URL= …` (bash, zsh); revert → 2 red |
| CR-3 version-shaped first segment | FIXED | `v2.0/browse/x`, `5.x/fix/issues/12`, `v1.2/x/pull/3` stay branches; revert → 6 red |
| CR-2 `*.atlassian.net/*` crosses `/` | FIXED | `feature/foo.atlassian.net/x` stays a branch; revert → red |
| CR-5 docs guard output (advisory) | FIXED | inherited `DOC_FILE` no longer printed; revert → 2 red |

## New Findings This Cycle

- **[medium]** `skills/review-pr/scripts/parse-target.sh:194` — CR2-1: user-namespaced branches
  (`jane.doe/fix/issues/123`, `user.name/wip/pull/3`) parse as issue / PR targets, and
  `jane.doe/fix/issues/42-login-crash` is refused. All were branches on base → restrict the
  scheme-less arm to known platform hosts.
- **[low]** `skills/review-pr/scripts/parse-target.sh:187` — CR2-2: known-host match keeps the port
  → match the port-stripped host.
- **[low, advisory]** `skills/review-pr/SKILL.md:263` — CR2-3: the guard tests `$ROOT/docs`, §0a a
  cwd-relative `docs`. From a subdirectory §0a then HALTs with its documented "run from the repository
  root" message; the guard's purpose (a repository with no `docs/`) is unaffected.
- **[low, advisory]** `skills/review-pr/SKILL.md:142` — CR2-5: comment says quoted values are trimmed;
  `-e t` skips the trim, so they are taken verbatim.
- **[low/low, advisory]** CR2-4: repeat of cycle 1's CR-4. No corpus case.

---

## Executive Summary

The refute pass confirms every cycle-1 fix and finds the remaining weakness in the same mechanism. Any
host heuristic for a scheme-less target will collide with a branch-naming convention somewhere:
versions in cycle 1, `first.last/` user namespaces now. The task's success criteria name only the
three platform forms.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR2-1 fixed)

### Review Methodology

Re-review, cycle 2: **refute pass** over the whole branch diff (`origin/develop...HEAD`, skills/ +
CHANGELOG), per qa-task Step 3b. `SAFETY_REPROBE=false` (gate 1 security PASS, measured).
Re-review scope: unscoped — cycle 2 refute pass (whole branch diff).
Reviewer dispatched 06:45:37 UTC; returned after 192.1 s (`duration_ms`).
Step 4b re-run: 16 blocks, 1 runnable (bash = zsh), 15 refused as mutating, 0 findings.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| Commented `.env`: no warning | PASS | incl. a space after `=` |
| No `docs/`: continues past rung 1 | PASS | |
| Scheme-less platform URLs parse; real branches stay branches | CONCERNS | CR2-1 |
| Rung 2 never returns an artifact | PASS | |
| Tests green; mutation check | PASS | 237/237 |

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 36 (`task.177.qa.2.security.run.json` `totals.executed`)
- 18 contract cases × bash/zsh: engages. A first run reproduced 2. The cause was a cycle-1 case
  whose expectation predated the TLD rule: `a.b/c/pull/1;touch …` now stays an inert branch, as on
  base, and no file is created. The case was corrected, and both the `ab.cd` (refused) and `a.b`
  (branch) forms are cases now.

### Performance — PASS · Reliability — PASS · Maintainability — PASS

---

## Code Review

Refute pass, independent Explore reviewer. `code_review_blocking=true`.

**Correctness bugs (4):** CR2-1 [medium/high] → gate; CR2-2 [low/high] → gate; CR2-3 [low/medium]
advisory; CR2-4 [low/low] advisory.

**Cleanups (1):** CR2-5 [low/high] — comment accuracy.

**Provenance (5b):** CR2-1, CR2-2 — base parses every input as a branch → new to this change.

**Boundary:** `boundary: true` — probed (above).

---

## Test Commands Executed

```bash
command node --test skills/review-pr/tests/review-pr.test.js            # 237/237
TMPDIR=/tmp command node --test skills/review-pr/tests/review-pr.test.js # 237/237
npm run validate -- skills/review-pr/                                    # ✓
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100
**Next Steps**: `/qa-fix` — CR2-1 and CR2-2.
