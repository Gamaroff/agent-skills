# QA Report: Task 56 — One CLI for the GitHub issue lifecycle

**Task**: [task.56.tracker-issue-cli.md](./task.56.tracker-issue-cli.md)
**Gate File**: [task.56.gate.1.tracker-issue-cli.yml](./task.56.gate.1.tracker-issue-cli.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-20
**Gate Status**: FAIL

---

## Executive Summary

The CLI at the centre of this task is sound. Its access gate, its stdout discipline and its refusal to
write a placeholder all hold under test, and each is mutation-proven. The defects are almost entirely
in the **rewritten skill prose** — the mechanical half of the work — and three of them are silent:
they make a tracker call vanish while the run reports success, which is the precise failure mode this
whole task sequence exists to eliminate.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED
**Quality Score**: 70/100

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 9 implementation phases marked complete — verified against the diff, not the checkboxes
- [x] Tests passing (1564/1564)
- [x] Breaking changes: none claimed, none found
- [x] Code on `feature/task.56.tracker-issue-cli` with PR #265 OPEN

### Review Methodology

Standard strategy (`risk_level: high`, 9 phases, multi-module). Direct tools for the suite, criteria
and NFRs; one read-only Explore subagent for the Step 3b diff code review, scoped to the 31
non-generated files (`skills/*/references/` and `.claude/` excluded — bundle output would have
inflated the diff ~30×).

`code_review_blocking=true` (pipeline run-level override; the task carries no opt-out), so
high-confidence correctness bugs enter `top_issues` and gate the build.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0. Roster + record schema | PASS | Verified | 23 kinds parse; `github.milestone.create` carries `produces` |
| 1. `tracker-issue.js` | CONCERNS | Verified | Sound core; slug resolution defective under defer (BUG-4) |
| 2. Wrap the 28 bare sites | FAIL | Verified | Two unterminated heredocs, one undefined-variable URL, three missing `mkdir` |
| 3. Blocking banner | PASS | Verified | Present and asserted in both `md` and `summary`; absent when nothing blocks |
| 4. `ensure-*` empty-id path | CONCERNS | Verified | Guards correct; body heredoc unquoted while prose claims otherwise (BUG-8) |
| 5. Sprint skills `reason` | PASS | Verified | Reads the `⏸️` line rather than the exit code, which is the correct signal |
| 6. Repo-wide guard | PASS | Verified | 3/3; mutation-proven both ways; found 2 real sites on first run |
| 7. Three coverage notices | PASS | Verified | All three agree; both-directions assertions preserved |
| 8. Tests, docs, bundle | PASS | Verified | 1564 pass, 115 skills validate, prettier clean, bundle committed |

**Overall Phase Completion**: 6/9 PASS, 2 CONCERNS, 1 FAIL

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --------- | ------ | ------ | ------ |
| All in-scope kinds route through the CLI | 28 sites, 0 bare | 0 bare (guard 3/3) | PASS |
| No placeholder key ever written | none | none, and the refusal is tested | PASS |
| Dependants render after prerequisites | always | topo-sorted + nested, asserted | PASS |
| Second run converges without duplicating | no duplicate | path intact in all 6 skills, **untested** | CONCERNS (BUG-9) |
| Blocking called out in checklist AND summary | both | both, with the convergence instruction | PASS |
| Guard fails on a bare verb, not on bundle output | both | mutation-proven both ways | PASS |
| Two-run convergence documented for consumers | yes | troubleshooting.md, symptom-phrased | PASS |
| `full` mode unchanged | byte-identical | issues exactly the prior `gh issue create` | PASS |
| Suites green, bundle committed | all | 1564/1564, 115/115, clean | PASS |

---

## Issues Found

### HIGH Severity (3)

**TASK-56-BUG-1 — finalise: unterminated heredoc disables the issue close**

- **Location**: `skills/finalise/SKILL.md:1156`
- **Observation**: the block is indented three spaces (it sits inside a numbered list), and the
  terminator was written as `   EOF` after a plain `<<EOF`. Bash does not accept an indented
  terminator for an unquoted heredoc.
- **Proof**: run of the exact shape emits
  `warning: here-document at line 2 delimited by end-of-file (wanted 'EOF')`, and the statement after
  the block never executes — it lands *inside the file* instead.
- **Impact**: the completion comment and `--kind close` are both swallowed into the comment body. The
  issue is neither commented nor closed, and `finalise` reports success. Introduced by this task: the
  previous code was a one-line `gh issue comment --body "…"`, for which the indentation was harmless.
- **Priority**: P0

**TASK-56-BUG-2 — review-task: the same defect drops the review comment**

- **Location**: `skills/review-task/SKILL.md:1728`
- **Impact**: the `tracker-comment.js` invocation becomes part of the body; the GitHub review comment
  is silently dropped. Same root cause, same introduction point.
- **Priority**: P0

**TASK-56-BUG-3 — create-issue: issue URL built from unassigned variables**

- **Location**: `skills/create-issue/SKILL.md:285`
- **Observation**: the rewrite replaced the URL `gh issue create` used to return with
  `issue_url="https://github.com/${OWNER}/${REPO_NAME}/issues/${issue_number}"`. Neither variable is
  assigned anywhere in this skill — confirmed by grep across the whole file.
- **Impact**: the URL written into the local issue document becomes `https://github.com///issues/207`.
  The number is right, so nothing downstream fails loudly; the link is simply dead.
- **Priority**: P0

### MEDIUM Severity (6)

**TASK-56-BUG-4** — `$OWNER/$REPO` leaks literally into deferred records. Under a deferring mode
`slug` comes from `--repo` only, and no call site passes it. `handover-render.js` single-quotes every
argv element, so the generated script sends `$OWNER/$REPO` verbatim to `gh api`. The `sh` renderer
exists to be runnable; this makes every deferred milestone and sub-issue record unrunnable. Found
independently by QA and by the code review.

**TASK-56-BUG-5** — the milestone resolve interpolates the raw title into a jq program and queries
`/milestones` unpaginated. A title containing `"` is a jq syntax error; >30 open milestones, or a
closed one, silently misses and the blind POST then 422s.

**TASK-56-BUG-6** — the three `sync-github-*` blocks redirect into `.claude/state/` with no
`mkdir -p`, unlike all five other new call sites. On a fresh clone the redirect fails, the CLI exits 2
on an unreadable `--body-file`, and the entire title/body/milestone/label edit is lost.

**TASK-56-BUG-7** — `--reason not_planned` is passed where `gh` accepts only
`completed | not planned | duplicate`, and the CLI does not validate it. Cancelled work items never
close. Pre-existing, but this task moved the call onto the CLI's path and should not carry the defect
forward silently.

**TASK-56-BUG-8** — the `ensure-*` body files are written with an **unquoted** `<<EOF`, which still
performs command substitution, while the adjacent prose claims the `--body-file` form removes the
injection surface. The overclaim is the finding: a reader trusts the sentence and stops thinking about
it.

**TASK-56-BUG-9** — nothing tests the two-run convergence, which the task's own Testing Strategy lists
as a case. All six skills currently retain the key-present short-circuit (verified), but an unguarded
invariant is one refactor from silently becoming "creates a duplicate every run".

### LOW Severity (2)

**TASK-56-BUG-10** — a vacuous test. `§2 the ⏸️ notice goes to stderr` asserts only that stdout is
empty, duplicating the preceding test; it would pass if `info()` were deleted and the operator got no
deferral notice at all.

**TASK-56-BUG-11** — `--dry-run` bypasses the deferral branch, so under a restricted mode the slug is
still resolved via `gh repo view` — an actual network call, contradicting the header's claim that a
gated run makes none.

**Total**: HIGH 3, MEDIUM 6, LOW 2

---

## NFR Assessment

### Performance — PASS

No hot path. One `gh repo view` per invocation under `full`, negligible against the mutation it
precedes.

### Reliability — FAIL

Four of the eleven findings fail **silently**: two heredocs, the missing `mkdir`, and the dead issue
URL all leave the run reporting success. That is the same class of invisible drift the 51–57 sequence
was built to remove, so it is judged strictly here.

### Security — CONCERNS

The access gate holds: no network call is reachable under a restricted mode on the non-dry-run path,
asserted with throwing transport stubs. Credential redaction is unchanged and still covered. The
concern is BUG-8 — not the residual substitution risk itself, which is modest, but the prose asserting
that risk has been removed when it has not.

### Maintainability — PASS

The CLI is unusually well-reasoned, and each non-obvious choice carries the reason it was made.
Replacing five hard-coded roster counts with derivations genuinely lowers the cost of the next kind
addition. Four minor cleanups noted (unused `spec` and `args` parameters, a duplicated expression, and
a credential block now copied verbatim in four CLIs).

---

## Code Review

Advisory findings promoted to the gate under `code_review_blocking=true` (bugs at
`confidence: high`): BUG-1 … BUG-8, BUG-10, BUG-11.

**Cleanups (4)** — advisory, not gating:

- `shared/resources/tracker-issue.js:441` — `recordShape` destructures `spec` but never uses it; every
  caller passes it needlessly.
- `shared/resources/tracker-issue.js:605` — `repoFlag(args, slug)` ignores `args`.
- `shared/resources/tracker-issue.js:745` — the milestone `already` branch computes
  `existing.split("\n")[0].trim()` twice.
- `shared/resources/tracker-issue.js:250` — `CREDENTIAL_FILES` / `loadDotEnv` / `repoRootOf` /
  `GIT_EXEC_OPTS` are now a **fourth** verbatim copy across the shared CLIs. Only the output helper has
  a documented reason for being duplicated.

---

## Test Artifacts

```bash
npm test                    # 1564 passed, 0 failed
npm run validate:all        # 115 passed, 0 failed
npx prettier --check .      # clean
node --test tests/mutation-call-site-coverage.test.js   # 3/3
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: three high-severity defects, each of which silently disables a tracker call. The
sequence's whole purpose is that a tracker mutation is never silently lost, so shipping a change that
loses three of them would be self-defeating regardless of how well the CLI beneath them works.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Condition**: all three HIGH defects fixed and re-reviewed.

**Next Steps**: `/qa-fix` — fix the three HIGH, then the six MEDIUM, then the two LOW; re-run the full
suite and re-review.
