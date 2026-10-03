# QA Report: Task 177 - /review-pr resolution edge cases

**Task**: [Link to task document](./task.177.review-pr-resolution-edge-cases.md)
**Gate File**: [task.177.gate.1.review-pr-resolution-edge-cases.yml](./task.177.gate.1.review-pr-resolution-edge-cases.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: CONCERNS

---

## Executive Summary

All four edge cases are fixed as the task describes, tested under bash and zsh, and each fix goes red
when reverted. The diff review found one regression in the new `.env` parse (a value with a leading
space keeps its comment and trailing spaces) and two branch shapes the scheme-less arm now misreads as
URLs, one of which (`v2.0/browse/x`) the task's own clarifications said could not happen.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 and CR-3 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (9/9 plan checkboxes)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#557, OPEN)

### Testing Approach

- [x] Automated Testing (unit, integration)
- [x] Regression Testing
- [x] Security Review (probe engine, executed)
- [x] Code Review (independent Explore reviewer)

### Review Methodology

Direct tools, with one independent Explore subagent for the diff review (first review; small task, 3
phases, one module). Reviewer dispatched 06:28:58 UTC; returned after 151.6 s (`duration_ms` from the
completion notice). Step 4b ran: `skills/review-pr/SKILL.md` carries fenced bash blocks.

---

## Implementation Verification

| Phase                                | Status   | Test Result | Notes                                     |
| ------------------------------------ | -------- | ----------- | ----------------------------------------- |
| Phase 1: Parser — scheme-less URLs   | CONCERNS | Verified    | CR-2, CR-3: two branch shapes misread     |
| Phase 2: Skill prose                 | CONCERNS | Verified    | CR-1: `.env` value with a leading space   |
| Phase 3: Bundle, CHANGELOG           | PASS     | Verified    | `bundle:check` green; CHANGELOG entry     |

**Overall Phase Completion**: 3/3 implemented; 2 carry findings.

---

## Success Criteria Verification

| Criterion                                                                        | Status   | Notes                                                                 |
| -------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| Commented `.env` on the same host: no warning (bash, zsh)                        | CONCERNS | Holds for `JIRA_URL="…" # prod`; fails for `JIRA_URL= https://… # prod` (CR-1) |
| No `docs/`: Step 1a continues past rung 1; §0a still halts directly              | PASS     | Docs guard tests (absent from a subdirectory, rung 4 reached); CR2-6 test green |
| Scheme-less URLs parse as `https://` forms; listed branches stay branches       | CONCERNS | Listed cases pass; `v2.0/browse/x`, `5.x/fix/issues/12`, `feature/foo.atlassian.net/x` do not (CR-2, CR-3) |
| Rung 2 never returns an artifact                                                 | PASS     | `.dod.`-only fixture → `none`; live tree 290 → `none`, 554 → `found` |
| No extra network call for a PR target                                            | PASS     | Gating pin test green                                                 |
| `review-pr.test.js` green; mutation check reds each case                         | PASS     | 227/227; QA mutations below                                            |
| shellcheck clean; `bundle:check` and full suite green                            | PASS     | shellcheck clean; bundle green; `ci:fast` 5174/5175 → the 1 is the fixed task.178 link |

---

## Breaking Changes Validation

### Breaking Change: a shared `pr_number` now HALTs at rung 2
Documented: Yes (task § 5)
Migration Path Provided: Yes — resolve the duplicate `pr_number:` by hand
Consumer Code Updated: N/A
Notes: Corpus has 158 files with `pr_number:`; none shared between two work items.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue CR-1: `.env` value with a leading space keeps its comment and trailing spaces**
- **Severity**: MEDIUM
- **Category**: Functional (regression)
- **Observation**: `s/^[[:space:]]+//` sets sed's `t` flag, so the first `-e t` branches to the end
  without trying the comment strip or the trailing trim. Measured on BSD sed:
  `JIRA_URL= https://acme.atlassian.net   ` → new `https://acme.atlassian.net   `, base
  `https://acme.atlassian.net`; `JIRA_URL= https://acme.atlassian.net # prod` → comment kept.
- **Impact**: the false "differs from JIRA_URL" warning this task removes still fires for these
  values, and one value that used to be clean now warns.
- **Recommendation**: reset the flag after the leading trim; add a test with a space after `=`.

**Issue CR-3: version-shaped first segment parsed as a host**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `v2.0/browse/x` → refused `url-no-target` (base: `kind=branch`);
  `5.x/fix/issues/12` → `kind=github-issue` (reviewer, confirmed by the same rule). `*.*/browse/*`
  needs only `host/browse/…`, so the task's claim that every marker needs `host/x/…` is false for it.
- **Impact**: the task's Critical rollback trigger, "a branch target resolving as a URL".
- **Recommendation**: require the first segment's last label to be two or more letters.

### LOW Severity Issues (1)

- **CR-2**: `*.atlassian.net/*` crosses `/`, so `feature/foo.atlassian.net/x` is refused instead of
  staying a branch.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
One `case` statement; no network call.

### Reliability — PASS
Docs guard and rung 2 behave as specified. CR-1 is carried as a functional finding.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 22 (copied from `task.177.qa.1.security.run.json` `totals.executed`)
- `shell-fn:skills/review-pr/scripts/parse-target.sh#parse_target`, 11 scheme-less contract cases ×
  bash/zsh: verdict `engages`, 0 reproduced, 0 overblocked. `$(touch PWNED5).io/a/pull/1` stays inert
  text (no file created). The generic `filename` corpus without contract cases reads `absent` — the
  parser deliberately reports, not judges, a branch name; the same reason the suite's own probe uses
  contract cases. Not a finding.

### Maintainability — PASS
19 new executed tests under bash and zsh.

---

## Code Review

Independent Explore reviewer over the branch diff (`origin/develop...HEAD`, skills/ + CHANGELOG).
`code_review_blocking=true` (pipeline override): `category: bug` + `confidence: high` → `top_issues`.

**Correctness bugs (5):**
- [medium/high] `skills/review-pr/SKILL.md:140` — CR-1 (above) → **promoted to gate**
- [low/high] `skills/review-pr/scripts/parse-target.sh:179` — CR-2 (above) → **promoted to gate**
- [low/medium] `skills/review-pr/scripts/parse-target.sh:181` — CR-3 (above) → **promoted to gate as
  medium by QA**: reproduced under bash and zsh, and it hits the task's Critical rollback trigger
- [low/low] `skills/review-pr/SKILL.md:426` — CR-4: rung 2's §0a filter drops a co-located
  `*.bug.*` report carrying `pr_number`. Not reproduced: no bug report in the corpus carries
  `pr_number:` and no bug skill writes one. Advisory.
- [low/medium] `skills/review-pr/SKILL.md:267` — CR-5: on the `present` branch the docs guard prints
  `DOC_FILE=` from an inherited value. Advisory.

**Cleanups (1):**
- `skills/review-pr/SKILL.md:426` — CR-6: §0a's header and `:?` message list only `jira_key` /
  `github_issue`; `pr_number` is now a third caller field (shared source change).

**Provenance (5b):** CR-1 — base trims `JIRA_URL= https://…   `, branch does not → new. CR-2, CR-3 —
base parses all three as branches → new.

**Boundary rule:** `boundary: true` — `parse_target` accepts or refuses targets. Probed (above).

**Mutation proofs (QA, against the committed state; tree restored, `git status` unchanged):**

- mutation-proven: scheme-less arm removed from `parse-target.sh` → 11 parser/probe tests red → covered
- mutation-proven: `.env` double-quote-pair expression removed → 6 Step 0b tests red → covered
- mutation-proven: docs guard `absent` branch replaced by a HALT → 6 docs-guard tests red → covered

---

## Regression Testing

| Area                                    | Result |
| --------------------------------------- | ------ |
| Every pre-existing parser case          | PASS   |
| Step 0b host checks (task.176 tests)    | PASS   |
| §0a lookup (CR2-6, kind-word, anchors)  | PASS   |
| Full fast gate (`npm run ci:fast`)      | PASS apart from the pre-existing task.178 link, fixed on the branch |

---

## Test Artifacts

### Files Reviewed

- `skills/review-pr/scripts/parse-target.sh`
- `skills/review-pr/SKILL.md`
- `skills/review-pr/tests/review-pr.test.js`
- `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test skills/review-pr/tests/review-pr.test.js            # 227/227
TMPDIR=/tmp command node --test skills/review-pr/tests/review-pr.test.js # 227/227
npm run validate -- skills/review-pr/                                    # ✓
shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh  # clean
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-pr/SKILL.md \
  --bind DOC_FILE=… --copy-as docs:docs --json                           # 1 runnable, bash = zsh, 0 findings
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename \
  --entry 'shell-fn:skills/review-pr/scripts/parse-target.sh#parse_target' --cases-file … --json  # engages, 22
```

Step 4b: 16 blocks; 15 refused as mutating (network or write calls — `gh`, `curl`, redirections), 1
runnable once `DOC_FILE` was bound. The two changed blocks (Step 0b, docs guard) are executed by
`review-pr.test.js` under bash and zsh; the engine classifies the docs guard `unrecognised-command:
<unparseable>`, so the suite is its execution evidence.

---

## Recommendations

### Immediate Actions (Blocking)

1. CR-1 — reset sed's `t` flag after the leading trim; test a space after `=`.
2. CR-3 — require a TLD-shaped last label in the first segment; test `v2.0/browse/x`, `5.x/fix/issues/12`.

### Short-term Actions (Non-Blocking)

1. CR-2 — apply the first-segment rule to `*.atlassian.net`.
2. CR-5, CR-6 — docs-guard output; §0a KEY_FIELD comment.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium findings, both new to this change and both cheap to fix.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-3 fixed

---

**QA Report**: co-located at `task.177.qa.1.review-pr-resolution-edge-cases.md`
**Gate File**: co-located at `task.177.gate.1.review-pr-resolution-edge-cases.yml`
**Next Steps**: `/qa-fix` for CR-1, CR-3 and CR-2, then re-review.
