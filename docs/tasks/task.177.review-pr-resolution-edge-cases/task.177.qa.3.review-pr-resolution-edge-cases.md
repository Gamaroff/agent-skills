# QA Report: Task 177 - /review-pr resolution edge cases (cycle 3)

**Task**: [Link to task document](./task.177.review-pr-resolution-edge-cases.md)
**Gate File**: [task.177.gate.3.review-pr-resolution-edge-cases.yml](./task.177.gate.3.review-pr-resolution-edge-cases.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: PASS

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| -------------- | ------ | -------- |
| CR2-1 user-namespaced branches read as targets | FIXED | `jane.doe/fix/issues/123`, `user.name/wip/pull/3`, `jane.doe/fix/issues/42-login-crash` stay branches (bash, zsh); guess restored → 16 red |
| CR2-2 known-host match keeps the port | FIXED | `acme.atlassian.net:443/…?selectedIssue=AB-2` → jira AB-2; port strip removed → 2 red |
| CR2-3, CR2-5 prose (advisory) | FIXED | SKILL.md wording |

## New Findings This Cycle

- **[low/high, pre-existing]** `skills/review-pr/SKILL.md:146` — CR3-1: `JIRA_URL= # prod` yields `# prod`
  and warns "differs" rather than "not set". Base produces the same `# prod` (measured), so per the
  provenance rule it is routed to `recommendations.future`, not `top_issues`.
- **[cleanup]** `review-pr.test.js:880` — CR3-2: three test comments cite rules cycle 2 removed.
- **[cleanup]** CR3-3: §0a's KEY_FIELD contract does not list `pr_number` (shared source).
- **[cleanup]** `review-pr.test.js:383` — CR3-4: the "hands over to §0a" test checks only the guard.

---

## Executive Summary

The cycle-2 narrowing holds. Only a known platform host in the first segment is re-parsed, and every
branch shape QA has used across three cycles stays a branch. No finding this cycle is new to the
change and blocking.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

### Review Methodology

Re-review, cycle 3. Re-review scope: files changed since gate 2 (head a9820e67c4f7; 9 files) — default.
Reviewer: independent Explore subagent over the branch diff of the four code/doc files in that set;
dispatched 06:59:51 UTC, returned after 230.8 s (`duration_ms`). `SAFETY_REPROBE=false` (gate 2
security PASS, measured). Step 4b: 16 blocks, 1 runnable (bash = zsh), 15 refused as mutating, 0 findings.

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --------- | ------ | ----- |
| Commented `.env` on the same host: no warning | PASS | quoted, unquoted, space after `=` |
| No `docs/`: continues past rung 1; §0a still halts directly | PASS | |
| Scheme-less platform URLs parse; real branches stay branches | PASS | 3 task forms + port + case; 13 branch shapes |
| Rung 2 never returns an artifact | PASS | |
| No extra network call for a PR target | PASS | |
| Tests green; mutation check | PASS | 247/247; all fixes mutation-proven |
| shellcheck, bundle:check, full suite | PASS | fast gate 5194 pass, 0 fail at d57ae1aa |

---

## NFR Assessment

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 44 (`task.177.qa.3.security.run.json` `totals.executed`)
- 22 contract cases × bash/zsh: engages. The first run reproduced 2 on the cycle-1 lookalike case
  (`github.com.evil.com/o/r/pull/3`), whose expectation was a reported foreign host. It is now a plain
  branch, which is stricter. The expectation was corrected; no code changed.

### Performance — PASS · Reliability — PASS · Maintainability — PASS

---

## Code Review

**Correctness bugs (1):** CR3-1 [low/high] — pre-existing (base output identical: `# prod` for both
`JIRA_URL= # prod` and `JIRA_URL=   # set me`); routed to `recommendations.future`.

**Cleanups (3):** CR3-2, CR3-3, CR3-4 — see above; advisory.

**Boundary:** `boundary: true` — probed (above).

**Mutation proofs (this cycle's fixes, against the committed state):**

- mutation-proven: dotted-host guess restored → 16 parser cases red (bash, zsh) → covered
- mutation-proven: port not stripped before the known-host match → 2 red → covered
- mutation-proven: no case fold → 2 red → covered

---

## Test Commands Executed

```bash
command node --test skills/review-pr/tests/review-pr.test.js   # 247/247
npm run ci:fast                                                 # 5194 pass, 0 fail (5b, cycle 2)
npm run validate -- skills/review-pr/                           # ✓
shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh  # clean
```

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Next Steps**: Step 5c — `/review-pr`.
