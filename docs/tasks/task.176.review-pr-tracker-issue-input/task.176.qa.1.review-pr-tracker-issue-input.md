# QA Report: Task 176 - /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Task**: [task.176.review-pr-tracker-issue-input.md](./task.176.review-pr-tracker-issue-input.md)
**Gate File**: [task.176.gate.1.review-pr-tracker-issue-input.yml](./task.176.gate.1.review-pr-tracker-issue-input.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #554 at `f3162293`. The parser, Step 0b/1a/1b/2 routing and the shared §0a lookup are
delivered, and 132 tests pass under bash and zsh. The diff review and a hostile-input probe found four
reproducible medium defects and one low, so the gate is CONCERNS and the queue goes to `/qa-fix`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1, CR-2, CR-3, QA-1 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (Phases 0–3 ticked)
- [x] Tests passing
- [x] Breaking changes documented (stricter §0a lookup, CHANGELOG)
- [x] Code on feature branch with open PR (#554)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (hand probe)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only diff-review subagent (Step 3b). Default strategy: 4 phases, two modules,
low risk. The code reviewer ran for 195 s (`duration_ms` 195112 from its completion notice). Traceability
matrix supplied by the pipeline: `.summaries/qa-traceability-matrix.md`. First review, so the scope is the
whole `origin/develop...HEAD` diff, excluding the byte-identical bundled `references/` copies.

Step 4b ran `qa-execute-snippets.mjs` on `skills/review-pr/SKILL.md` and
`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`. It found 17 and 15 blocks. All new
blocks were refused fail-closed as `mutating`: the Step 0b parse block (`git branch`, `bash`), the host
check (`gh`, `norm_host`), the rung-3/4 blocks (`gh`, `curl`, `python3`) and the §0a lookup
(`<unparseable>`). The engine's `zero-blocks-executed` is a configuration note and was resolved like
this:

- The §0a issue-URL block (line 82) ran with `--bind INPUT=…` and exited 0 under bash and zsh.
- The refused new blocks are executed by `review-pr.test.js`, which runs the Step 0b blocks and the §0a
  lookup against fixtures under both shells.
- The changed GitHub-issue extraction `sed` was run by hand under both shells on 5 inputs; all gave
  297.
- Pre-existing placeholder blocks (Step 3 `DOC_FILE`, step-0 `EPIC_REF`/`EPIC_NUM`) are outside the
  change set and were not run.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Verify calls | PASS | Verified | Findings in the plan file; rung-3/4 GitHub queries re-run live during develop |
| Phase 1: Parser | CONCERNS | Verified | 19 forms × 2 shells green; QA-1 newline forgery, CR-8 owner/repo named `issues`/`pull` |
| Phase 2: Resolution in the skill | CONCERNS | Partial | CR-2, CR-3 cross-block bindings; CR-1 §0a exclusion gap |
| Phase 3: Bundle, docs, changelog | PASS | Verified | `bundle:check` rc 0; CHANGELOG entry present |

**Overall Phase Completion**: 4/4 phases implemented; 2 with findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| New forms parse to documented kind (bash+zsh) and route to rungs | All | All 19 cases × 2 shells green; routing pinned | PASS |
| Each selection outcome stated with a prose pin | 5 outcomes | Pinned | PASS |
| PR-URL host mismatch HALTs; Jira host mismatch warns | Yes | Executed under both shells; but CR-3: the host-check block run alone passes silently | CONCERNS |
| Old forms parse as before (except `/pull/N/files`) | All | Green | PASS |
| Jira-key input retried as a branch | Pin | Pinned | PASS |
| Key match never auto-resolved | Pin | Pinned | PASS |
| §0a lookup anchored, quote-tolerant, excludes `.request.`; one doc | 1 | 1 on fixture; **2 on the real tree for a finalised item** (CR-1) | CONCERNS |
| No extra network call for a PR target | Gating pin | Pinned | PASS |
| Suites green; mutation check reds named case | Yes | 132/132; 5 mutations red in Step 3 | PASS |
| `bundle:check` and full test run green | Yes | `bundle:check` rc 0; `ci:fast` 5079/0 at Step 3 iter 2 (same code) | PASS |
| Migration: none | — | CHANGELOG states the stricter lookup | PASS |

---

## Breaking Changes Validation

### Breaking Change: §0a lookup no longer matches by prefix
Documented: Yes (task §5, CHANGELOG)
Migration Path Provided: Yes — pass the file path or fix the key
Migration Tested: Yes (fixture: `RAPP-70` → 0 docs)
Consumer Code Updated: N/A
Notes: CR-1 shows a second, **undocumented** behaviour change. Any finalised work item now HALTs as
ambiguous, because `sprint-review-summary.md` carries its key.

**Overall Breaking Changes Assessment:** CONCERNS (until CR-1 is fixed)

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (4)

**CR-1: §0a lookup halts on every finalised work item**
- **Category**: Functional
- **Observation**: `github_issue 185` returns `task.37.…/sprint-review-summary.md` and the task doc. There
  are 125 `sprint-review-summary.md` files under `docs/tasks/`.
- **Recommendation**: Exclude the file by basename in §0a and in review-pr Step 2. Add a fixture sibling.

**CR-2: rung-4 Bitbucket search calls a function from another block**
- **Category**: Reliability
- **Observation**: `bb_pr_search` is defined only in rung 3's fence. In a fresh shell the call fails and
  reads as zero candidates.
- **Recommendation**: Define it in every calling block, and halt on a missing function or a curl
  failure.

**CR-3: Step 0b host check binds none of its inputs**
- **Category**: Reliability / Security
- **Observation**: Run as its own block, `KIND` is empty and every check passes silently. The test
  concatenates both blocks and injects env, which hides this.
- **Recommendation**: Use one block that binds `REMOTE_URL` itself, guard reads with `${NAME:?}`, and test
  it as delivered.

**QA-1: newline in `target` forges parser output**
- **Category**: Security (output integrity)
- **Observation**: `$'RAPP-1\nkind=pr'` prints `kind=jira` then `kind=pr`. Step 0b's last-wins read binds
  `KIND=pr`.
- **Recommendation**: Refuse control characters with a named reason.

### LOW Severity Issues (1)

**CR-8**: `seg_after` takes the first marker, so `github.com/org/issues/issues/5` is refused.

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 1 (plus 5 advisory medium-confidence findings below)

---

## NFR Assessment

### Performance — PASS
Card resolution is gated on `kind=jira|github-issue`.

### Reliability — CONCERNS
CR-2, CR-3 and CR-4 fail silently across fenced-block shells. CR-5 gives an ambiguous key the
not-found value.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (engine)
- `parse-target.sh` is a boundary: it refuses malformed input. No engine entry form reaches a
  one-string script (`shell:` passes a fixture directory), so per `probe-boundary-rule.md` §5.1 it was
  probed by hand with 30 hostile inputs under bash and zsh. These covered `$(…)`, backticks, `;`,
  newline, `..`, userinfo, a lookalike host, a 5,000-char input and leading `-`. No command executed.
  The newline forgery is QA-1. Resolution is read-only.

### Maintainability — PASS
One shared lookup replaces four restated greps.

---

## Code Review

Advisory except where promoted (`code_review_blocking=true`: high-confidence bugs → `top_issues`).

**Correctness bugs (9):**
- [medium/high] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:112` — `sprint-review-summary.md` not excluded → **promoted CR-1**
- [medium/high] `skills/review-pr/SKILL.md:226` — `bb_pr_search` defined in another block → **promoted CR-2**
- [medium/high] `skills/review-pr/SKILL.md:140` — host check binds no inputs → **promoted CR-3**
- [medium/medium] `skills/review-pr/SKILL.md:200` — rung 3 `STEM` and Bitbucket vars unbound; `DOC_FILE` vs `LOCAL_PATH` hand-off (CR-4)
- [medium/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:118` — several matches share `LOCAL_PATH=""` with not-found (CR-5)
- [medium/medium] `skills/review-pr/SKILL.md:139` — SSH host alias / `ssh.github.com` remote HALTs a correct PR URL (CR-6)
- [low/medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:111` — empty `KEY_VALUE` matches blank keys (CR-7)
- [low/high] `skills/review-pr/scripts/parse-target.sh:409` — first-marker match (**promoted CR-8**)
- [low/medium] `skills/review-pr/SKILL.md:141` — PR-URL check compares host only, not owner/repo (CR-9)

**Cleanups (0).**

Provenance (5b): every promoted finding is in code this branch adds. For CR-1, the old `head -1` lookup
never halted, so the ambiguity HALT is new to this change.

**Boundary**: `boundary: true` for `skills/review-pr/scripts/parse-target.sh`. Engine `probes_executed: 0`,
because no entry form fits. The hand probe is recorded above.

**Mutation proofs** (Step 3, recorded in the implementation report; each reverted with a `cp` snapshot):
- mutation-proven: board-URL arm (`selectedIssue` read) → `parser (bash|zsh): …boards/407?selectedIssue=RAPP-702` → covered
- mutation-proven: host-first ordering (atlassian arm removed, issue arm relaxed) → `parser (bash|zsh): …/projects/RAPP/issues/RAPP-702` → covered
- mutation-proven: §0a anchor removed → `§0a lookup (bash|zsh): RAPP-70 does not prefix-match RAPP-702` → covered
- mutation-proven: `.request.` exclusion removed → `§0a lookup (bash|zsh): a quoted key with a .request. sibling…` → covered
- mutation-proven: host-check sed delimiter reverted to `|` → `Step 0b (bash|zsh): a PR URL for another host … HALTs` → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Old `target` forms (bare number, PR URLs, branch) | PASS — parser cases + Step 0b binding test |
| develop-story/task/bug §0a callers | CONCERNS — CR-1 |
| Full suite (`ci:fast`, Step 3 iter 2, same code) | PASS — 5079 pass, 0 fail |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run validate -- skills/review-pr/          # ✓
npm run bundle:check                           # rc 0
shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh   # clean
TMPDIR=/tmp node --test skills/review-pr/tests/review-pr.test.js         # 132 pass
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <SKILL.md | step-0 source> --json
```

### Coverage Report
Not measured — prose skill plus a shell script; coverage is by executed case (parser 19 forms × 2 shells).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1, CR-2, CR-3, QA-1 (medium); CR-8 (low).

### Short-term Actions (Non-Blocking)
1. CR-4, CR-5, CR-7: same silent-binding class as CR-2/CR-3. Fix them alongside.
2. CR-6, CR-9: the host-check edge cases.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings. Four reproducible MEDIUM defects in new code, one of them an undocumented
behaviour change for every finalised work item.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2, CR-3, QA-1 fixed

---

**Next Steps**: `/qa-fix` on gate 1, then re-review.
